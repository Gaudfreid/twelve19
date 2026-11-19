import { useState } from 'react'
import { Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { pantryState } from '../../lib/pantry'
import { useAuth } from '../auth/AuthProvider'
import { Btn, Card, Chip, ItemIcon, fail, input } from '../../components/ui'

const LOCS = { refrigerator: 'Fridge', freezer: 'Freezer', kitchen_pantry: 'Pantry', spice_rack: 'Spices', other: 'Other' } as const
const tone = { out: 'pink', low: 'sun', expiring: 'sun', good: 'sage' } as const
const label = { out: 'Out', low: 'Low stock', expiring: 'Expiring soon', good: 'Good' } as const

export default function Pantry() {
  const { household, session } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const { rows, reload } = useLive<any>('pantry_items', hh)
  const { rows: lists } = useLive<any>('shopping_lists', hh)
  const [filter, setFilter] = useState<string>('all'); const [show, setShow] = useState(false)
  const [f, setF] = useState({ name: '', qty: '1', unit: '', min: '0', location: 'kitchen_pantry', exp: '' })
  const shown = rows.filter(i => filter === 'all' || i.location === filter).sort((a, b) => a.name.localeCompare(b.name))
  const allGood = rows.length > 0 && rows.every(i => pantryState(i) === 'good')

  async function add(e: React.FormEvent) {
    e.preventDefault(); if (!f.name.trim()) return
    const { data, error } = await supabase!.from('pantry_items').insert({ household_id: hh, name: f.name.trim(), unit: f.unit || null,
      minimum_quantity: Number(f.min) || 0, location: f.location, expiration_date: f.exp || null, created_by: uid, updated_by: uid }).select('id').single()
    if (fail(error)) return
    if (Number(f.qty) > 0) fail((await supabase!.rpc('adjust_pantry_quantity', { p_item: data!.id, p_type: 'restock', p_change: Number(f.qty), p_notes: 'Initial stock' })).error)
    setF({ ...f, name: '', qty: '1' }); reload()
  }
  const adjust = async (id: string, type: 'restock' | 'consumption') => { fail((await supabase!.rpc('adjust_pantry_quantity', { p_item: id, p_type: type, p_change: 1 })).error); reload() }
  const toList = async (i: any) => {
    const list = lists.find(l => l.status === 'active'); if (!list) return
    fail((await supabase!.from('shopping_items').insert({ household_id: hh, shopping_list_id: list.id, name: i.name, unit: i.unit, pantry_item_id: i.id, created_by: uid })).error)
  }
  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Package className="text-pink" /> Pantry</h1><Btn onClick={() => setShow(s => !s)}>+ Add Item</Btn></div>
    <div className="flex flex-wrap gap-2">{[['all', 'All'], ...Object.entries(LOCS)].map(([k, v]) =>
      <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-5 py-2 text-sm ${filter === k ? 'border-pink/40 bg-pink/35 font-bold' : 'border-line bg-surface text-muted'}`}>{v}</button>)}</div>
    {show && <form onSubmit={add} className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-3">
      <input className={`${input} min-w-40 flex-1`} placeholder="Item name" autoFocus value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input className={`${input} w-20`} type="number" min="0" step="any" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} aria-label="Quantity" />
      <input className={`${input} w-20`} placeholder="unit" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} />
      <input className={`${input} w-20`} type="number" min="0" step="any" value={f.min} onChange={e => setF({ ...f, min: e.target.value })} title="Minimum quantity" aria-label="Minimum quantity" />
      <select className={`${input} w-32`} value={f.location} onChange={e => setF({ ...f, location: e.target.value })}>{Object.entries(LOCS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input className={`${input} w-40`} type="date" value={f.exp} onChange={e => setF({ ...f, exp: e.target.value })} aria-label="Expiry" />
      <Btn type="submit">Add</Btn></form>}
    <div className="flex flex-col gap-2">
      {shown.length === 0 && <Card><p className="text-sm text-muted">Nothing here yet. Tap + Add Item.</p></Card>}
      {shown.map(i => { const s = pantryState(i); return <Card key={i.id} className="flex items-center gap-3 !p-3">
        <ItemIcon name={i.name} />
        <div className="flex-1"><div className="font-bold">{i.name}</div>
          <div className="text-xs text-muted">{Number(i.quantity)}{i.unit ? ` ${i.unit}` : ''}{i.expiration_date ? ` · Exp: ${i.expiration_date}` : ' · No expiry'}{Number(i.minimum_quantity) > 0 && ` · min ${Number(i.minimum_quantity)}`}</div></div>
        {(s === 'low' || s === 'out') && <button className="text-xs font-semibold text-pink" onClick={() => toList(i)}>Add to list</button>}
        <div className="flex items-center gap-1">
          <button className="h-8 w-8 rounded-full border border-line" onClick={() => adjust(i.id, 'consumption')} disabled={Number(i.quantity) === 0} aria-label={`Use one ${i.name}`}>−</button>
          <button className="h-8 w-8 rounded-full border border-line" onClick={() => adjust(i.id, 'restock')} aria-label={`Add one ${i.name}`}>+</button></div>
        <Chip tone={tone[s]}>{label[s]}</Chip>
      </Card> })}
      {allGood && <div className="rounded-2xl bg-sage/25 py-3 text-center font-bold">🌿 You're all set! <span className="text-pink">♡</span></div>}
    </div></div>
}
