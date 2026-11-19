import { Link, NavLink, Outlet } from 'react-router-dom'
import { Home, Menu, Package, ShoppingCart, Wallet } from 'lucide-react'
import { CatArt, HouseArt } from '../components/art'
const nav = [
  { to: '/', label: 'Home', Icon: Home }, { to: '/shopping', label: 'Shop', Icon: ShoppingCart },
  { to: '/pantry', label: 'Pantry', Icon: Package }, { to: '/money', label: 'Money', Icon: Wallet }, { to: '/settings', label: 'More', Icon: Menu },
]
export default function Layout() {
  return <div className="md:flex">
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r border-line bg-surface/60 p-4 md:flex">
      <Link to="/" className="mb-4 flex flex-col items-center text-center"><HouseArt className="h-20 w-24" /><div className="text-lg font-bold leading-tight">Our Little<br />Home <span className="text-pink">♡</span></div></Link>
      {nav.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-2.5 transition ${isActive ? 'bg-pink/40 font-semibold shadow-sm' : 'text-muted hover:bg-pink/10'}`}><Icon size={18} />{label}</NavLink>)}
      <div className="mt-auto flex flex-col items-center gap-1"><CatArt className="w-28" /><span className="text-sm text-muted">Better together ♡</span></div>
    </aside>
    <main className="mx-auto w-full max-w-4xl p-4 pb-28 md:p-8">
      <div className="mb-4 flex items-center gap-2 md:hidden"><HouseArt className="h-10 w-12" /><b>Our Little Home <span className="text-pink">♡</span></b></div>
      <Outlet /></main>
    <nav className="fixed inset-x-0 bottom-0 flex justify-around rounded-t-3xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(217,141,166,.4)] md:hidden">
      {nav.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-2 text-xs ${isActive ? 'font-semibold text-pink' : 'text-muted'}`}><Icon size={22} />{label}</NavLink>)}
    </nav>
  </div>
}
