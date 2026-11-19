import { Receipt } from 'lucide-react'
import { Art } from './art'
const IMG: Record<string, string> = { Electricity: 'bolt', Internet: 'wifi', Water: 'water' }
export default function BillIcon({ category, size = 'h-11 w-11' }: { category?: string; size?: string }) {
  const k = category ? IMG[category] : undefined
  return <span className={`grid ${size} shrink-0 place-items-center rounded-2xl bg-sun/25`}>{k ? <Art name={k} className="h-7 w-7" /> : <Receipt size={20} />}</span>
}
