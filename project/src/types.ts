export interface Profile {
  id: string
  username: string
  role: 'admin' | 'staff'
  display_name: string
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface MenuItem {
  id: string
  category_id: string | null
  name: string
  price: number
  type: 'drink' | 'billiard'
  is_active: boolean
  category?: Category
}

export interface TableItem {
  id: string
  name: string
  type: 'normal' | 'billiard'
  status: 'available' | 'occupied'
  hourly_rate: number
  sort_order: number
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string | null
  name: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  table_id: string | null
  table_name: string
  table_type: 'normal' | 'billiard'
  shift_id: string | null
  member_id: string | null
  staff_name: string
  status: 'open' | 'paid'
  items_total: number
  time_total: number
  time_started: string | null
  time_ended: string | null
  hourly_rate: number
  discount: number
  discount_type: 'amount' | 'percent'
  final_total: number
  payment_method: 'cash' | 'transfer' | 'card'
  points_earned: number
  created_at: string
  closed_at: string | null
  order_items?: OrderItem[]
}

export interface Member {
  id: string
  phone: string
  name: string
  points: number
  total_spent: number
  created_at: string
}

export interface Shift {
  id: string
  opened_by: string
  opened_at: string
  closed_by: string | null
  closed_at: string | null
  opening_cash: number
  closing_cash: number
  total_revenue: number
  status: 'open' | 'closed'
}

export function memberTier(totalSpent: number): string {
  if (totalSpent >= 5000000) return 'Kim Cương'
  if (totalSpent >= 2000000) return 'Vàng'
  if (totalSpent >= 500000) return 'Bạc'
  return 'Đồng'
}

export function tierColor(tier: string): string {
  switch (tier) {
    case 'Kim Cương': return '#60a5fa'
    case 'Vàng': return '#e5a93c'
    case 'Bạc': return '#9ca3af'
    default: return '#cd7f32'
  }
}

export function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}
