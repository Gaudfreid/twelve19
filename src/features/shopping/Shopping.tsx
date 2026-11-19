import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { useAuth } from '../auth/AuthProvider'
import { Avatar, Btn, Card, Tile, Title, emojiFor, fail, input, peso } from '../../components/ui'

export default function Shopping() {
  const { household, session, members } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const { rows: lists } = useLive<any>('shopping_lists', hh)
  const { rows: items } = useLive<any>('shopping_items', hh, 'created_at')
  const { rows: pantry } = useLive<any>('pantry_items', hh)
  const list = lists.find(l => l.status === 'active')
  const [tab, setTab] = useState<'buy' | 'bought'>('buy')
  const [name, setName] = useState(''); const [qty, setQty] = useState('1'); const [price, setPrice] = useState(''); const [link, setLink] = useState('')
  const [cart, setCart] = useState<Record<string, string>>({}) // item id -> actual price
  const [restock, setRestock] = useState(true)
  const shown = items.filter(i => (tab === 'buy' ? i.status === 'needed' : i.status === 'purchased'))
  const inCart = Object.keys(cart)
  const initial = (id: string) => (members.find(m => m.id === id)?.display_name || '?')[0].toUpperCase()

  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!list || !name.trim()) return
    const { error } = await supabase!.from('shopping_items').insert({
      household_id: hh, shopping_list_id: list.id, name: name.trim(), quantity: Number(qty) || 1,
      estimated_unit_price: price ? Number(price) : null, pantry_item_id: link || null, created_by: uid })
    if (!fail(error)) { setName(''); setQty('1'); setPrice(''); setLink('') }
  }
  const toggle = (i: any) => setCart(c => { const n = { ...c }; if (i.id in n) delete n[i.id]; else n[i.id] = i.estimated_unit_price ?? ''; return n })
  async function confirm() {
    const payload = inCart.map(id => {
      const it = items.find(x => x.id === id)
      return { id, actual_unit_price: cart[id] === '' ? null : Number(cart[id]), restock: restock && !!it?.pantry_item_id }
    })
    const { error } = await supabase!.rpc('record_shopping_purchase', { p_list: list.id, p_items: payload })
    if (!fail(error)) setCart({})
  }
  const total = inCart.reduce((s, id) => s + (Number(cart[id]) || 0) * Number(items.find(x => x.id === id)?.quantity ?? 1), 0)

  return <div className="flex flex-col gap-4"><Title>Shopping List</Title>
    <div className="flex gap-2">{(['buy', 'bought'] as const).map(t =>
      <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? 'bg-pink/30 font-semibold' : 'text-muted'}`}>{t === 'buy' ? 'To buy' : 'Bought'}</button>)}</div>
    {tab === 'buy' && <form onSubmit={add} className="flex flex-wrap gap-2">
      <input className={`${input} flex-1 min-w-40`} placeholder="Add item…" value={name} onChange={e => setName(e.target.value)} />
      <input className={`${input} w-16`} type="number" min="0.001" step="any" value={qty} onChange={e => setQty(e.target.value)} aria-label="Quantity" />
      <input className={`${input} w-24`} type="number" min="0" step="any" placeholder="₱ each" value={price} onChange={e => setPrice(e.target.value)} />
      <select className={`${input} w-40`} value={link} onChange={e => setLink(e.target.value)} aria-label="Link to pantry item">
        <option value="">No pantry link</option>{pantry.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <Btn type="submit">Add</Btn></form>}
    <Card className="flex flex-col divide-y divide-line !p-0">
      {shown.length === 0 && <p className="p-4 text-sm text-muted">{tab === 'buy' ? "Let's get what we need!" : 'Nothing bought yet.'}</p>}
      {shown.map(i => <div key={i.id} className="flex items-center gap-3 p-3">
        {tab === 'buy' && <input type="checkbox" className="h-5 w-5 accent-[var(--pink)]" checked={i.id in cart} onChange={() => toggle(i)} aria-label={`In cart: ${i.name}`} />}
        <Tile>{emojiFor(i.name)}</Tile>
        <div className="flex-1"><div className={i.id in cart ? 'line-through text-muted' : ''}>{i.name}</div>
          <div className="text-xs text-muted">{Number(i.quantity)}{i.unit ? ` ${i.unit}` : ''}{i.estimated_unit_price != null && ` · ${peso(Number(i.estimated_unit_price))}`}{i.pantry_item_id && ' · pantry-linked'}</div></div>
        {i.id in cart && <input className={`${input} w-24`} type="number" step="any" placeholder="₱ actual" value={cart[i.id]} onChange={e => setCart(c => ({ ...c, [i.id]: e.target.value }))} />}
        <Avatar id={i.created_by} />
        {tab === 'buy' && <button className="text-xs text-muted" onClick={async () => fail((await supabase!.from('shopping_items').update({ status: 'cancelled' }).eq('id', i.id)).error)}>✕</button>}
      </div>)}
    </Card>
    {inCart.length > 0 && <div className="sticky bottom-24 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg md:bottom-4">
      <div className="text-sm"><b>{inCart.length}</b> in cart · {peso(total)}
        <label className="ml-3 text-xs text-muted"><input type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)} /> add linked items to pantry</label></div>
      <Btn onClick={confirm}>Confirm purchase</Btn></div>}
  </div>
}
