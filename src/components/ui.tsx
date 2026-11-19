import type { ButtonHTMLAttributes, ReactNode } from 'react'
export const input = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted outline-none focus:ring-2 focus:ring-pink/60'
export const peso = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
export const fail = (e: { message: string } | null) => { if (e) alert(e.message); return !!e }
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${className}`}>{children}</div>
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
