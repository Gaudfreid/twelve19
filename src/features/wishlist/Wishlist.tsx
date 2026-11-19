import { useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { useAuth } from '../auth/AuthProvider'
import { Avatar, Btn, Card, fail, input, peso } from '../../components/ui'

export default function Wishlist() {
  const { household, session } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const { rows } = useLive<any>('wishlist_items', hh, 'created_at')
  const [tab, setTab] = useState<'wanted' | 'got'>('wanted'); const [show, setShow] = useState(false)
  const [f, setF] = useState({ name: '', price: '', url: '' })
  const shown = rows.filter(r => r.status === tab)
  async function add(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase!.from('wishlist_items').insert({ household_id: hh, name: f.name.trim(), estimated_price: f.price ? Number(f.price) : null, url: f.url || null, created_by: uid })
    if (!fail(error)) setF({ name: '', price: '', url: '' })
  }
  const set = async (id: string, status: string) => fail((await supabase!.from('wishlist_items').update({ status }).eq('id', id)).error)
  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Heart className="text-pink" /> Wishlist</h1><Btn onClick={() => setShow(s => !s)}>+ Add Wish</Btn></div>
    <div className="flex gap-2">{([['wanted', `Wanted (${rows.filter(r => r.status === 'wanted').length})`], ['got', 'Got it ♡']] as const).map(([k, v]) =>
      <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-5 py-2 text-sm ${tab === k ? 'border-pink/40 bg-pink/35 font-bold' : 'border-line bg-surface text-muted'}`}>{v}</button>)}</div>
    {show && <form onSubmit={add} className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-3">
      <input className={`${input} min-w-40 flex-1`} placeholder="Something we'd love…" required autoFocus value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input className={`${input} w-28`} type="number" min="0" step="0.01" placeholder="₱ approx" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} />
      <input className={`${input} w-48`} type="url" placeholder="Link (optional)" value={f.url} onChange={e => setF({ ...f, url: e.target.value })} /><Btn type="submit">Add</Btn></form>}
    <Card className="divide-y divide-line !p-0">{shown.length === 0 && <p className="p-4 text-sm text-muted">{tab === 'wanted' ? 'Add things you dream of for home.' : 'Nothing ticked off yet.'}</p>}
      {shown.map(r => <div key={r.id} className="flex items-center gap-3 px-4 py-3"><span className="text-xl">{tab === 'got' ? '🎁' : '✨'}</span>
        <div className="flex-1"><div className="font-semibold">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">{r.name}</a> : r.name}</div>
          {r.estimated_price != null && <div className="text-xs text-muted">≈ {peso(Number(r.estimated_price))}</div>}</div>
        <Avatar id={r.created_by} size="h-8 w-8" />
        <button className="text-xs font-semibold text-pink" onClick={() => set(r.id, tab === 'wanted' ? 'got' : 'wanted')}>{tab === 'wanted' ? 'Got it!' : 'Undo'}</button>
        <button className="text-xs text-muted" aria-label="Delete" onClick={async () => fail((await supabase!.from('wishlist_items').delete().eq('id', r.id)).error)}>✕</button></div>)}</Card>
  </div>
}
