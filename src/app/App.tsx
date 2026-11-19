import { Route, Routes, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthProvider, useAuth } from '../features/auth/AuthProvider'
import { Invite, Login, Onboarding, Setup } from '../features/auth/Screens'
import Layout from './Layout'
import Dashboard from '../features/dashboard/Dashboard'
import Shopping from '../features/shopping/Shopping'
import Pantry from '../features/pantry/Pantry'
import Money from '../features/money/Money'
import Settings from '../features/settings/Settings'

function Gate() {
  const { session, loading, household } = useAuth(); const { pathname } = useLocation()
  if (loading) return <div className="p-8 text-center text-muted">Loading…</div>
  if (!session) return <Login />
  if (!household && !pathname.startsWith('/invite/')) return <Onboarding />
  return <Routes>
    <Route path="/invite/:token" element={<Invite />} />
    <Route element={<Layout />}>
      <Route index element={<Dashboard />} /><Route path="shopping" element={<Shopping />} />
      <Route path="pantry" element={<Pantry />} /><Route path="money" element={<Money />} /><Route path="settings" element={<Settings />} />
    </Route>
  </Routes>
}
export default function App() { return supabase ? <AuthProvider><Gate /></AuthProvider> : <Setup /> }
