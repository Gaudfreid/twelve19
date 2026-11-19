import { Link, NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, ClipboardCheck, FileText, Heart, Home, Menu, Package, Receipt, Settings, ShoppingCart, Wallet } from 'lucide-react'
import { Art } from '../components/art'
const live = [
  { to: '/', label: 'Home', Icon: Home }, { to: '/shopping', label: 'Shopping', Icon: ShoppingCart },
  { to: '/pantry', label: 'Pantry', Icon: Package }, { to: '/money', label: 'Bills & Expenses', Icon: Receipt },
]
const soon = [{ label: 'Calendar', Icon: CalendarDays }, { label: 'Chores', Icon: ClipboardCheck }, { label: 'Wishlist', Icon: Heart }, { label: 'Documents', Icon: FileText }]
const mobile = [
  { to: '/', label: 'Home', Icon: Home }, { to: '/shopping', label: 'Shop', Icon: ShoppingCart },
  { to: '/pantry', label: 'Pantry', Icon: Package }, { to: '/money', label: 'Money', Icon: Wallet }, { to: '/settings', label: 'More', Icon: Menu },
]
const link = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 rounded-2xl px-4 py-2.5 transition ${isActive ? 'bg-pink/35 font-bold' : 'text-ink/80 hover:bg-pink/10'}`
export default function Layout() {
  return <div className="md:flex">
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-0.5 border-r border-line bg-surface/70 p-4 md:flex">
      <Link to="/" className="mb-3 flex flex-col items-center text-center"><Art name="logo" className="h-20" /><div className="text-xl font-extrabold leading-tight">Our Little<br />Home <span className="text-pink">♡</span></div></Link>
      {live.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={link}><Icon size={18} />{label}</NavLink>)}
      {soon.map(({ label, Icon }) => <div key={label} className="flex items-center gap-3 px-4 py-2.5 text-muted/70"><Icon size={18} />{label}<span className="ml-auto rounded-full bg-line px-2 text-[10px]">soon</span></div>)}
      <NavLink to="/settings" className={link}><Settings size={18} />Settings</NavLink>
      <div className="mt-auto flex flex-col items-center gap-1"><Art name="cat" className="w-32" /><span className="script text-lg text-muted">Better together ♡</span></div>
    </aside>
    <main className="mx-auto w-full max-w-5xl p-4 pb-28 md:p-8">
      <div className="mb-4 flex items-center gap-2 md:hidden"><Art name="logo" className="h-10" /><b>Our Little Home <span className="text-pink">♡</span></b></div>
      <Outlet /></main>
    <nav className="fixed inset-x-0 bottom-0 flex justify-around rounded-t-3xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(240,154,160,.5)] md:hidden">
      {mobile.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-2 text-xs ${isActive ? 'font-bold text-pink' : 'text-muted'}`}><Icon size={22} />{label}</NavLink>)}
    </nav>
  </div>
}
