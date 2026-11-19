import { useLive } from './live'
import { todayManila } from './bills'
export type AgendaItem = { id: string; date: string; title: string; kind: 'event' | 'bill' | 'chore'; time?: string | null; category?: string }
// Merges bills, chores and events into one dated list for the dashboard + calendar.
export function useAgenda(hh: string) {
  const { rows: bills } = useLive<any>('bills', hh)
  const { rows: recs } = useLive<any>('bill_records', hh)
  const { rows: ents } = useLive<any>('bill_payment_entries', hh)
  const { rows: events } = useLive<any>('calendar_events', hh)
  const { rows: chores } = useLive<any>('chores', hh)
  const today = todayManila()
  const paid: Record<string, number> = {}
  ents.forEach(e => { paid[e.bill_record_id] = (paid[e.bill_record_id] || 0) + Number(e.amount) })
  const remaining = (r: any) => Number(r.amount_due) - (paid[r.id] || 0)
  const billOf = (id: string) => bills.find(b => b.id === id)
  const openBills = recs.filter(r => !r.cancelled && remaining(r) > 0).sort((a, b) => a.due_date.localeCompare(b.due_date))
  const items: AgendaItem[] = [
    ...events.map(e => ({ id: e.id, date: e.event_date, title: e.title, kind: 'event' as const, time: e.start_time })),
    ...openBills.map(r => ({ id: r.id, date: r.due_date, title: `${billOf(r.bill_id)?.name ?? 'Bill'} due`, kind: 'bill' as const, category: billOf(r.bill_id)?.category })),
    ...chores.filter(c => c.status === 'open' && c.due_date).map(c => ({ id: c.id, date: c.due_date, title: c.title, kind: 'chore' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  return { today, bills, recs, ents, paid, remaining, billOf, openBills, events, chores, items }
}
