import type { OrderItem } from '@/types'
import type { MenuItemDto } from '@/api/types/pos.types'

/** Derive a staff-friendly short code when API does not provide one (e.g. PANEER → PAN). */
export function itemShortCode(item: Pick<MenuItemDto, 'name' | 'shortCode' | 'sku'>): string {
  if (item.shortCode?.trim()) return item.shortCode.trim().toUpperCase()
  if (item.sku?.trim()) return item.sku.trim().toUpperCase()
  const compact = item.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return compact.slice(0, 6) || 'ITEM'
}

export function matchesMenuSearch(item: MenuItemDto, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const code = itemShortCode(item).toLowerCase()
  return (
    item.name.toLowerCase().includes(q) ||
    (item.category?.toLowerCase().includes(q) ?? false) ||
    code.includes(q) ||
    code === q.replace(/\s+/g, '') ||
    (item.sku?.toLowerCase().includes(q) ?? false) ||
    (item.barcode?.toLowerCase() === q) ||
    (item.shortCode?.toLowerCase() === q)
  )
}

export function findByShortCode(items: MenuItemDto[], rawCode: string): MenuItemDto | undefined {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, '')
  if (!code) return undefined
  const exact = items.filter((item) => item.available && itemShortCode(item) === code)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return exact[0]
  return items.find((item) => item.available && itemShortCode(item).startsWith(code))
}

export function cartLineSubtotal(item: OrderItem): number {
  return item.price * item.quantity
}
