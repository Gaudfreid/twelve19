import { Link } from 'react-router-dom'
import { CalendarDays, ClipboardCheck, Package, Receipt, ShoppingBasket, Wallet } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useLive } from '../../lib/live'
import { useAgenda } from '../../lib/agenda'
import { fmtDate } from '../../lib/bills'
import { activityText, ago } from '../../lib/activity'
import { pantryState } from '../../lib/pantry'
import { Avatar, Card, Chip, ItemIcon, Tile, peso } from '../../components/ui'
import BillIcon from '../../components/BillIcon'
import { Art } from '../../components/art'

const chip = { out: 'pink', low: 'sun', expiring: 'sun', good: 'sage' } as const
const label = { out: 'Out', low: 'Low stock', expiring: 'Expiring soon', good: 'Good' } as const
const pill = 'rounded-xl bg-pink px-4 py-2 text-sm font-semibold text-[#33202A]'
const More = ({ to, t }: { to: string; t: string }) => <Link to={to} className="text-xs font-semibold text-pink">{t} →</Link>
const Head = ({ icon, title, to, t }: { icon: React.ReactNode; title: string; to?: string; t?: string }) =>
  <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold">{icon}{title}</h2>{to && <More to={to} t={t!} />}</div>
const Empty = ({ text, to, action }: { text: string; to?: string; action?: string }) =>
  <div className="py-1 text-sm text-muted">{text}{to && <> <Link to={to} className="font-semibold text-pink underline">{action}</Link></>}</div>

