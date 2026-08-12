import { Circle, CircleCheck, CircleDollarSign, CircleX, Clock3, CookingPot, PackageCheck, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { labelize, normalize } from '../order-utils'

export function OrderStatusBadge({ status, kind = 'order' }: { status?: string | null; kind?: 'order' | 'payment' }) {
  const key = normalize(status)
  const config: Record<string, { variant: 'success' | 'warning' | 'info' | 'destructive' | 'secondary'; icon: typeof Circle }> = {
    pending: { variant: 'secondary', icon: Clock3 }, confirmed: { variant: 'info', icon: CircleCheck }, preparing: { variant: 'warning', icon: CookingPot },
    ready: { variant: 'info', icon: PackageCheck }, completed: { variant: 'success', icon: CircleCheck }, paid: { variant: 'success', icon: CircleDollarSign },
    cancelled: { variant: 'destructive', icon: CircleX }, failed: { variant: 'destructive', icon: CircleX }, refunded: { variant: 'warning', icon: RotateCcw },
    'partially-refunded': { variant: 'warning', icon: RotateCcw },
  }
  const selected = config[key] ?? { variant: 'secondary' as const, icon: kind === 'payment' ? CircleDollarSign : Circle }
  const Icon = selected.icon
  return <Badge variant={selected.variant} className="whitespace-nowrap"><Icon className="mr-1 h-3 w-3" aria-hidden="true" />{labelize(status)}</Badge>
}
