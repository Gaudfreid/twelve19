export type PantryState = 'out' | 'low' | 'expiring' | 'good'
export function pantryState(i: any): PantryState {
  if (Number(i.quantity) === 0) return 'out'
  if (Number(i.minimum_quantity) > 0 && Number(i.quantity) <= Number(i.minimum_quantity)) return 'low'
  if (i.expiration_date && new Date(i.expiration_date).getTime() - Date.now() < 7 * 864e5) return 'expiring'
  return 'good'
}
// "Pantry status": share of items that are not out/low.
export const pantryHealth = (items: any[]) =>
  items.length ? Math.round((100 * items.filter(i => !['out', 'low'].includes(pantryState(i))).length) / items.length) : 100
