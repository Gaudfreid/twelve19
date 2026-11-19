import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { setTheme, getTheme, type Theme } from '../../lib/theme'
import { useAuth } from '../auth/AuthProvider'
import { Btn, Card, Title, fail, input } from '../../components/ui'

export default function Settings() {
  const { household, me, members, refresh } = useAuth()
  const [theme, setT] = useState<Theme>(getTheme()); const [email, setEmail] = useState(''); const [link, setLink] = useState('')
  async function pick(t: Theme) {
    setT(t); setTheme(t) // personal: saved to your own profile only
    if (me) fail((await supabase!.from('profiles').update({ theme: t }).eq('id', me.id)).error)
    refresh()
  }
  async function invite(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase!.rpc('create_household_invitation', { p_email: email })
    if (!fail(error)) setLink(`${location.origin}${location.pathname}#/invite/${data}`)
  }
  return <div className="flex flex-col gap-4"><Title>Settings</Title>
    <Card><h2 className="font-semibold">{household!.name}</h2><p className="text-sm text-muted">Members: {members.map(m => m.display_name || 'Unnamed').join(', ')}</p></Card>
    <Card><h2 className="mb-2 font-semibold">Appearance (just for you)</h2><div className="flex gap-2">
      {(['light', 'dark', 'system'] as Theme[]).map(t => <Btn key={t} variant={theme === t ? 'primary' : 'ghost'} onClick={() => pick(t)} className="capitalize">{t}</Btn>)}</div></Card>
    {members.length < 2 && <Card><h2 className="mb-2 font-semibold">Invite your partner</h2>
      <form onSubmit={invite} className="flex gap-2"><input className={input} type="email" required placeholder="Their email" value={email} onChange={e => setEmail(e.target.value)} /><Btn type="submit">Invite</Btn></form>
      {link && <p className="mt-2 break-all text-sm">Send this link (shown once, expires in 7 days): <b>{link}</b></p>}</Card>}
    <Btn variant="ghost" onClick={() => supabase!.auth.signOut()}>Sign out</Btn>
  </div>
}
