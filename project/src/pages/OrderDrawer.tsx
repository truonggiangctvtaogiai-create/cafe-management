import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { TableItem, Order, OrderItem, MenuItem, Category, Member } from '../types'
import { formatVND, formatTime, memberTier, tierColor } from '../types'

export function OrderDrawer({
  table,
  existingOrder,
  staffName,
  onClose,
  onPaid,
  onToast,
}: {
  table: TableItem
  existingOrder: Order | null
  staffName: string
  onClose: () => void
  onPaid: () => void
  onToast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<Record<string, OrderItem>>({})
  const [order, setOrder] = useState<Order | null>(existingOrder)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')
  const [view, setView] = useState<'menu' | 'cart' | 'payment'>('menu')
  const [now, setNow] = useState(Date.now())
  const [discountVal, setDiscountVal] = useState('0')
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [memberPhone, setMemberPhone] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchMenu = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('*, category:categories(*)').eq('is_active', true).eq('type', 'drink').order('name'),
    ])
    if (catRes.data) setCategories(catRes.data as Category[])
    if (itemRes.data) setMenuItems(itemRes.data as MenuItem[])
  }, [])

  const loadExistingItems = useCallback(async () => {
    if (existingOrder) {
      const { data } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', existingOrder.id)
      if (data) {
        const map: Record<string, OrderItem> = {}
        for (const item of data as OrderItem[]) {
          if (item.menu_item_id) map[item.menu_item_id] = item
        }
        setCart(map)
      }
    }
  }, [existingOrder])

  useEffect(() => {
    fetchMenu()
    loadExistingItems()
  }, [fetchMenu, loadExistingItems])

  // Ensure order exists when table is occupied
  const ensureOrder = useCallback(async (): Promise<Order | null> => {
    if (order) return order
    const { data: currentShift } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .maybeSingle()
    const newOrder = {
      table_id: table.id,
      table_name: table.name,
      table_type: table.type,
      shift_id: currentShift?.id || null,
      staff_name: staffName,
      status: 'open' as const,
      time_started: table.type === 'billiard' ? new Date().toISOString() : null,
      hourly_rate: table.hourly_rate,
    }
    const { data, error } = await supabase.from('orders').insert(newOrder).select().single()
    if (error) { onToast('Lỗi tạo đơn: ' + error.message, 'error'); return null }
    const created = data as Order
    setOrder(created)
    await supabase.from('tables').update({ status: 'occupied' }).eq('id', table.id)
    return created
  }, [order, table, staffName, onToast])

  const addToCart = async (item: MenuItem) => {
    const currentOrder = await ensureOrder()
    if (!currentOrder) return
    const existing = cart[item.id]
    if (existing) {
      const { error } = await supabase
        .from('order_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id)
      if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
      setCart({ ...cart, [item.id]: { ...existing, quantity: existing.quantity + 1 } })
    } else {
      const { data, error } = await supabase
        .from('order_items')
        .insert({
          order_id: currentOrder.id,
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        })
        .select()
        .single()
      if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
      setCart({ ...cart, [item.id]: data as OrderItem })
    }
  }

  const updateQty = async (item: OrderItem, delta: number) => {
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      await supabase.from('order_items').delete().eq('id', item.id)
      const newCart = { ...cart }
      delete newCart[item.menu_item_id || '']
      setCart(newCart)
    } else {
      await supabase.from('order_items').update({ quantity: newQty }).eq('id', item.id)
      setCart({ ...cart, [item.menu_item_id || '']: { ...item, quantity: newQty } })
    }
  }

  const filteredMenu = menuItems.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCat === 'all' || item.category_id === activeCat
    return matchSearch && matchCat
  })

  const cartItems = Object.values(cart)
  const itemsTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  let elapsed = 0
  if (order?.time_started && table.type === 'billiard') {
    elapsed = Math.floor((now - new Date(order.time_started).getTime()) / 1000)
  }
  const timeTotal = table.type === 'billiard' ? Math.round((elapsed / 3600) * table.hourly_rate) : 0
  const subtotal = itemsTotal + timeTotal

  let discountAmount = 0
  if (discountType === 'percent') {
    discountAmount = Math.round(subtotal * (parseInt(discountVal) || 0) / 100)
  } else {
    discountAmount = parseInt(discountVal) || 0
  }
  const finalTotal = Math.max(0, subtotal - discountAmount)
  const pointsEarned = Math.floor(finalTotal / 10000)

  const lookupMember = async () => {
    if (!memberPhone.trim()) return
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('phone', memberPhone.trim())
      .maybeSingle()
    if (data) {
      setMember(data as Member)
      onToast(`Thành viên ${data.name || data.phone} · ${memberTier(data.total_spent)}`)
    } else {
      const { data: newMember } = await supabase
        .from('members')
        .insert({ phone: memberPhone.trim(), name: '' })
        .select()
        .single()
      if (newMember) {
        setMember(newMember as Member)
        onToast('Đăng ký thành viên mới')
      }
    }
  }

  const handlePayment = async () => {
    if (!order) return
    setPaying(true)
    try {
      const closedAt = new Date().toISOString()
      const { error: orderError } = await supabase.from('orders').update({
        status: 'paid',
        items_total: itemsTotal,
        time_total: timeTotal,
        time_ended: table.type === 'billiard' ? closedAt : null,
        discount: discountAmount,
        discount_type: discountType,
        final_total: finalTotal,
        payment_method: paymentMethod,
        points_earned: pointsEarned,
        closed_at: closedAt,
        member_id: member?.id || null,
      }).eq('id', order.id)

      if (orderError) { onToast('Lỗi: ' + orderError.message, 'error'); setPaying(false); return }

      await supabase.from('tables').update({ status: 'available' }).eq('id', table.id)

      if (member) {
        await supabase.from('members').update({
          points: member.points + pointsEarned,
          total_spent: member.total_spent + finalTotal,
        }).eq('id', member.id)
      }

      onPaid()
    } catch (err) {
      onToast('Lỗi thanh toán', 'error')
      setPaying(false)
    }
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div className="drawer-title">
            {table.type === 'billiard' ? '🎱' : '🪑'} {table.name}
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {view === 'menu' && (
            <>
              {table.type === 'billiard' && order?.time_started && (
                <div className="card" style={{ background: 'rgba(229,169,60,0.08)', borderColor: 'rgba(229,169,60,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>⏱ Thời gian</div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(elapsed)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tiền giờ</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gold)' }}>{formatVND(timeTotal)}</div>
                    </div>
                  </div>
                </div>
              )}

              <input
                className="menu-search"
                type="text"
                placeholder="🔍 Tìm món..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="category-tabs">
                <button className={`category-tab ${activeCat === 'all' ? 'active' : ''}`} onClick={() => setActiveCat('all')}>Tất cả</button>
                {categories.map((cat) => (
                  <button key={cat.id} className={`category-tab ${activeCat === cat.id ? 'active' : ''}`} onClick={() => setActiveCat(cat.id)}>
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="menu-list">
                {filteredMenu.map((item) => (
                  <div key={item.id} className="menu-item">
                    <div className="menu-item-info">
                      <div className="menu-item-name">{item.name}</div>
                      <div className="menu-item-price">{formatVND(item.price)}</div>
                    </div>
                    <button className="menu-item-add" onClick={() => addToCart(item)}>+</button>
                  </div>
                ))}
              </div>

              {cartItems.length > 0 && (
                <button className="btn btn-gold btn-full" style={{ marginTop: '16px' }} onClick={() => setView('cart')}>
                  🛒 Giỏ hàng ({cartItems.reduce((s, i) => s + i.quantity, 0)}) · {formatVND(itemsTotal)}
                </button>
              )}
            </>
          )}

          {view === 'cart' && (
            <>
              <div className="section-title">Giỏ hàng</div>
              {cartItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🛒</div>
                  <div className="empty-state-text">Chưa có món nào. Bấm + để thêm món.</div>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="menu-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">{formatVND(item.price)}</div>
                    </div>
                    <div className="cart-qty">
                      <button className="cart-qty-btn" onClick={() => updateQty(item, -1)}>−</button>
                      <span className="cart-qty-val">{item.quantity}</span>
                      <button className="cart-qty-btn" onClick={() => updateQty(item, 1)}>+</button>
                    </div>
                    <div className="cart-item-total">{formatVND(item.price * item.quantity)}</div>
                  </div>
                ))
              )}

              <div className="pay-section" style={{ marginTop: '16px' }}>
                <div className="pay-row"><span>Tiền nước</span><span className="pay-value">{formatVND(itemsTotal)}</span></div>
                {timeTotal > 0 && <div className="pay-row"><span>Tiền giờ</span><span className="pay-value">{formatVND(timeTotal)}</span></div>}
                <div className="pay-row total"><span>Tạm tính</span><span className="pay-value">{formatVND(subtotal)}</span></div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView('menu')}>← Thêm món</button>
                <button className="btn btn-gold" style={{ flex: 1 }} onClick={() => setView('payment')} disabled={cartItems.length === 0}>
                  Thanh toán →
                </button>
              </div>
            </>
          )}

          {view === 'payment' && (
            <>
              <div className="section-title">Thanh toán</div>

              <div className="pay-section">
                <div className="pay-row"><span>Tiền nước</span><span className="pay-value">{formatVND(itemsTotal)}</span></div>
                {timeTotal > 0 && <div className="pay-row"><span>Tiền giờ ({formatTime(elapsed)})</span><span className="pay-value">{formatVND(timeTotal)}</span></div>}
                <div className="pay-row"><span>Tạm tính</span><span className="pay-value">{formatVND(subtotal)}</span></div>
              </div>

              <div className="pay-section">
                <label className="pay-label">Giảm giá</label>
                <div className="discount-row">
                  <button className={`discount-type-btn ${discountType === 'amount' ? 'active' : ''}`} onClick={() => setDiscountType('amount')}>VNĐ</button>
                  <button className={`discount-type-btn ${discountType === 'percent' ? 'active' : ''}`} onClick={() => setDiscountType('percent')}>%</button>
                  <input className="pay-input" type="number" value={discountVal} onChange={(e) => setDiscountVal(e.target.value)} />
                </div>
                {discountAmount > 0 && (
                  <div className="pay-row" style={{ marginTop: '8px' }}><span>Giảm giá</span><span className="pay-value" style={{ color: 'var(--danger)' }}>-{formatVND(discountAmount)}</span></div>
                )}
              </div>

              <div className="pay-section">
                <label className="pay-label">Thành viên (SĐT)</label>
                <div className="discount-row">
                  <input className="pay-input" value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} placeholder="Nhập SĐT" />
                  <button className="btn btn-ghost btn-sm" onClick={lookupMember}>Áp dụng</button>
                </div>
                {member && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="member-badge" style={{ background: `${tierColor(memberTier(member.total_spent))}22`, color: tierColor(memberTier(member.total_spent)) }}>
                      {memberTier(member.total_spent)}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {member.name || member.phone} · {member.points} điểm
                    </span>
                  </div>
                )}
              </div>

              <div className="pay-section">
                <label className="pay-label">Phương thức thanh toán</label>
                <div className="pay-methods">
                  <button className={`pay-method ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => setPaymentMethod('cash')}>
                    <span className="pay-method-icon">💵</span>Tiền mặt
                  </button>
                  <button className={`pay-method ${paymentMethod === 'transfer' ? 'active' : ''}`} onClick={() => setPaymentMethod('transfer')}>
                    <span className="pay-method-icon">📱</span>Chuyển khoản
                  </button>
                  <button className={`pay-method ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => setPaymentMethod('card')}>
                    <span className="pay-method-icon">💳</span>Thẻ
                  </button>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--bg-elevated)' }}>
                <div className="pay-row total">
                  <span>Tổng cộng</span>
                  <span className="pay-value" style={{ fontSize: '24px' }}>{formatVND(finalTotal)}</span>
                </div>
                {pointsEarned > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>
                    Tích {pointsEarned} điểm
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setView('cart')}>← Quay lại</button>
                <button className="btn btn-gold" style={{ flex: 2 }} onClick={handlePayment} disabled={paying}>
                  {paying ? 'Đang xử lý...' : `Xác nhận thanh toán`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
