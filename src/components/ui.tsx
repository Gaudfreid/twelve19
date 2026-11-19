import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
export const input = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted outline-none focus:ring-2 focus:ring-pink/60'
export const peso = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
export const fail = (e: { message: string } | null) => { if (e) alert(e.message); return !!e }
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line/70 bg-surface p-4 shadow-[0_6px_24px_-12px_rgba(217,141,166,.45)] ${className}`}>{children}</div>
}
export function Btn({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const v = variant === 'primary' ? 'bg-pink text-[#33202A] font-semibold' : 'border border-line bg-surface text-ink'
  return <button {...p} className={`rounded-xl px-4 py-2 text-sm transition active:scale-95 disabled:opacity-50 ${v} ${className}`} />
}
export function Chip({ tone, children }: { tone: 'sage' | 'sun' | 'pink' | 'lav'; children: ReactNode }) {
  const t = { sage: 'bg-sage/30', sun: 'bg-sun/40', pink: 'bg-pink/30', lav: 'bg-lav/30' }[tone]
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-ink ${t}`}>{children}</span>
}
export const Title = ({ children }: { children: ReactNode }) => <h1 className="mb-4 text-2xl font-bold">{children}</h1>

const EMOJI: [string, string][] = [['milk','🥛'],['egg','🥚'],['bread','🍞'],['banana','🍌'],['chicken','🍗'],['rice','🍚'],['onion','🧅'],['garlic','🧄'],['butter','🧈'],['tomato','🍅'],['oil','🫒'],['salt','🧂'],['sugar','🍬'],['coffee','☕'],['water','💧'],['soap','🧼'],['tissue','🧻'],['apple','🍎'],['fish','🐟'],['meat','🥩'],['pork','🥩'],['beef','🥩'],['cheese','🧀'],['noodle','🍜'],['pasta','🍝'],['cinnamon','🌿'],['spice','🌿'],['pepper','🌶️'],['carrot','🥕'],['potato','🥔']]
export const emojiFor = (name: string) => EMOJI.find(([k]) => name.toLowerCase().includes(k))?.[1] ?? '🛒'
export function Tile({ children, tone = 'pink' }: { children: ReactNode; tone?: 'pink' | 'sage' | 'lav' | 'sun' }) {
  const t = { pink: 'bg-pink/20', sage: 'bg-sage/25', lav: 'bg-lav/25', sun: 'bg-sun/30' }[tone]
  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-xl ${t}`}>{children}</span>
}
const AV = ['bg-pink/50', 'bg-lav/60', 'bg-sage/60', 'bg-sun/60']
export function Avatar({ id, size = 'h-7 w-7' }: { id?: string | null; size?: string }) {
  const { members } = useAuth(); const i = members.findIndex(m => m.id === id)
  const name = members[i]?.display_name || '?'
  return <span title={name} className={`grid ${size} place-items-center rounded-full border-2 border-surface text-xs font-bold ${AV[Math.max(i, 0) % 4]}`}>{name[0].toUpperCase()}</span>
}