export default function Dashboard() {
  const { household, me, members } = useAuth(); const hh = household!.id
  const a = useAgenda(hh)
  const x = useLive<any>('expenses', hh); const p = useLive<any>('pantry_items', hh)
  const sh = useLive<any>('shopping_items', hh, 'created_at'); const lg = useLive<any>('activity_logs', hh, 'created_at', 20)
  const tz = 'Asia/Manila'; const month = a.today.slice(0, 7)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: tz })
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hour12: false })) % 24
  const ready = !x.loading && !p.loading && !sh.loading && !lg.loading
  const err = x.error || p.error || sh.error || lg.error
  const spent = x.rows.filter(e => String(e.transaction_date).startsWith(month)).reduce((s, e) => s + Number(e.amount), 0)
  const needed = sh.rows.filter(i => i.status === 'needed'); const bought = sh.rows.filter(i => i.status === 'purchased')
  const preview = [...needed, ...bought].slice(0, 4)
  const states = p.rows.map(i => pantryState(i)); const attention = p.rows.filter(i => pantryState(i) !== 'good')
  const lowCount = states.filter(s => s === 'low' || s === 'out').length; const expCount = states.filter(s => s === 'expiring').length
  const nextBill = a.openBills[0]; const nb = nextBill && a.billOf(nextBill.bill_id)
  const overdue = a.openBills.filter(r => r.due_date < a.today).length
  const upcoming = a.items.filter(i => i.date >= a.today).slice(0, 4)
  const names = members.map(m => m.display_name || 'Unnamed'); const alone = members.length < 2
  const who = (id?: string) => members.find(m => m.id === id)?.display_name || 'Someone'

  return <div className="flex flex-col gap-4">
    <div className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold md:text-3xl">Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}{me?.display_name ? `, ${me.display_name}` : ''}! {hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙'}</h1>
        <p className="text-muted">Here's what's happening at home today.</p></div>
      <div className="flex items-center gap-3"><div className="flex -space-x-2">{members.map(m => <Avatar key={m.id} id={m.id} size="h-10 w-10" />)}</div>
        <span className="hidden rounded-full border border-line bg-surface px-3 py-1.5 text-xs sm:block">{today}</span></div>
    </div>
    {err && <div role="alert" className="rounded-2xl bg-pink/20 p-3 text-sm">Some data couldn't load ({err}). Check your connection and refresh.</div>}
    {alone && <Card className="flex flex-wrap items-center gap-4 bg-pink/10"><Art name="cat" className="h-14" />
      <div className="min-w-48 flex-1"><div className="font-bold">Your little home is getting started!</div><div className="text-sm text-muted">Invite your partner to start managing your home together.</div></div>
      <Link to="/settings" className={pill}>Invite your partner</Link></Card>}
    {!ready ? <div className="py-10 text-center text-muted">Loading your home…</div> : <>
    <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-3 md:grid-cols-[1fr_1fr_1fr_1.3fr]">
      <Card className="flex items-start justify-between"><div><div className="text-xs text-muted">Spent this month</div><div className="my-1 text-2xl font-extrabold">{peso(spent)}</div><div className="text-[11px] text-muted">Paid expenses only, unpaid bills not included</div></div><Tile tone="sage"><Wallet size={20} /></Tile></Card>
      <Link to="/money"><Card className="flex h-full items-start justify-between"><div><div className="text-xs text-muted">Upcoming bill</div>
        {nextBill ? <><div className="my-1 text-xl font-extrabold">{nb?.name}</div><div className="text-[11px] text-muted">{nextBill.due_date < a.today ? 'Overdue since' : 'Due'} {fmtDate(nextBill.due_date)} · {peso(a.remaining(nextBill))}{a.openBills.length > 1 && ` · +${a.openBills.length - 1} more`}{overdue > 0 && ` · ${overdue} overdue`}</div></>
          : a.bills.length === 0 ? <><div className="my-1 text-xl font-extrabold">No bills yet</div><div className="text-[11px] text-muted">Tap to add your first bill</div></>
          : <><div className="my-1 text-xl font-extrabold">Nothing due</div><div className="text-[11px] text-muted">Everything is paid</div></>}</div><BillIcon category={nb?.category} /></Card></Link>
      <Link to="/pantry"><Card className="flex h-full items-start justify-between bg-sage/15"><div><div className="text-xs text-muted">Pantry</div>
        {p.rows.length === 0 ? <><div className="my-1 text-xl font-extrabold">Not set up</div><div className="text-[11px] text-muted">Add your first item</div></>
          : <><div className="my-1 text-xl font-extrabold">{lowCount} low or out</div><div className="text-[11px] text-muted">{expCount} expiring soon · {p.rows.length} items</div></>}</div><Tile tone="sage"><Package size={20} /></Tile></Card></Link>
      <Art name="house" className="hidden h-36 w-full md:block" />
    </div>
    <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="relative"><Head icon={<ShoppingBasket size={18} className="text-pink" />} title="Shopping List" to="/shopping" t="View all" />
        {preview.length === 0 ? <Empty text="Your shopping list is clear." to="/shopping" action="Add an item" /> : <>
          <div className="mb-2 text-xs text-sage">{needed.length} item{needed.length === 1 ? '' : 's'} left</div>
          {preview.map(i => <div key={i.id} className="flex items-center gap-2 py-1.5"><span aria-hidden className={`grid h-5 w-5 place-items-center rounded-md border text-[11px] ${i.status === 'purchased' ? 'border-sage bg-sage text-white' : 'border-line'}`}>{i.status === 'purchased' && '✓'}</span>
            <span className={i.status === 'purchased' ? 'text-muted' : ''}>{i.name}</span>{i.status === 'purchased' && <span className="sr-only">(bought)</span>}</div>)}</>}
        <Art name="basket" className="pointer-events-none absolute bottom-2 right-3 h-16" /></Card>
      <Card><Head icon={<CalendarDays size={18} className="text-pink" />} title="Upcoming Events" to="/calendar" t="View calendar" />
        {upcoming.length === 0 ? <Empty text="Nothing coming up yet." to="/calendar" action="Add an event" /> : upcoming.map(i => <div key={i.kind + i.id} className="flex items-center gap-3 py-1.5 text-sm">
          <span className="w-14 shrink-0 rounded-lg bg-pink/20 py-1 text-center text-xs font-semibold">{fmtDate(i.date)}</span><span className="flex-1">{i.title}</span>
          {i.kind === 'bill' && <><Receipt size={14} className="text-muted" aria-hidden /><span className="sr-only">bill</span></>}{i.kind === 'chore' && <><ClipboardCheck size={14} className="text-muted" aria-hidden /><span className="sr-only">chore</span></>}</div>)}</Card>
      <Card><Head icon={<span aria-hidden className="text-pink">⚠</span>} title="Pantry Alerts" to="/pantry" t="View pantry" />
        {p.rows.length === 0 ? <Empty text="Your pantry is waiting to be filled." to="/pantry" action="Add pantry item" />
          : attention.length === 0 ? <Empty text="Everything is stocked and fresh ♡" />
          : attention.slice(0, 4).map(i => <div key={i.id} className="flex items-center gap-3 py-1.5 text-sm"><ItemIcon name={i.name} size="h-9 w-9" /><span className="flex-1">{i.name}</span><Chip tone={chip[pantryState(i)]}>{label[pantryState(i)]}</Chip></div>)}</Card>
      <Card className="sm:col-span-2 lg:col-span-1"><Head icon={<span aria-hidden>💌</span>} title="Recent Activity" />
        {lg.rows.length === 0 ? <Empty text="Your little home is quiet for now. Shared updates will appear here." />
          : lg.rows.slice(0, 5).map(l => <div key={l.id} className="flex items-start gap-2 py-1.5 text-sm"><Avatar id={l.actor_id} />
            <div className="flex-1"><b>{who(l.actor_id)}</b> {activityText(l)}</div><span className="shrink-0 text-xs text-muted">{ago(l.created_at)}</span></div>)}</Card>
      <Card className="flex items-center gap-4 sm:col-span-2"><div className="flex -space-x-3">{members.map(m => <Avatar key={m.id} id={m.id} size="h-12 w-12" />)}</div>
        <div><div className="font-bold">{household!.name}</div>
          <div className="text-sm">{names.join(' & ')}</div>
          <div className="text-xs text-muted">{members.length} member{members.length === 1 ? '' : 's'}{!alone && <> · A little home, built together <span className="text-pink">♡</span></>}</div></div></Card>
    </div></>}
  </div>
}
