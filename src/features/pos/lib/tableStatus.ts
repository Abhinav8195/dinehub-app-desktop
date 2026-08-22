import type { TableDto } from '@/api/types/pos.types'

export const TABLE_STATUS_STYLES: Record<string, string> = {
  available: 'bg-success/10 border-success/40 text-success hover:border-success',
  occupied: 'bg-danger/10 border-danger/40 text-danger hover:border-danger',
  reserved: 'bg-warning/10 border-warning/40 text-warning hover:border-warning',
  cleaning: 'bg-muted border-border text-muted-foreground hover:border-foreground/30',
}

export const TABLE_STATUS_LEGEND = [
  { key: 'available', label: 'Available', className: 'bg-success' },
  { key: 'occupied', label: 'Running / Occupied', className: 'bg-danger' },
  { key: 'reserved', label: 'Reserved', className: 'bg-warning' },
  { key: 'cleaning', label: 'Cleaning', className: 'bg-muted-foreground' },
] as const

export const STANDARD_FLOORS = [
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  'Basement',
  'Party Hall',
  'Outdoor',
  'Rooftop',
] as const

export function normalizeTableStatus(status: string): string {
  return String(status || 'available').toLowerCase()
}

export function tableDisplayLabel(table: TableDto): string {
  return `T-${table.number}`
}

export function isTableSelectableForNewOrder(table: TableDto, currentId: string | null): boolean {
  const status = normalizeTableStatus(table.status)
  return status === 'available' || table.id === currentId
}
