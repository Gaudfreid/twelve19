import { useAuth } from '../auth/AuthProvider'
import { useLive } from '../../lib/live'
import { pantryHealth, pantryState } from '../../lib/pantry'
import { Card, peso } from '../../components/ui'

export default function Dashboard() {
  const { household, me } = useAuth(); const hh = household!.id
  const { rows: expenses } = useLive<any>('expenses', hh)
  const { rows: pantry } = useLive<any>('pantry_items', hh)
  const { rows: items } = useLive<any>('shopping_items', hh)
  const { rows: log } = useLive<any>('activity_logs', hh, 'created_at')
  const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7)
  const spent = expenses.filter(e => String(e.transaction_date).startsWith(month)).reduce((s, e) => s + Number(e.amount), 0)
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false })) % 24
  const needed = items.filter(i => i.status === 'needed')
  const attention = pantry.filter(i => pantryState(i) !== 'good')
  return <div className="flex flex-col gap-4">
    <div><h1 className="text-2xl font-bold">Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}{me?.display_name ? `, ${me.display_name}` : ''} ♡</h1>
      <p className="text-muted">Here's what's happening at home today.</p></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <Card><div className="text-sm text-muted">Spent this month</div><div className="text-xl font-bold">{peso(spent)}</div><div className="text-xs text-muted">Paid expenses only</div></Card>
      <Card><div className="text-sm text-muted">Shopping</div><div className="text-xl font-bold">{needed.length} to buy</div></Card>
      <Card className="col-span-2 md:col-span-1"><div className="text-sm text-muted">Pantry status</div><div className="text-xl font-bold">{pantryHealth(pantry)}%</div><div className="text-xs text-muted">Items above minimum</div></Card>
    </div>
    <Card><h2 className="mb-2 font-semibold">Pantry needs attention</h2>
      {attention.length === 0 ? <p className="text-sm text-muted">You're all set! ♡</p> : attention.slice(0, 5).map(i =>
        <div key={i.id} className="flex justify-between py-1 text-sm"><span>{i.name}</span><span className="text-muted">{pantryState(i)}</span></div>)}</Card>
    <Card><h2 className="mb-2 font-semibold">Recent activity</h2>
      {log.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : log.slice(0, 5).map(l =>
        <div key={l.id} className="py-1 text-sm">{l.description} <span className="text-muted">· {new Date(l.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</span></div>)}</Card>
  </div>
}
