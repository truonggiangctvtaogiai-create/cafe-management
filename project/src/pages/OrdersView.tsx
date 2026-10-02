import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Order, OrderItem } from '../types'
import { formatVND } from '../types'

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [itemsMap, setItemsMap] = useState<Record<string, OrderItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all')

  const fetchOrders = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
    if (data) {
      const ordersData = data as Order[]
      setOrders(ordersData)
      const ids = ordersData.map((o) => o.id)
      if (ids.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', ids)
        if (itemsData) {
          const map: Record<string, OrderItem[]> = {}
          for (const item of itemsData as OrderItem[]) {
            if (!map[item.order_id]) map[item.order_id] = []
            map[item.order_id].push(item)
          }
          setItemsMap(map)
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('orders-view-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  const filtered = orders.filter((o) => filter === 'all' || o.status === filter)

  const totalRevenue = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.final_total, 0)

  if (loading) {
    return <div className="empty-state"><div className="empty-state-text">Đang tải đơn hàng...</div></div>
  }

  return (
    <div className="fade-in">
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="pay-row total">
          <span>Doanh thu hôm nay</span>
          <span className="pay-value">{formatVND(totalRevenue)}</span>
        </div>
      </div>

      <div className="category-tabs" style={{ marginBottom: '12px' }}>
        <button className={`category-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tất cả ({orders.length})</button>
        <button className={`category-tab ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Đang mở</button>
        <button className={`category-tab ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>Đã thanh toán</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <div className="empty-state-text">Chưa có đơn hàng nào hôm nay</div>
        </div>
      ) : (
        filtered.map((order) => {
          const items = itemsMap[order.id] || []
          const time = new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={order.id} className="order-card fade-in">
              <div className="order-card-header">
                <div>
                  <span className="order-table-name">
                    {order.table_type === 'billiard' ? '🎱' : '🪑'} {order.table_name}
                  </span>
                  <span className="order-time"> · {time}</span>
                </div>
                <span className={`order-status-badge ${order.status}`}>
                  {order.status === 'open' ? 'Đang mở' : 'Đã thanh toán'}
                </span>
              </div>
              {items.length > 0 && (
                <div className="order-items-list">
                  {items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
                </div>
              )}
              {order.time_total > 0 && (
                <div className="order-items-list">⏱ Tiền giờ: {formatVND(order.time_total)}</div>
              )}
              {order.discount > 0 && (
                <div className="order-items-list">💸 Giảm giá: -{formatVND(order.discount)}</div>
              )}
              <div className="order-total-row">
                <span className="order-total-amount">{formatVND(order.final_total)}</span>
                <span className="order-payment-method">
                  {order.payment_method === 'cash' ? '💵 Tiền mặt' : order.payment_method === 'transfer' ? '📱 Chuyển khoản' : '💳 Thẻ'}
                </span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
