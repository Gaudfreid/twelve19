export type BillStatus = 'paid' | 'partial' | 'overdue' | 'soon' | 'upcoming' | 'cancelled'
export const todayManila = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
export const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export function billStatus(r: any, paid: number, today: string): BillStatus {
  if (r.cancelled) return 'cancelled'
  if (paid >= Number(r.amount_due)) return 'paid'
  if (r.due_date < today) return 'overdue'
  if (paid > 0) return 'partial'
  return (new Date(r.due_date).getTime() - new Date(today).getTime()) / 864e5 <= 7 ? 'soon' : 'upcoming'
}
export const dueLabel = (d: string | null, today: string) => {
  if (!d) return 'No date'
  if (d < today) return `Overdue · ${fmtDate(d)}`
  if (d === today) return 'Due Today'
  if (new Date(d).getTime() - new Date(today).getTime() === 864e5) return 'Due Tomorrow'
  return `Due ${fmtDate(d)}`
}
