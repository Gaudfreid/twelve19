import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { useAuth } from '../auth/AuthProvider'
import { Art } from '../../components/art'
import { Avatar, Btn, Card, ItemIcon, fail, input, peso } from '../../components/ui'

export default function Shopping() {
  const { household, session } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const { rows: lists } = useLive<any>('shopping_lists', hh)
  const { rows: items } = useLive<any>('shopping_items', hh, 'created_at')
  const { rows: pantry } = useLive<any>('pantry_items', hh)
  const list = lists.find(l => l.status === 'active')
  const [tab, setTab] = useState<'all' | 'buy' | 'bought'>('all'); const [show, setShow] = useState(false)
  const [name, setName] = useState(''); const [qty, setQty] = useState('1'); const [price, setPrice] = useState(''); const [link, setLink] = useState('')
  const [cart, setCart] = useState<Record<string, string>>({}); const [restock, setRestock] = useState(true)
  const needed = items.filter(i => i.status === 'needed'); const bought = items.filter(i => i.status === 'purchased')
  const shown = tab === 'buy' ? needed : tab === 'bought' ? bought : [...needed, ...bought]
  const inCart = Object.keys(cart)

  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!list || !name.trim()) return
    const { error } = await supabase!.from('shopping_items').insert({ household_id: hh, shopping_list_id: list.id, name: name.trim(),
      quantity: Number(qty) || 1, estimated_unit_price: price ? Number(price) : null, pantry_item_id: link || null, created_by: uid })
    if (!fail(error)) { setName(''); setQty('1'); setPrice(''); setLink('') }
  }
  const toggle = (i: any) => setCart(c => { const n = { ...c }; if (i.id in n) delete n[i.id]; else n[i.id] = i.estimated_unit_price ?? ''; return n })
  async function confirm() {
    const payload = inCart.map(id => ({ id, actual_unit_price: cart[id] === '' ? null : Number(cart[id]), restock: restock && !!items.find(x => x.id === id)?.pantry_item_id }))
    if (!fail((await supabase!.rpc('record_shopping_purchase', { p_list: list.id, p_items: payload })).error)) setCart({})
  }
  const total = inCart.reduce((s, id) => s + (Number(cart[id]) || 0) * Number(items.find(x => x.id === id)?.quantity ?? 1), 0)
  const tabs = [['all', `All (${needed.length + bought.length})`], ['buy', `To Buy (${needed.length})`], ['bought', `Bought (${bought.length})`]] as const

  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><ShoppingCart className="text-pink" /> Shopping List</h1>
      <Btn onClick={() => setShow(s => !s)}>+ Add Item</Btn></div>
    <div className="flex gap-2">{tabs.map(([k, v]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-5 py-2 text-sm ${tab === k ? 'border-pink/40 bg-pink/35 font-bold' : 'border-line bg-surface text-muted'}`}>{v}</button>)}</div>
    {show && <form onSubmit={add} className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-3">
      <input className={`${input} min-w-40 flex-1`} placeholder="Add item…" autoFocus value={name} onChange={e => setName(e.target.value)} />
      <input className={`${input} w-16`} type="number" min="0.001" step="any" value={qty} onChange={e => setQty(e.target.value)} aria-label="Quantity" />
      <input className={`${input} w-24`} type="number" min="0" step="any" placeholder="₱ each" value={price} onChange={e => setPrice(e.target.value)} />
      <select className={`${input} w-40`} value={link} onChange={e => setLink(e.target.value)} aria-label="Link to pantry item"><option value="">No pantry link</option>{pantry.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <Btn type="submit">Add</Btn></form>}
    {shown.length === 0 ? <div className="flex flex-col items-center gap-2 py-10"><Art name="cart" className="h-36" /><div className="script text-2xl">Let's get what we need!</div></div> :
      <Card className="flex flex-col divide-y divide-line !p-0">{shown.map(i => { const done = i.status === 'purchased'; return <div key={i.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
        {done ? <span className="grid h-6 w-6 place-items-center rounded-full bg-sage text-xs text-white">✓</span> :
          <input type="checkbox" className="h-6 w-6 accent-[var(--pink)]" checked={i.id in cart} onChange={() => toggle(i)} aria-label={`In cart: ${i.name}`} />}
        <ItemIcon name={i.name} size="h-10 w-10" />
        <div className="flex-1"><div className={`text-lg ${done ? 'text-muted line-through' : ''}`}>{i.name}</div>
          <div className="text-xs text-muted">{Number(i.quantity)}{i.unit ? ` ${i.unit}` : ''}{i.estimated_unit_price != null && ` · ${peso(Number(i.estimated_unit_price))}`}{i.pantry_item_id && ' · pantry-linked'}</div></div>
        {i.id in cart && <input className={`${input} w-24`} type="number" step="any" placeholder="₱ actual" value={cart[i.id]} onChange={e => setCart(c => ({ ...c, [i.id]: e.target.value }))} />}
        <Avatar id={i.created_by} size="h-9 w-9" />
        {!done && <button className="text-xs text-muted" aria-label="Remove" onClick={async () => fail((await supabase!.from('shopping_items').update({ status: 'cancelled' }).eq('id', i.id)).error)}>✕</button>}
      </div> })}</Card>}
    {inCart.length > 0 && <div className="sticky bottom-24 flex items-center justify-between gap-3 rounded-3xl border border-line bg-surface p-3 shadow-lg md:bottom-4">
      <div className="text-sm"><b>{inCart.length}</b> in cart · {peso(total)}<label className="ml-3 text-xs text-muted"><input type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)} /> add linked items to pantry</label></div>
      <Btn onClick={confirm}>Confirm purchase</Btn></div>}
  </div>
}
