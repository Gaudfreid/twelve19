import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAgenda } from '../../lib/agenda'
import { useAuth } from '../auth/AuthProvider'
import { Btn, fail, input, Card } from '../../components/ui'

const dot = { event: 'bg-pink', bill: 'bg-sun', chore: 'bg-sage' } as const
export default function Calendar() {
  const { household, session } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const a = useAgenda(hh)
  const t0 = new Date(a.today + 'T00:00:00')
  const [cur, setCur] = useState({ y: t0.getFullYear(), m: t0.getMonth() }); const [sel, setSel] = useState(a.today)
  const [show, setShow] = useState(false); const [f, setF] = useState({ title: '', time: '' })
  const first = new Date(cur.y, cur.m, 1); const dim = new Date(cur.y, cur.m + 1, 0).getDate()
  const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  const key = (d: number) => `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const go = (n: number) => setCur(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const on = (d: string) => a.items.filter(i => i.date === d)
  async function add(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase!.from('calendar_events').insert({ household_id: hh, title: f.title.trim(), event_date: sel, start_time: f.time || null, created_by: uid })
    if (!fail(error)) { setF({ title: '', time: '' }); setShow(false) }
  }
  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><CalendarDays className="text-pink" /> Calendar</h1>
      <Btn variant="ghost" onClick={() => { setCur({ y: t0.getFullYear(), m: t0.getMonth() }); setSel(a.today) }}>Today</Btn></div>
    <Card>
      <div className="mb-3 flex items-center justify-between"><button onClick={() => go(-1)} aria-label="Previous month"><ChevronLeft /></button>
        <b>{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</b><button onClick={() => go(1)} aria-label="Next month"><ChevronRight /></button></div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="pb-1 text-xs font-bold text-muted">{d}</div>)}
        {cells.map((d, i) => d === null ? <div key={i} /> : <button key={i} onClick={() => setSel(key(d))} className={`mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full ${key(d) === sel ? 'bg-pink/50 font-bold' : key(d) === a.today ? 'ring-2 ring-sun' : ''}`}>
          {d}<span className="flex gap-0.5">{[...new Set(on(key(d)).map(x => x.kind))].map(k => <i key={k} className={`h-1.5 w-1.5 rounded-full ${dot[k]}`} />)}</span></button>)}
      </div></Card>
    <div className="flex items-center justify-between"><h2 className="font-extrabold">{sel === a.today ? 'Today, ' : ''}{new Date(sel + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h2><Btn onClick={() => setShow(s => !s)}>+ Add Event</Btn></div>
    {show && <form onSubmit={add} className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-3">
      <input className={`${input} min-w-40 flex-1`} placeholder="Date night, anniversary…" required autoFocus value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <input className={`${input} w-32`} type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} aria-label="Time (optional)" /><Btn type="submit">Add</Btn></form>}
    <Card className="divide-y divide-line !p-0">{on(sel).length === 0 && <p className="p-4 text-sm text-muted">Nothing planned. Bills and chores with due dates show up here too.</p>}
      {on(sel).map(i => <div key={i.kind + i.id} className="flex items-center gap-3 px-4 py-3"><span className={`h-2.5 w-2.5 rounded-full ${dot[i.kind]}`} />
        <span className="flex-1">{i.title}{i.time && <span className="ml-2 text-xs text-muted">{i.time.slice(0, 5)}</span>}</span>
        {i.kind === 'bill' && <Receipt size={16} className="text-muted" />}{i.kind === 'chore' && <ClipboardCheck size={16} className="text-muted" />}
        {i.kind === 'event' && <button className="text-xs text-muted" aria-label="Delete event" onClick={async () => fail((await supabase!.from('calendar_events').delete().eq('id', i.id)).error)}>✕</button>}</div>)}</Card>
  </div>
}
