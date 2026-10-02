import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { MenuItem, Category, TableItem, Profile, Shift, Order } from '../types'
import { formatVND } from '../types'

type AdminTab = 'menu' | 'tables' | 'staff' | 'shifts'

export function AdminView({ onToast }: { onToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [tab, setTab] = useState<AdminTab>('menu')

  return (
    <div className="fade-in">
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>📋 Menu</button>
        <button className={`admin-tab ${tab === 'tables' ? 'active' : ''}`} onClick={() => setTab('tables')}>🪑 Bàn</button>
        <button className={`admin-tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>👤 Nhân viên</button>
        <button className={`admin-tab ${tab === 'shifts' ? 'active' : ''}`} onClick={() => setTab('shifts')}>🕐 Ca</button>
      </div>
      {tab === 'menu' && <MenuAdmin onToast={onToast} />}
      {tab === 'tables' && <TablesAdmin onToast={onToast} />}
      {tab === 'staff' && <StaffAdmin onToast={onToast} />}
      {tab === 'shifts' && <ShiftsAdmin onToast={onToast} />}
    </div>
  )
}

// ===== Menu Admin =====
function MenuAdmin({ onToast }: { onToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetch = useCallback(async () => {
    const [itemRes, catRes] = await Promise.all([
      supabase.from('menu_items').select('*, category:categories(*)').order('name'),
      supabase.from('categories').select('*').order('sort_order'),
    ])
    if (itemRes.data) setItems(itemRes.data as MenuItem[])
    if (catRes.data) setCategories(catRes.data as Category[])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleSave = async (data: Partial<MenuItem>) => {
    if (editing) {
      const { error } = await supabase.from('menu_items').update(data).eq('id', editing.id)
      if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
      onToast('Đã cập nhật món')
    } else {
      const { error } = await supabase.from('menu_items').insert(data)
      if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
      onToast('Đã thêm món mới')
    }
    setShowModal(false)
    setEditing(null)
    fetch()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
    onToast('Đã xóa món')
    fetch()
  }

  const toggleActive = async (item: MenuItem) => {
    await supabase.from('menu_items').update({ is_active: !item.is_active }).eq('id', item.id)
    fetch()
  }

  return (
    <div>
      <button className="btn btn-gold btn-full" style={{ marginBottom: '12px' }} onClick={() => { setEditing(null); setShowModal(true) }}>
        + Thêm món
      </button>
      {items.map((item) => (
        <div key={item.id} className="admin-list-item">
          <div className="admin-item-info">
            <div className="admin-item-name">{item.name} {!item.is_active && '🔴'}</div>
            <div className="admin-item-sub">{formatVND(item.price)} · {item.category?.name || 'Không nhóm'}</div>
          </div>
          <div className="admin-item-actions">
            <button className="icon-btn" onClick={() => toggleActive(item)}>{item.is_active ? '👁' : '🚫'}</button>
            <button className="icon-btn" onClick={() => { setEditing(item); setShowModal(true) }}>✏️</button>
            <button className="icon-btn danger" onClick={() => handleDelete(item.id)}>🗑</button>
          </div>
        </div>
      ))}
      {showModal && (
        <MenuItemModal
          item={editing}
          categories={categories}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function MenuItemModal({ item, categories, onSave, onClose }: {
  item: MenuItem | null
  categories: Category[]
  onSave: (data: Partial<MenuItem>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(item?.name || '')
  const [price, setPrice] = useState(item?.price.toString() || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || categories[0]?.id || '')
  const [type, setType] = useState<'drink' | 'billiard'>(item?.type || 'drink')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{item ? 'Sửa món' : 'Thêm món mới'}</div>
        <div className="modal-field">
          <label className="modal-label">Tên món</label>
          <input className="modal-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="modal-field">
          <label className="modal-label">Giá (VNĐ)</label>
          <input className="modal-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="modal-field">
          <label className="modal-label">Nhóm</label>
          <select className="modal-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="modal-field">
          <label className="modal-label">Loại</label>
          <select className="modal-input" value={type} onChange={(e) => setType(e.target.value as 'drink' | 'billiard')}>
            <option value="drink">Thức uống</option>
            <option value="billiard">Billiard</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-gold" onClick={() => onSave({ name, price: parseInt(price) || 0, category_id: categoryId, type })}>Lưu</button>
        </div>
      </div>
    </div>
  )
}

// ===== Tables Admin =====
function TablesAdmin({ onToast }: { onToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [tables, setTables] = useState<TableItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TableItem | null>(null)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('tables').select('*').order('sort_order')
    if (data) setTables(data as TableItem[])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleSave = async (data: Partial<TableItem>) => {
    if (editing) {
      const { error } = await supabase.from('tables').update(data).eq('id', editing.id)
      if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
      onToast('Đã cập nhật bàn')
    } else {
      const { error } = await supabase.from('tables').insert(data)
      if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
      onToast('Đã thêm bàn mới')
    }
    setShowModal(false)
    setEditing(null)
    fetch()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('tables').delete().eq('id', id)
    if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
    onToast('Đã xóa bàn')
    fetch()
  }

  return (
    <div>
      <button className="btn btn-gold btn-full" style={{ marginBottom: '12px' }} onClick={() => { setEditing(null); setShowModal(true) }}>
        + Thêm bàn
      </button>
      {tables.map((table) => (
        <div key={table.id} className="admin-list-item">
          <div className="admin-item-info">
            <div className="admin-item-name">{table.type === 'billiard' ? '🎱' : '🪑'} {table.name}</div>
            <div className="admin-item-sub">
              {table.type === 'billiard' ? `Billiard · ${formatVND(table.hourly_rate)}/h` : 'Bàn thường'} · {table.status === 'available' ? 'Trống' : 'Đang dùng'}
            </div>
          </div>
          <div className="admin-item-actions">
            <button className="icon-btn" onClick={() => { setEditing(table); setShowModal(true) }}>✏️</button>
            <button className="icon-btn danger" onClick={() => handleDelete(table.id)}>🗑</button>
          </div>
        </div>
      ))}
      {showModal && (
        <TableModal item={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null) }} />
      )}
    </div>
  )
}

function TableModal({ item, onSave, onClose }: {
  item: TableItem | null
  onSave: (data: Partial<TableItem>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(item?.name || '')
  const [type, setType] = useState<'normal' | 'billiard'>(item?.type || 'normal')
  const [hourlyRate, setHourlyRate] = useState(item?.hourly_rate.toString() || '0')
  const [sortOrder, setSortOrder] = useState(item?.sort_order.toString() || '0')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{item ? 'Sửa bàn' : 'Thêm bàn mới'}</div>
        <div className="modal-field">
          <label className="modal-label">Tên bàn</label>
          <input className="modal-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="modal-field">
          <label className="modal-label">Loại</label>
          <select className="modal-input" value={type} onChange={(e) => setType(e.target.value as 'normal' | 'billiard')}>
            <option value="normal">Bàn thường</option>
            <option value="billiard">Billiard</option>
          </select>
        </div>
        {type === 'billiard' && (
          <div className="modal-field">
            <label className="modal-label">Đơn giá/giờ (VNĐ)</label>
            <input className="modal-input" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
          </div>
        )}
        <div className="modal-field">
          <label className="modal-label">Thứ tự hiển thị</label>
          <input className="modal-input" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-gold" onClick={() => onSave({ name, type, hourly_rate: parseInt(hourlyRate) || 0, sort_order: parseInt(sortOrder) || 0 })}>Lưu</button>
        </div>
      </div>
    </div>
  )
}

// ===== Staff Admin =====
function StaffAdmin({ onToast }: { onToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [staff, setStaff] = useState<Profile[]>([])

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setStaff(data as Profile[])
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const toggleRole = async (p: Profile) => {
    const newRole = p.role === 'admin' ? 'staff' : 'admin'
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', p.id)
    if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
    onToast(`Đã đổi ${p.display_name} thành ${newRole === 'admin' ? 'Quản trị viên' : 'Nhân viên'}`)
    fetch()
  }

  const toggleActive = async (p: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_active: !p.is_active }).eq('id', p.id)
    if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
    onToast(p.is_active ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản')
    fetch()
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
        💡 Tài khoản nhân viên được tạo từ trang đăng ký. Bạn có thể đổi quyền hoặc khóa tài khoản tại đây.
      </div>
      {staff.map((p) => (
        <div key={p.id} className="admin-list-item">
          <div className="admin-item-info">
            <div className="admin-item-name">
              {p.display_name} {!p.is_active && '🔒'}
            </div>
            <div className="admin-item-sub">
              @{p.username} · {p.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
            </div>
          </div>
          <div className="admin-item-actions">
            <button className="icon-btn" onClick={() => toggleRole(p)} title="Đổi quyền">
              {p.role === 'admin' ? '👤' : '👑'}
            </button>
            <button className="icon-btn danger" onClick={() => toggleActive(p)} title="Khóa/Mở">
              {p.is_active ? '🔒' : '🔓'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== Shifts Admin =====
function ShiftsAdmin({ onToast }: { onToast: (msg: string, type?: 'success' | 'error') => void }) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [openShift, setOpenShift] = useState<Shift | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)

  const fetch = useCallback(async () => {
    const [shiftRes, openRes] = await Promise.all([
      supabase.from('shifts').select('*').order('opened_at', { ascending: false }).limit(20),
      supabase.from('shifts').select('*').eq('status', 'open').maybeSingle(),
    ])
    if (shiftRes.data) setShifts(shiftRes.data as Shift[])
    if (openRes.data) {
      setOpenShift(openRes.data as Shift)
      const { data: ordData } = await supabase
        .from('orders')
        .select('*')
        .eq('shift_id', openRes.data.id)
        .eq('status', 'paid')
      if (ordData) setOrders(ordData as Order[])
    } else {
      setOpenShift(null)
      setOrders([])
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleOpenShift = async (openingCash: number, staffName: string) => {
    const { error } = await supabase.from('shifts').insert({
      opened_by: staffName,
      opening_cash: openingCash,
      status: 'open',
    })
    if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
    onToast('Đã mở ca mới')
    setShowOpenModal(false)
    fetch()
  }

  const handleCloseShift = async (closingCash: number, staffName: string) => {
    if (!openShift) return
    const totalRevenue = orders.reduce((sum, o) => sum + o.final_total, 0)
    const { error } = await supabase.from('shifts').update({
      closed_by: staffName,
      closed_at: new Date().toISOString(),
      closing_cash: closingCash,
      total_revenue: totalRevenue,
      status: 'closed',
    }).eq('id', openShift.id)
    if (error) { onToast('Lỗi: ' + error.message, 'error'); return }
    onToast('Đã đóng ca')
    setShowCloseModal(false)
    fetch()
  }

  const currentRevenue = orders.reduce((sum, o) => sum + o.final_total, 0)

  return (
    <div>
      {openShift ? (
        <div className="shift-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="shift-status-badge open"><span className="shift-dot"></span>Ca đang mở</span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {new Date(openShift.opened_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="pay-row"><span>Tiền đầu ca</span><span className="pay-value">{formatVND(openShift.opening_cash)}</span></div>
          <div className="pay-row"><span>Doanh thu hiện tại</span><span className="pay-value" style={{ color: 'var(--gold)' }}>{formatVND(currentRevenue)}</span></div>
          <div className="pay-row"><span>Số đơn đã thanh toán</span><span className="pay-value">{orders.length}</span></div>
          <button className="btn btn-danger btn-full" style={{ marginTop: '12px' }} onClick={() => setShowCloseModal(true)}>
            Đóng ca
          </button>
        </div>
      ) : (
        <button className="btn btn-gold btn-full" style={{ marginBottom: '12px' }} onClick={() => setShowOpenModal(true)}>
          Mở ca mới
        </button>
      )}

      <div className="section-title" style={{ marginTop: '20px' }}>Lịch sử ca</div>
      {shifts.map((s) => (
        <div key={s.id} className="shift-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className={`shift-status-badge ${s.status}`}>
              {s.status === 'open' ? <><span className="shift-dot"></span>Đang mở</> : 'Đã đóng'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {new Date(s.opened_at).toLocaleDateString('vi-VN')}
            </span>
          </div>
          <div className="pay-row"><span>Mở bởi</span><span className="pay-value">{s.opened_by}</span></div>
          {s.closed_by && <div className="pay-row"><span>Đóng bởi</span><span className="pay-value">{s.closed_by}</span></div>}
          <div className="pay-row"><span>Tiền đầu ca</span><span className="pay-value">{formatVND(s.opening_cash)}</span></div>
          {s.status === 'closed' && (
            <>
              <div className="pay-row"><span>Tiền cuối ca</span><span className="pay-value">{formatVND(s.closing_cash)}</span></div>
              <div className="pay-row total"><span>Tổng doanh thu</span><span className="pay-value">{formatVND(s.total_revenue)}</span></div>
            </>
          )}
        </div>
      ))}

      {showOpenModal && (
        <ShiftModal
          title="Mở ca mới"
          label="Tiền đầu ca (VNĐ)"
          onClose={() => setShowOpenModal(false)}
          onSave={handleOpenShift}
        />
      )}
      {showCloseModal && (
        <ShiftModal
          title="Đóng ca"
          label="Tiền cuối ca (VNĐ)"
          extraInfo={`Doanh thu: ${formatVND(currentRevenue)}`}
          onClose={() => setShowCloseModal(false)}
          onSave={handleCloseShift}
        />
      )}
    </div>
  )
}

function ShiftModal({ title, label, extraInfo, onClose, onSave }: {
  title: string
  label: string
  extraInfo?: string
  onClose: () => void
  onSave: (cash: number, staffName: string) => void
}) {
  const [cash, setCash] = useState('0')
  const [staffName, setStaffName] = useState('')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-field">
          <label className="modal-label">Tên nhân viên</label>
          <input className="modal-input" value={staffName} onChange={(e) => setStaffName(e.target.value)} autoFocus />
        </div>
        <div className="modal-field">
          <label className="modal-label">{label}</label>
          <input className="modal-input" type="number" value={cash} onChange={(e) => setCash(e.target.value)} />
        </div>
        {extraInfo && <div style={{ fontSize: '14px', color: 'var(--gold)', marginBottom: '12px' }}>{extraInfo}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-gold" onClick={() => onSave(parseInt(cash) || 0, staffName || 'NV')}>Xác nhận</button>
        </div>
      </div>
    </div>
  )
}
