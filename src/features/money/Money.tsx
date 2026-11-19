import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { useAuth } from '../auth/AuthProvider'
import Bills from '../bills/Bills'
import { Btn, Card, fail, input, peso } from '../../components/ui'

const CATS = ['Groceries', 'Household supplies', 'Utilities', 'Internet', 'Rent', 'Food', 'Transport', 'Other']
const SRC: Record<string, string> = { manual: 'Manual', shopping_purchase: 'Shopping', bill_payment: 'Bill' }

function Expenses() {
  const { household, session, members } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const { rows } = useLive<any>('expenses', hh, 'transaction_date')
  const [f, setF] = useState({ description: '', amount: '', category: 'Food' })
  const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7)
  const total = rows.filter(e => String(e.transaction_date).startsWith(month)).reduce((s, e) => s + Number(e.amount), 0)
  async function add(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase!.from('expenses').insert({ household_id: hh, description: f.description.trim(), amount: Number(f.amount), category: f.category, paid_by: uid, created_by: uid, source_type: 'manual' })
    if (!fail(error)) setF({ ...f, description: '', amount: '' })
  }
  return <div className="flex flex-col gap-4">
    <Card><div className="text-xs text-muted">Total this month (paid)</div><div className="text-2xl font-extrabold">{peso(total)}</div></Card>
    <form onSubmit={add} className="flex flex-wrap gap-2">
      <input className={`${input} min-w-40 flex-1`} placeholder="What was it?" required value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      <input className={`${input} w-28`} type="number" min="0" step="0.01" placeholder="₱" required value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
      <select className={`${input} w-40`} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
      <Btn type="submit">Add</Btn></form>
    <Card className="divide-y divide-line !p-0">{rows.length === 0 && <p className="p-4 text-sm text-muted">No expenses yet.</p>}
      {rows.map(e => <div key={e.id} className="flex items-center justify-between p-3"><div><div className="font-semibold">{e.description}</div>
        <div className="text-xs text-muted">{e.transaction_date} · {e.category} · {SRC[e.source_type]} · {members.find(m => m.id === e.paid_by)?.display_name || '—'}</div></div>
        <div className="font-bold">{peso(Number(e.amount))}</div></div>)}</Card></div>
}

export default function Money() {
  const [tab, setTab] = useState<'bills' | 'expenses'>('bills')
  return <div className="flex flex-col gap-4"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><Receipt className="text-pink" /> Bills & Expenses</h1>
    <div className="flex gap-2">{(['bills', 'expenses'] as const).map(t => <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-5 py-2 text-sm capitalize ${tab === t ? 'border-pink/40 bg-pink/35 font-bold' : 'border-line bg-surface text-muted'}`}>{t}</button>)}</div>
    {tab === 'bills' ? <Bills /> : <Expenses />}</div>
}
