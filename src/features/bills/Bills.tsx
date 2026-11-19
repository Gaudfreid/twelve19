import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { useAgenda } from '../../lib/agenda'
import { billStatus, fmtDate } from '../../lib/bills'
import { useAuth } from '../auth/AuthProvider'
import BillIcon from '../../components/BillIcon'
import { Avatar, Btn, Card, Chip, fail, input, peso } from '../../components/ui'

const CATS = ['Electricity', 'Water', 'Internet', 'Rent', 'Subscriptions', 'Other']
const FREQ: Record<string, string> = { monthly: 'Monthly', weekly: 'Weekly', quarterly: 'Quarterly', yearly: 'Yearly', one_time: 'One-time' }
const tone = { paid: 'sage', partial: 'sun', overdue: 'pink', soon: 'sun', upcoming: 'lav', cancelled: 'lav' } as const
const label = { paid: 'Paid', partial: 'Partial', overdue: 'Overdue', soon: 'Due soon', upcoming: 'Upcoming', cancelled: 'Cancelled' } as const

export default function Bills() {
  const { household, session } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const a = useAgenda(hh)
  const { rows: util } = useLive<any>('utility_readings', hh, 'billing_period')
  const [show, setShow] = useState(false); const [open, setOpen] = useState<string | null>(null)
  const [f, setF] = useState({ name: '', provider: '', category: 'Electricity', frequency: 'monthly', amount: '', due: '' })
  const [pay, setPay] = useState({ amount: '', date: '' })
  const [u, setU] = useState({ type: 'electricity', period: '', consumption: '' })
  useEffect(() => { supabase!.rpc('generate_bill_records') }, [])

  const month = a.today.slice(0, 7)
  const paidMonth = a.ents.filter(e => String(e.paid_on).startsWith(month)).reduce((s, e) => s + Number(e.amount), 0)
  const toPay = a.openBills.reduce((s, r) => s + a.remaining(r), 0)
  const recent = a.recs.filter(r => billStatus(r, a.paid[r.id] || 0, a.today) === 'paid').sort((x, y) => y.due_date.localeCompare(x.due_date)).slice(0, 3)

  async function addBill(e: React.FormEvent) {
    e.preventDefault()
    const day = new Date(f.due + 'T00:00:00').getDate()
    const { error } = await supabase!.from('bills').insert({ household_id: hh, name: f.name.trim(), provider: f.provider || null, category: f.category,
      frequency: f.frequency, expected_amount: Number(f.amount) || 0, due_day: ['monthly', 'quarterly'].includes(f.frequency) ? day : null, next_due_date: f.due, created_by: uid })
    if (fail(error)) return
    await supabase!.rpc('generate_bill_records'); setShow(false); setF({ ...f, name: '', provider: '', amount: '', due: '' })
  }
  const toggle = (r: any) => { if (open === r.id) return setOpen(null); setOpen(r.id); setPay({ amount: a.remaining(r).toFixed(2), date: a.today }) }
  async function recordPay(r: any) {
    if (!fail((await supabase!.rpc('record_bill_payment', { p_record: r.id, p_amount: Number(pay.amount), p_paid_on: pay.date || null })).error)) setOpen(null)
  }
  async function addReading(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase!.from('utility_readings').insert({ household_id: hh, utility_type: u.type, billing_period: u.period, consumption: Number(u.consumption),
      unit: u.type === 'electricity' ? 'kWh' : 'm³', recorded_by: uid })
    if (!fail(error)) setU({ ...u, consumption: '' })
  }
  const row = (r: any) => {
    const b = a.billOf(r.bill_id); const p = a.paid[r.id] || 0; const s = billStatus(r, p, a.today)
    return <div key={r.id}><button onClick={() => toggle(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
      <BillIcon category={b?.category} /><div className="flex-1"><div className="font-bold">{b?.name ?? 'Bill'}</div>
        <div className={`text-xs ${s === 'overdue' ? 'text-pink' : 'text-muted'}`}>Due {fmtDate(r.due_date)}{p > 0 && p < Number(r.amount_due) && ` · paid ${peso(p)}`}</div></div>
      <div className="text-right"><div className="font-bold">{peso(a.remaining(r) > 0 ? a.remaining(r) : Number(r.amount_due))}</div><Chip tone={tone[s]}>{label[s]}</Chip></div></button>
      {open === r.id && <div className="flex flex-wrap items-end gap-2 bg-pink/5 px-4 pb-3">
        <label className="text-xs text-muted">Amount<input className={`${input} w-32`} type="number" step="0.01" min="0.01" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} /></label>
        <label className="text-xs text-muted">Paid on<input className={`${input} w-40`} type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} /></label>
        <Btn onClick={() => recordPay(r)}>Record payment</Btn>
        <div className="w-full text-xs text-muted">Partial payments are fine. Each payment counts as spending on the day you paid.</div>
        {a.ents.filter(x => x.bill_record_id === r.id).map(x => <div key={x.id} className="flex w-full items-center gap-2 text-xs"><Avatar id={x.paid_by} size="h-5 w-5" />{peso(Number(x.amount))} · {fmtDate(x.paid_on)}</div>)}
      </div>}</div>
  }
  const readings = (type: string) => { const l = util.filter(x => x.utility_type === type).slice(0, 3); return l.map((x, i) => {
    const prev = l[i + 1]; const d = prev ? Number(x.consumption) - Number(prev.consumption) : null
    return <div key={x.id} className="flex justify-between py-1 text-sm"><span>{fmtDate(x.billing_period)}</span><span>{Number(x.consumption)} {x.unit}{d != null && <span className={`ml-2 text-xs ${d > 0 ? 'text-pink' : 'text-sage'}`}>{d > 0 ? '+' : ''}{d.toFixed(1)}</span>}</span></div> }) }

  return <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-3"><Card><div className="text-xs text-muted">Paid this month</div><div className="text-2xl font-extrabold">{peso(paidMonth)}</div></Card>
      <Card><div className="text-xs text-muted">Still to pay</div><div className="text-2xl font-extrabold">{peso(toPay)}</div><div className="text-[11px] text-muted">Not counted as spending until paid</div></Card></div>
    <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Upcoming Bills</h2><Btn onClick={() => setShow(s => !s)}>+ Add Bill</Btn></div>
    {show && <form onSubmit={addBill} className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-3">
      <input className={`${input} min-w-40 flex-1`} placeholder="Bill name (e.g. Electricity)" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input className={`${input} w-40`} placeholder="Provider" value={f.provider} onChange={e => setF({ ...f, provider: e.target.value })} />
      <select className={`${input} w-40`} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
      <select className={`${input} w-32`} value={f.frequency} onChange={e => setF({ ...f, frequency: e.target.value })}>{Object.entries(FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input className={`${input} w-28`} type="number" min="0" step="0.01" placeholder="₱ usual" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
      <input className={`${input} w-40`} type="date" required value={f.due} onChange={e => setF({ ...f, due: e.target.value })} aria-label="Next due date" />
      <Btn type="submit">Save bill</Btn></form>}
    <Card className="divide-y divide-line !p-0">{a.openBills.length === 0 ? <p className="p-4 text-sm text-muted">Nothing due. Add a bill and it repeats automatically.</p> : a.openBills.map(row)}</Card>
    {recent.length > 0 && <><h2 className="text-lg font-extrabold">Recently Paid</h2><Card className="divide-y divide-line !p-0">{recent.map(row)}</Card></>}
    {a.bills.filter(b => b.active).length > 0 && <><h2 className="text-lg font-extrabold">Your Bills</h2>
      <Card className="divide-y divide-line !p-0">{a.bills.filter(b => b.active).map(b => <div key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm">
        <BillIcon category={b.category} size="h-9 w-9" /><div className="flex-1"><b>{b.name}</b><div className="text-xs text-muted">{FREQ[b.frequency]} · usually {peso(Number(b.expected_amount))}{b.next_due_date && ` · next ${fmtDate(b.next_due_date)}`}</div></div>
        <button className="text-xs text-muted underline" onClick={async () => fail((await supabase!.from('bills').update({ active: false }).eq('id', b.id)).error)}>Stop</button></div>)}</Card></>}
    <h2 className="text-lg font-extrabold">Utility Readings</h2>
    <form onSubmit={addReading} className="flex flex-wrap gap-2"><select className={`${input} w-36`} value={u.type} onChange={e => setU({ ...u, type: e.target.value })}><option value="electricity">Electricity (kWh)</option><option value="water">Water (m³)</option></select>
      <input className={`${input} w-40`} type="date" required value={u.period} onChange={e => setU({ ...u, period: e.target.value })} aria-label="Billing period" />
      <input className={`${input} w-32`} type="number" min="0" step="any" required placeholder="Used" value={u.consumption} onChange={e => setU({ ...u, consumption: e.target.value })} /><Btn type="submit">Add reading</Btn></form>
    <div className="grid gap-3 md:grid-cols-2"><Card><div className="mb-1 font-bold">⚡ Electricity</div>{readings('electricity')}</Card><Card><div className="mb-1 font-bold">💧 Water</div>{readings('water')}</Card></div>
  </div>
}
