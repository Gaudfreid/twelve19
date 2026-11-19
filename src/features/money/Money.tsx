import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { useAuth } from '../auth/AuthProvider'
import { Btn, Card, Title, fail, input, peso } from '../../components/ui'

const CATS = ['Groceries', 'Household supplies', 'Utilities', 'Internet', 'Rent', 'Food', 'Transport', 'Other']
const SRC: Record<string, string> = { manual: 'Manual', shopping_purchase: 'Shopping', bill_payment: 'Bill' }

export default function Money() {
  const { household, session, members } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const { rows } = useLive<any>('expenses', hh, 'transaction_date')
  const [tab, setTab] = useState<'expenses' | 'bills'>('expenses')
  const [f, setF] = useState({ description: '', amount: '', category: 'Food' })
  const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7)
  const total = rows.filter(e => String(e.transaction_date).startsWith(month)).reduce((s, e) => s + Number(e.amount), 0)
  async function add(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase!.from('expenses').insert({ household_id: hh, description: f.description.trim(), amount: Number(f.amount),
      category: f.category, paid_by: uid, created_by: uid, source_type: 'manual' })
    if (!fail(error)) setF({ ...f, description: '', amount: '' })
  }
  return <div className="flex flex-col gap-4"><Title>Money</Title>
    <div className="flex gap-2">{(['expenses', 'bills'] as const).map(t =>
      <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm capitalize ${tab === t ? 'bg-pink/30 font-semibold' : 'text-muted'}`}>{t}</button>)}</div>
    {tab === 'bills' ? <Card><p className="text-sm text-muted">Bills, payments and utilities arrive in Slice 2. Unpaid bills will show as obligations, never as spending.</p></Card> : <>
      <Card><div className="text-sm text-muted">Paid this month</div><div className="text-2xl font-bold">{peso(total)}</div></Card>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input className={`${input} min-w-40 flex-1`} placeholder="What was it?" required value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
        <input className={`${input} w-28`} type="number" min="0" step="0.01" placeholder="₱" required value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
        <select className={`${input} w-40`} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
        <Btn type="submit">Add</Btn></form>
      <Card className="divide-y divide-line !p-0">{rows.length === 0 && <p className="p-4 text-sm text-muted">No expenses yet.</p>}
        {rows.map(e => <div key={e.id} className="flex items-center justify-between p-3">
          <div><div>{e.description}</div><div className="text-xs text-muted">{e.transaction_date} · {e.category} · {SRC[e.source_type]} · {members.find(m => m.id === e.paid_by)?.display_name || '—'}</div></div>
          <div className="font-semibold">{peso(Number(e.amount))}</div></div>)}</Card></>}
  </div>
}
