import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Btn, Card, fail, input } from '../../components/ui'
import { useAuth } from './AuthProvider'

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
    <div className="text-center"><div className="text-4xl">🏡</div><h1 className="text-2xl font-bold">Our Little Home</h1><p className="text-muted">Better together ♡</p></div>
    {children}
  </div>
)

export function Setup() {
  return <Shell><Card><h2 className="font-semibold">Connect Supabase</h2>
    <p className="mt-2 text-sm text-muted">Copy <code>.env.example</code> to <code>.env.local</code>, add your project URL and publishable key, then restart the dev server. Apply the migrations in <code>supabase/migrations</code> first.</p></Card></Shell>
}

export function Login() {
  const [signUp, setSignUp] = useState(false)
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('')
  const [note, setNote] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setNote('')
    if (signUp) {
      const { error } = await supabase!.auth.signUp({ email, password, options: { data: { display_name: name } } })
      if (!fail(error)) setNote('Check your email to verify your account, then sign in.')
    } else fail((await supabase!.auth.signInWithPassword({ email, password })).error)
  }
  return <Shell><Card><form onSubmit={submit} className="flex flex-col gap-3">
    {signUp && <input className={input} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />}
    <input className={input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
    <input className={input} type="password" placeholder="Password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
    <Btn type="submit">{signUp ? 'Create account' : 'Sign in'}</Btn>
    {note && <p className="text-sm text-muted">{note}</p>}
    <button type="button" className="text-sm text-muted underline" onClick={() => setSignUp(!signUp)}>{signUp ? 'I have an account' : 'Create an account'}</button>
  </form></Card></Shell>
}

export function Onboarding() {
  const { refresh } = useAuth(); const [name, setName] = useState('Our Little Home')
  async function create() { if (!fail((await supabase!.rpc('create_household', { p_name: name })).error)) await refresh() }
  return <Shell><Card className="flex flex-col gap-3"><h2 className="font-semibold">Set up your home</h2>
    <input className={input} value={name} onChange={e => setName(e.target.value)} />
    <Btn onClick={create}>Create household</Btn>
    <p className="text-sm text-muted">Joining your partner? Open the invite link they sent you instead.</p></Card></Shell>
}

export function Invite() {
  const { token } = useParams(); const nav = useNavigate(); const { refresh } = useAuth()
  async function join() { if (!fail((await supabase!.rpc('accept_household_invitation', { p_token: token })).error)) { await refresh(); nav('/') } }
  return <Shell><Card className="flex flex-col gap-3"><h2 className="font-semibold">You're invited 💌</h2><Btn onClick={join}>Join household</Btn></Card></Shell>
}
