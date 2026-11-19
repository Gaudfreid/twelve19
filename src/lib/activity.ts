// Turns a stored activity row into a friendly sentence fragment (the actor's name is added by the UI).
export function activityText(l: { action: string; description: string }): string {
  const d = String(l.description || '')
  switch (l.action) {
    case 'shopping_added': return `added ${d} to the shopping list`
    case 'expense_added': return `added an expense: ${d}`
    case 'event_added': return `added “${d}” to the calendar`
    case 'shopping_purchased': return d.replace(/^Purchased/, 'bought')
    case 'bill_paid': return d.replace(/^Paid/, 'paid')
    case 'chore_done': return d.replace(/^Finished: /, 'finished ')
    case 'invitation_accepted': return 'joined the household'
    case 'pantry_restock': return `restocked ${d.replace(/^restock /, '')}`
    case 'pantry_consumption': return `used ${d.replace(/^consumption /, '')}`
    case 'pantry_discarded': return `discarded ${d.replace(/^discarded /, '')}`
    case 'pantry_adjustment': return `adjusted ${d.replace(/^adjustment /, '')}`
    default: return d
  }
}
export function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })
}
