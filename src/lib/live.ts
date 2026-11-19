import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
// Fetch authoritative rows, then refetch on realtime changes (spec §13).
export function useLive<T = any>(table: string, householdId: string, order?: string) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const id = useRef(Math.random().toString(36).slice(2))
  const load = useCallback(async () => {
    let q = supabase!.from(table).select('*').eq('household_id', householdId)
    if (order) q = q.order(order, { ascending: false })
    const { data } = await q
    setRows((data as T[]) ?? [])
    setLoading(false)
  }, [table, householdId, order])
  useEffect(() => {
    load()
    const ch = supabase!.channel(`${table}:${id.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `household_id=eq.${householdId}` }, () => load())
      .subscribe()
    return () => { supabase!.removeChannel(ch) }
  }, [load, table, householdId])
  return { rows, loading, reload: load }
}
