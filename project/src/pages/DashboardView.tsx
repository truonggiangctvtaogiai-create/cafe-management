import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Order, TableItem, Shift } from '../types'
import { formatVND } from '../types'

export function DashboardView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<TableItem[]>([])
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [ordersRes, tablesRes, shiftRes] = await Promise.all([
      supabase.from('orders').select('*').gte('created_at', today.toISOString()).order('created_at', { ascending: false }),
      supabase.from('tables').select('*'),
      supabase.from('shifts').select('*').eq('status', 'open').order('opened_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (ordersRes.data) setOrders(ordersRes.data as Order[])
    if (tablesRes.data) setTables(tablesRes.data as TableItem[])
    if (shiftRes.data) setShift(shiftRes.data as Shift)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData])

  if (loading) {
    return <div className="empty-state"><div className="empty-state-text">Đang tải...</div></div>
  }

  const todayRevenue = orders.filter((o) => o.status === 'paid').reduce((sum, o) => sum + o.final_total, 0)
  const orderCount = orders.filter((o) => o.status === 'paid').length
  const openCount = orders.filter((o) => o.status === 'open').length
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length
  const totalTables = tables.length
  const avgOrder = orderCount > 0 ? todayRevenue / orderCount : 0

  const hour = new Date().getHours()
  let greeting = 'Chào buổi sáng'
  if (hour >= 12 && hour < 18) greeting = 'Chào buổi chiều'
  else if (hour >= 18) greeting = 'Chào buổi tối'

  return (
    <div className="fade-in">
      <div className="dashboard-hero">
        <div className="dashboard-hero-label">{greeting}! ☕</div>
        <div className="dashboard-hero-value">{formatVND(todayRevenue)}</div>
        <div className="dashboard-hero-sub">Doanh thu hôm nay · {orderCount} đơn đã thanh toán</div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon">🪑</span>
          <span className="stat-label">Bàn đang dùng</span>
          <span className="stat-value gold">{occupiedTables}/{totalTables}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🧾</span>
          <span className="stat-label">Đơn đang mở</span>
          <span className="stat-value info">{openCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <span className="stat-label">Trung bình/đơn</span>
          <span className="stat-value">{formatVND(avgOrder)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🕐</span>
          <span className="stat-label">Ca làm việc</span>
          <span className="stat-value success" style={{ fontSize: '14px' }}>
            {shift ? 'Đang mở' : 'Đóng'}
          </span>
        </div>
      </div>

      <div className="section-title">Đơn hàng gần đây</div>
      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <div className="empty-state-text">Chưa có đơn hàng nào hôm nay</div>
        </div>
      ) : (
        orders.slice(0, 5).map((order) => {
          const time = new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          return (
            <div key={order.id} className="order-card">
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
              <div className="order-total-row">
                <span className="order-total-amount">{formatVND(order.final_total)}</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
