import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { MenuItem, Category } from '../types'
import { formatVND } from '../types'

export function MenuView() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')

  useEffect(() => {
    const fetchData = async () => {
      const [catRes, itemRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('menu_items').select('*, category:categories(*)').eq('is_active', true).order('name'),
      ])
      if (catRes.data) setCategories(catRes.data as Category[])
      if (itemRes.data) setItems(itemRes.data as MenuItem[])
      setLoading(false)
    }
    fetchData()
  }, [])

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCat === 'all' || item.category_id === activeCat
    return matchSearch && matchCat
  })

  if (loading) {
    return <div className="empty-state"><div className="empty-state-text">Đang tải menu...</div></div>
  }

  return (
    <div className="fade-in">
      <input
        className="menu-search"
        type="text"
        placeholder="🔍 Tìm món..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="category-tabs">
        <button
          className={`category-tab ${activeCat === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCat('all')}
        >
          Tất cả
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${activeCat === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCat(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍵</div>
          <div className="empty-state-text">Không tìm thấy món nào</div>
        </div>
      ) : (
        <div className="menu-list">
          {filtered.map((item) => (
            <div key={item.id} className="menu-item">
              <div className="menu-item-info">
                <div className="menu-item-name">{item.name}</div>
                <div className="menu-item-price">{formatVND(item.price)}</div>
                {item.category && (
                  <div className="menu-item-cat">{item.category.name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
