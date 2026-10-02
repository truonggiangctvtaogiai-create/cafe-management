import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './auth'
import { useOpenOrders } from './hooks'
import type { TableItem, Order, OrderItem } from './types'
import { formatVND, formatTime, memberTier, tierColor } from './types'
import { TablesView } from './pages/TablesView'
import { MenuView } from './pages/MenuView'
import { OrdersView } from './pages/OrdersView'
import { DashboardView } from './pages/DashboardView'
import { AdminView } from './pages/AdminView'
import { OrderDrawer } from './pages/OrderDrawer'

type Tab = 'home' | 'tables' | 'menu' | 'orders' | 'admin'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Trang chủ', icon: '🏠' },
  { id: 'tables', label: 'Bàn', icon: '🪑' },
  { id: 'menu', label: 'Menu', icon: '🍵' },
  { id: 'orders', label: 'Đơn hàng', icon: '🧾' },
  { id: 'admin', label: 'Quản trị', icon: '⚙️' },
]

export function MainApp() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('home')
  const [drawerTable, setDrawerTable] = useState<TableItem | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const { openOrders, refresh } = useOpenOrders()

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const isAdmin = profile?.role === 'admin'

  const headerTitle = TABS.find((t) => t.id === tab)?.label || ''
  const headerIcon = TABS.find((t) => t.id === tab)?.icon || ''

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-title">
          <span>{headerIcon}</span>
          {headerTitle}
        </div>
        <div className="app-header-user">
          <span className={`app-header-role ${isAdmin ? '' : 'staff'}`}>
            {isAdmin ? 'Admin' : 'NV'}
          </span>
          <div className="app-header-avatar">
            {profile?.display_name?.charAt(0) || '?'}
          </div>
          <button className="icon-btn" onClick={() => signOut()} title="Đăng xuất" style={{ fontSize: '18px' }}>🚪</button>
        </div>
      </header>

      <main className="app-content">
        {tab === 'home' && <DashboardView />}
        {tab === 'tables' && (
          <TablesView
            openOrders={openOrders}
            onTableClick={(table) => setDrawerTable(table)}
          />
        )}
        {tab === 'menu' && <MenuView />}
        {tab === 'orders' && <OrdersView />}
        {tab === 'admin' && (
          isAdmin ? <AdminView onToast={showToast} /> : <div className="empty-state"><div className="empty-state-icon">🔒</div><div className="empty-state-text">Chỉ quản trị viên mới có quyền truy cập</div></div>
        )}
      </main>

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {drawerTable && (
        <OrderDrawer
          table={drawerTable}
          existingOrder={openOrders[drawerTable.id] || null}
          staffName={profile?.display_name || ''}
          onClose={() => setDrawerTable(null)}
          onPaid={() => {
            refresh()
            setDrawerTable(null)
            showToast('Thanh toán thành công!')
          }}
          onToast={showToast}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
