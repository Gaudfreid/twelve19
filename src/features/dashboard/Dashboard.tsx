import { Link } from 'react-router-dom'
import { Package, Receipt, ShoppingBasket, Wallet } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useLive } from '../../lib/live'
import { pantryHealth, pantryState } from '../../lib/pantry'
import { Avatar, Card, Chip, ItemIcon, Tile, peso } from '../../components/ui'
import { Art } from '../../components/art'

const chip = { out: 'pink', low: 'sun', expiring: 'sun', good: 'sage' } as const
const label = { out: 'Out', low: 'Low stock', expiring: 'Expiring soon', good: 'Good' } as const
const More = ({ to, t }: { to: string; t: string }) => <Link to={to} className="text-xs font-semibold text-pink">{t} →</Link>
const Head = ({ icon, title, to, t }: { icon: React.ReactNode; title: string; to?: string; t?: string }) =>
  <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold">{icon}{title}</h2>{to && <More to={to} t={t!} />}</div>

export default function Dashboard() {
  const { household, me, members } = useAuth(); const hh = household!.id
  const { rows: expenses } = useLive<any>('expenses', hh)
  const { rows: pantry } = useLive<any>('pantry_items', hh)
  const { rows: items } = useLive<any>('shopping_items', hh, 'created_at')
  const { rows: log } = useLive<any>('activity_logs', hh, 'created_at')
  const tz = 'Asia/Manila'
  const month = new Date().toLocaleDateString('en-CA', { timeZone: tz }).slice(0, 7)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: tz })
  const spent = expenses.filter(e => String(e.transaction_date).startsWith(month)).reduce((s, e) => s + Number(e.amount), 0)
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false })) % 24
  const needed = items.filter(i => i.status === 'needed'); const bought = items.filter(i => i.status === 'purchased')
  const preview = [...needed, ...bought].slice(0, 4)
  const attention = pantry.filter(i => pantryState(i) !== 'good')
  const health = pantryHealth(pantry)
  return <div className="flex flex-col gap-4">
    <div className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold md:text-3xl">Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}{me?.display_name ? `, ${me.display_name}` : ''}! {hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙'}</h1>
        <p className="text-muted">Here's what's happening at home today.</p></div>
      <div className="flex items-center gap-3"><div className="flex -space-x-2">{members.map(m => <Avatar key={m.id} id={m.id} size="h-10 w-10" />)}</div>
        <span className="hidden rounded-full border border-line bg-surface px-3 py-1.5 text-xs sm:block">{today}</span></div>
    </div>
    <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_1fr_1fr_1.3fr]">
      <Card className="flex items-start justify-between"><div><div className="text-xs text-muted">This Month's Spending</div><div className="my-1 text-2xl font-extrabold">{peso(spent)}</div><div className="text-[11px] text-muted">Paid expenses only</div></div><Tile tone="sage"><Wallet size={20} /></Tile></Card>
      <Card className="flex items-start justify-between"><div><div className="text-xs text-muted">Shopping List</div><div className="my-1 text-2xl font-extrabold">{needed.length} to buy</div><div className="text-[11px] text-muted">{needed.length ? 'Tap to start' : 'All caught up'}</div></div><Tile tone="sun"><ShoppingBasket size={20} /></Tile></Card>
      <Card className="flex items-start justify-between bg-sage/15"><div><div className="text-xs text-muted">Pantry Status</div><div className="my-1 text-2xl font-extrabold">{health}%</div><div className="text-[11px] text-muted">{health >= 80 ? 'Good to go!' : 'Time to restock'}</div></div><Tile tone="sage"><Package size={20} /></Tile></Card>
      <Art name="house" className="hidden h-36 w-full md:block" />
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="relative"><Head icon={<ShoppingBasket size={18} className="text-pink" />} title="Shopping List" to="/shopping" t="View all" />
        <div className="mb-2 text-xs text-sage">{needed.length} items left</div>
        {preview.length === 0 ? <p className="text-sm text-muted">Let's get what we need!</p> : preview.map(i => <div key={i.id} className="flex items-center gap-2 py-1.5">
          <span className={`grid h-5 w-5 place-items-center rounded-md border text-[11px] ${i.status === 'purchased' ? 'border-sage bg-sage text-white' : 'border-line'}`}>{i.status === 'purchased' && '✓'}</span><span className={i.status === 'purchased' ? 'text-muted' : ''}>{i.name}</span></div>)}
        <Art name="basket" className="pointer-events-none absolute bottom-2 right-3 h-16" /></Card>
      <Card><Head icon={<Receipt size={18} className="text-pink" />} title="Recent Activity" />
        {log.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : log.slice(0, 4).map(l => <div key={l.id} className="flex items-center gap-3 py-1.5 text-sm">
          <span className="w-14 shrink-0 rounded-lg bg-pink/20 py-1 text-center text-xs font-semibold">{new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz })}</span><span className="flex-1">{l.description}</span></div>)}</Card>
      <Card><Head icon={<span className="text-pink">⚠</span>} title="Pantry Low Stock" to="/pantry" t="View pantry" />
        {attention.length === 0 ? <p className="text-sm text-muted">You're all set! ♡</p> : attention.slice(0, 4).map(i => <div key={i.id} className="flex items-center gap-3 py-1.5 text-sm">
          <ItemIcon name={i.name} size="h-9 w-9" /><span className="flex-1">{i.name}</span><Chip tone={chip[pantryState(i)]}>{label[pantryState(i)]}</Chip></div>)}</Card>
    </div>
    <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
      <Card className="flex items-center gap-4"><div className="flex -space-x-3">{members.map(m => <Avatar key={m.id} id={m.id} size="h-12 w-12" />)}</div>
        <div><div className="font-bold">Household Overview</div><div className="text-sm text-muted">{members.length} member{members.length === 1 ? '' : 's'} · Shared since forever <span className="text-pink">♡</span></div></div></Card>
      <div className="flex items-center justify-center rounded-3xl bg-pink/25 px-6 py-5"><div className="script text-center text-3xl leading-tight">A tidy home,<br />a happy heart <span className="text-pink">♡</span></div></div>
    </div>
  </div>
}
