import { NavLink, Outlet } from 'react-router-dom'
import { Home, Menu, Package, ShoppingCart, Wallet } from 'lucide-react'
const nav = [
  { to: '/', label: 'Home', Icon: Home }, { to: '/shopping', label: 'Shop', Icon: ShoppingCart },
  { to: '/pantry', label: 'Pantry', Icon: Package }, { to: '/money', label: 'Money', Icon: Wallet }, { to: '/settings', label: 'More', Icon: Menu },
]
export default function Layout() {
  return <div className="md:flex">
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-line p-4 md:flex">
      <div className="mb-4 text-lg font-bold">🏡 Our Little Home</div>
      {nav.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 ${isActive ? 'bg-pink/30 font-semibold' : 'text-muted'}`}><Icon size={18} />{label}</NavLink>)}
    </aside>
    <main className="mx-auto w-full max-w-3xl p-4 pb-28 md:pb-8"><Outlet /></main>
    <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {nav.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-2 text-xs ${isActive ? 'text-pink font-semibold' : 'text-muted'}`}><Icon size={22} />{label}</NavLink>)}
    </nav>
  </div>
}
