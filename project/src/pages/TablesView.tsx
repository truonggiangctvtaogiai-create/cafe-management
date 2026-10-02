import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useOpenOrders } from '../hooks'
import type { TableItem, Order } from '../types'
import { formatTime } from '../types'

export function TablesView({
  openOrders,
  onTableClick,
}: {
  openOrders: Record<string, Order>
  onTableClick: (table: TableItem) => void
}) {
  const [tables, setTables] = useState<TableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchTables = async () => {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .order('sort_order')
      if (data) setTables(data as TableItem[])
      setLoading(false)
    }
    fetchTables()
    const channel = supabase
      .channel('tables-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchTables())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return <div className="empty-state"><div className="empty-state-text">Đang tải danh sách bàn...</div></div>
  }

  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const availableCount = tables.filter((t) => t.status === 'available').length

  return (
    <div className="fade-in">
      <div className="stat-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-card">
          <span className="stat-icon">🟢</span>
          <span className="stat-label">Bàn trống</span>
          <span className="stat-value success">{availableCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🟡</span>
          <span className="stat-label">Đang sử dụng</span>
          <span className="stat-value gold">{occupiedCount}</span>
        </div>
      </div>

      <div className="tables-grid">
        {tables.map((table) => {
          const order = openOrders[table.id]
          const isOccupied = table.status === 'occupied'
          let elapsed = 0
          if (isOccupied && order?.time_started) {
            elapsed = Math.floor((now - new Date(order.time_started).getTime()) / 1000)
          }
          return (
            <div
              key={table.id}
              className={`table-card ${table.status} ${table.type === 'billiard' ? 'billiard' : ''}`}
              onClick={() => onTableClick(table)}
            >
              <div className="table-icon">
                {table.type === 'billiard' ? '🎱' : '🪑'}
              </div>
              <div className="table-name">{table.name}</div>
              <span className={`table-status ${table.status}`}>
                {isOccupied ? 'Đang dùng' : 'Trống'}
              </span>
              {isOccupied && table.type === 'billiard' && order?.time_started && (
                <div className="table-timer">
                  {formatTime(elapsed)}
                  <div className="table-timer-label">
                    {Math.round((elapsed / 3600) * table.hourly_rate).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
