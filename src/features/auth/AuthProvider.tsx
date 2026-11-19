import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { setTheme, type Theme } from '../../lib/theme'

type Profile = { id: string; display_name: string; theme: Theme }
type Ctx = { session: Session | null; loading: boolean; household: { id: string; name: string } | null; me: Profile | null; members: Profile[]; refresh: () => Promise<void> }
const C = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(C)

export function AuthProvider({ children }: { children: ReactNode }) {
  const sb = supabase!
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [household, setHousehold] = useState<Ctx['household']>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setLoading(false) })
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [sb])

  const refresh = useCallback(async () => {
    if (!session) { setHousehold(null); setMembers([]); setUid(null); setLoading(false); return }
    const [m, p] = await Promise.all([
      sb.from('household_members').select('households(id,name)').maybeSingle(),
      sb.from('profiles').select('id,display_name,theme').order('created_at'),
    ])
    const h = (m.data as any)?.households
    setHousehold(h ? { id: h.id, name: h.name } : null)
    setMembers((p.data as Profile[]) ?? [])
    setUid(session.user.id)
    const mine = (p.data as Profile[] | null)?.find(x => x.id === session.user.id)
    if (mine) setTheme(mine.theme)
    setLoading(false)
  }, [sb, session])

  useEffect(() => { refresh() }, [refresh])
  const me = members.find(x => x.id === uid) ?? null
  return <C.Provider value={{ session, loading, household, me, members, refresh }}>{children}</C.Provider>
}
