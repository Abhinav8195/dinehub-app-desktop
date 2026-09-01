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

/** Floors that actually have tables — preferred for floor-plan tabs. */
export function floorsFromTables(tables: Array<{ floor?: string | null }>): string[] {
  const names = [...new Set(tables.map((t) => String(t.floor || '').trim()).filter(Boolean))]
  return names.sort((a, b) => {
    const ia = (STANDARD_FLOORS as readonly string[]).indexOf(a)
    const ib = (STANDARD_FLOORS as readonly string[]).indexOf(b)
    if (ia >= 0 && ib >= 0) return ia - ib
    if (ia >= 0) return -1
    if (ib >= 0) return 1
    return a.localeCompare(b)
  })
}

/** Existing table floors + standard labels (for Add Table picker). */
export function floorOptionsForForm(tables: Array<{ floor?: string | null }>): string[] {
  return [...new Set([...floorsFromTables(tables), ...STANDARD_FLOORS])]
}

export function normalizeTableStatus(status: string): string {
  return String(status || 'available').toLowerCase()
}

export function tableDisplayLabel(table: TableDto): string {
  return `T-${table.number}`
}

export function isTableSelectableForNewOrder(table: TableDto, currentId: string | null): boolean {
  const status = normalizeTableStatus(table.status)
  // Occupied / reserved tables can be re-opened to add another KOT round.
  return status === 'available' || status === 'occupied' || status === 'reserved' || table.id === currentId
}
