import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import type { TableItem, Order } from './types'

export function useOpenOrders() {
  const [openOrders, setOpenOrders] = useState<Record<string, Order>>({})
  const [loading, setLoading] = useState(true)

  const fetchOpenOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'open')
    const map: Record<string, Order> = {}
    if (data) {
      for (const o of data as Order[]) {
        if (o.table_id) map[o.table_id] = o
      }
    }
    setOpenOrders(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOpenOrders()
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOpenOrders()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOpenOrders])

  return { openOrders, loading, refresh: fetchOpenOrders }
}
