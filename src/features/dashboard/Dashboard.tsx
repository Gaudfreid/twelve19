import { Link } from 'react-router-dom'
import { ShoppingBasket, Package, Wallet } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useLive } from '../../lib/live'
import { pantryHealth, pantryState } from '../../lib/pantry'
import { Avatar, Card, Chip, Tile, emojiFor, peso } from '../../components/ui'
import { HouseArt } from '../../components/art'

const chip = { out: 'pink', low: 'sun', expiring: 'sun', good: 'sage' } as const
const text = { out: 'Out', low: 'Low stock', expiring: 'Expiring soon', good: 'Good' } as const
const More = ({ to }: { to: string }) => <Link to={to} className="text-xs text-pink">View all →</Link>

export default function Dashboard() {
  const { household, me, members } = useAuth(); const hh = household!.id
  const { rows: expenses } = useLive<any>('expenses', hh)
  const { rows: pantry } = useLive<any>('pantry_items', hh)
  const { rows: items } = useLive<any>('shopping_items', hh, 'created_at')
  const { rows: log } = useLive<any>('activity_logs', hh, 'created_at')
  const month = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 7)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })
  const spent = expenses.filter(e => String(e.transaction_date).startsWith(month)).reduce((s, e) => s + Number(e.amount), 0)
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false })) % 24
  const needed = items.filter(i => i.status === 'needed')
  const attention = pantry.filter(i => pantryState(i) !== 'good')
  return <div className="flex flex-col gap-4">
    <div className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold md:text-3xl">Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}{me?.display_name ? `, ${me.display_name}` : ''}! {hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙'}</h1>
        <p className="text-muted">Here's what's happening at home today.</p></div>
      <div className="flex items-center gap-3"><div className="flex -space-x-2">{members.map(m => <Avatar key={m.id} id={m.id} size="h-9 w-9" />)}</div>
        <span className="hidden rounded-full border border-line bg-surface px-3 py-1.5 text-xs sm:block">{today}</span></div>
    </div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card className="flex flex-col gap-2"><Tile tone="pink"><Wallet size={20} /></Tile><div><div className="text-xs text-muted">This month's spending</div><div className="text-xl font-bold">{peso(spent)}</div><div className="text-[11px] text-muted">Paid expenses only</div></div></Card>
      <Card className="flex flex-col gap-2"><Tile tone="lav"><ShoppingBasket size={20} /></Tile><div><div className="text-xs text-muted">Shopping list</div><div className="text-xl font-bold">{needed.length} to buy</div><div className="text-[11px] text-muted">{needed.length ? 'Tap to start shopping' : 'All caught up'}</div></div></Card>
      <Card className="flex flex-col gap-2"><Tile tone="sage"><Package size={20} /></Tile><div><div className="text-xs text-muted">Pantry status</div><div className="text-xl font-bold">{pantryHealth(pantry)}%</div><div className="text-[11px] text-muted">{pantryHealth(pantry) >= 80 ? 'Good to go!' : 'Time to restock'}</div></div></Card>
      <HouseArt className="hidden h-32 w-full md:block" />
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <Card><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">🛒 Shopping List</h2><More to="/shopping" /></div>
        {needed.length === 0 ? <p className="text-sm text-muted">Let's get what we need!</p> : needed.slice(0, 4).map(i =>
          <div key={i.id} className="flex items-center gap-2 py-1.5 text-sm"><span className="text-lg">{emojiFor(i.name)}</span><span className="flex-1">{i.name}</span><Avatar id={i.created_by} /></div>)}</Card>
      <Card><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">⚠️ Pantry Alerts</h2><More to="/pantry" /></div>
        {attention.length === 0 ? <p className="text-sm text-muted">You're all set! ♡</p> : attention.slice(0, 4).map(i =>
          <div key={i.id} className="flex items-center gap-2 py-1.5 text-sm"><span className="text-lg">{emojiFor(i.name)}</span><span className="flex-1">{i.name}</span><Chip tone={chip[pantryState(i)]}>{text[pantryState(i)]}</Chip></div>)}</Card>
      <Card><h2 className="mb-3 font-semibold">💌 Recent Activity</h2>
        {log.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : log.slice(0, 4).map(l =>
          <div key={l.id} className="flex items-center gap-2 py-1.5 text-sm"><Avatar id={l.actor_id} /><span className="flex-1">{l.description}</span></div>)}</Card>
    </div>
    <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
      <Card className="flex items-center gap-3"><div className="flex -space-x-2">{members.map(m => <Avatar key={m.id} id={m.id} size="h-11 w-11" />)}</div>
        <div><div className="font-semibold">Household Overview</div><div className="text-xs text-muted">{members.length} member{members.length === 1 ? '' : 's'} · {household!.name} ♡</div></div></Card>
      <div className="flex items-center justify-between overflow-hidden rounded-3xl bg-linear-to-br from-pink/45 to-lav/35 px-6 py-4">
        <div className="text-lg font-semibold leading-snug">A tidy home,<br />a happy heart <span className="text-pink">♡</span></div><HouseArt className="h-20" /></div>
    </div>
  </div>
}
