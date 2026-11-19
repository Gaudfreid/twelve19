import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLive } from '../../lib/live'
import { dueLabel, todayManila } from '../../lib/bills'
import { useAuth } from '../auth/AuthProvider'
import { Art } from '../../components/art'
import { Avatar, Btn, Card, fail, input } from '../../components/ui'

export default function Chores() {
  const { household, session, members } = useAuth(); const hh = household!.id; const uid = session!.user.id
  const { rows } = useLive<any>('chores', hh, 'created_at')
  const [tab, setTab] = useState<'all' | 'mine' | 'done'>('all'); const [show, setShow] = useState(false)
  const [f, setF] = useState({ title: '', who: '', due: '', repeat: 'none' })
  const today = todayManila()
  const open = rows.filter(c => c.status === 'open').sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const done = rows.filter(c => c.status === 'done').sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))).slice(0, 20)
  const shown = tab === 'done' ? done : tab === 'mine' ? open.filter(c => c.assigned_to === uid) : [...open, ...done.slice(0, 3)]
  async function add(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase!.from('chores').insert({ household_id: hh, title: f.title.trim(), assigned_to: f.who || null, due_date: f.due || null, recurrence: f.repeat, created_by: uid })
    if (!fail(error)) setF({ ...f, title: '', due: '' })
  }
  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><h1 className="flex items-center gap-2 text-2xl font-extrabold"><ClipboardCheck className="text-pink" /> Chores</h1><Btn onClick={() => setShow(s => !s)}>+ Add Task</Btn></div>
    <div className="flex gap-2">{([['all', 'All'], ['mine', 'Mine'], ['done', 'Done']] as const).map(([k, v]) =>
      <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-5 py-2 text-sm ${tab === k ? 'border-pink/40 bg-pink/35 font-bold' : 'border-line bg-surface text-muted'}`}>{v}</button>)}</div>
    {show && <form onSubmit={add} className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-3">
      <input className={`${input} min-w-40 flex-1`} placeholder="What needs doing?" required autoFocus value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <select className={`${input} w-36`} value={f.who} onChange={e => setF({ ...f, who: e.target.value })}><option value="">Anyone</option>{members.map(m => <option key={m.id} value={m.id}>{m.display_name || 'Unnamed'}</option>)}</select>
      <input className={`${input} w-40`} type="date" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} aria-label="Due date" />
      <select className={`${input} w-32`} value={f.repeat} onChange={e => setF({ ...f, repeat: e.target.value })}><option value="none">No repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
      <Btn type="submit">Add</Btn></form>}
    <Card className="divide-y divide-line !p-0">{shown.length === 0 && <p className="p-4 text-sm text-muted">{tab === 'done' ? 'Nothing finished yet.' : 'No chores. Enjoy the quiet ♡'}</p>}
      {shown.map(c => { const d = c.status === 'done'; return <div key={c.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
        {d ? <span className="grid h-6 w-6 place-items-center rounded-full bg-sage text-xs text-white">✓</span> :
          <input type="checkbox" className="h-6 w-6 accent-[var(--pink)]" onChange={async () => fail((await supabase!.rpc('complete_chore', { p_id: c.id })).error)} aria-label={`Finish ${c.title}`} />}
        <div className="flex-1"><div className={`font-semibold ${d ? 'text-muted line-through' : ''}`}>{c.title}</div>
          <div className={`text-xs ${!d && c.due_date && c.due_date < today ? 'text-pink' : 'text-muted'}`}>{d ? 'Completed' : dueLabel(c.due_date, today)}{c.recurrence !== 'none' && ` · repeats ${c.recurrence}`}</div></div>
        {c.assigned_to && <Avatar id={c.assigned_to} size="h-9 w-9" />}
        {!d && <button className="text-xs text-muted" aria-label="Delete" onClick={async () => fail((await supabase!.from('chores').delete().eq('id', c.id)).error)}>✕</button>}</div> })}</Card>
    <div className="flex items-center justify-end gap-3"><div className="script text-2xl">Teamwork makes<br />the dream work ♡</div><Art name="chores" className="h-20" /></div>
  </div>
}
