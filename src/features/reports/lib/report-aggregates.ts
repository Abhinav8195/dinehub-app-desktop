import type { PosOrder } from '@/api/types/pos.types'
import { normalize } from '@/features/orders/order-utils'

export type ReportKind =
  | 'sales'
  | 'item'
  | 'category'
  | 'order'
  | 'employee'
  | 'variation'
  | 'group'

export const REPORT_KINDS: Array<{ id: ReportKind; label: string; description: string }> = [
  { id: 'sales', label: 'Sales Summary', description: 'Revenue, orders, tax & channels' },
  { id: 'item', label: 'Item Summary', description: 'Qty & sales by menu item' },
  { id: 'category', label: 'Category Summary', description: 'Totals rolled up by category' },
  { id: 'order', label: 'Order Summary', description: 'Bill-wise order list' },
  { id: 'employee', label: 'Employee Summary', description: 'Sales by cashier / captain' },
  { id: 'variation', label: 'Variation Summary', description: 'Qty & sales by size / variant' },
  { id: 'group', label: 'Group Summary', description: 'Sales by order type (dine-in, takeaway…)' },
]

export interface ItemLineRow {
  key: string
  category: string
  name: string
  code: string
  quantity: number
  rate: number
  total: number
}

export interface CategoryGroup {
  category: string
  quantity: number
  total: number
  items: ItemLineRow[]
}

export interface SimpleSummaryRow {
  key: string
  label: string
  quantity: number
  total: number
  orders?: number
}

function soldOrders(orders: PosOrder[]) {
  return orders.filter((order) => normalize(order.status) !== 'cancelled')
}

/** Map menuItemId → category name (fallback Uncategorized). */
export function buildCategoryLookup(
  menuItems: Array<{ id: string; categoryId?: string; category?: { name?: string } | string | null }>,
  categories: Array<{ id: string; name: string }>,
): Map<string, string> {
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const lookup = new Map<string, string>()
  for (const item of menuItems) {
    const nested =
      typeof item.category === 'string'
        ? item.category
        : item.category?.name
    const name = nested || (item.categoryId ? catName.get(item.categoryId) : undefined) || 'Uncategorized'
    lookup.set(item.id, name)
  }
  return lookup
}

export function buildItemGroups(
  orders: PosOrder[],
  categoryByMenuId: Map<string, string>,
  search = '',
): CategoryGroup[] {
  const q = search.trim().toLowerCase()
  const map = new Map<string, ItemLineRow>()

  for (const order of soldOrders(orders)) {
    for (const item of order.items ?? []) {
      const category = (item.menuItemId && categoryByMenuId.get(item.menuItemId)) || 'Uncategorized'
      const variant = item.variantName ? ` (${item.variantName})` : ''
      const name = `${item.name}${variant}`
      const key = `${category}::${item.menuItemId || item.name}::${item.variantId || item.variantName || ''}`
      const row = map.get(key) ?? {
        key,
        category,
        name,
        code: item.menuItemId ? item.menuItemId.slice(-6).toUpperCase() : '—',
        quantity: 0,
        rate: item.price,
        total: 0,
      }
      row.quantity += item.quantity
      row.total += item.total
      row.rate = row.quantity > 0 ? row.total / row.quantity : item.price
      map.set(key, row)
    }
  }

  let rows = [...map.values()]
  if (q) {
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q)
        || row.category.toLowerCase().includes(q)
        || row.code.toLowerCase().includes(q),
    )
  }

  const byCat = new Map<string, CategoryGroup>()
  for (const row of rows) {
    const group = byCat.get(row.category) ?? { category: row.category, quantity: 0, total: 0, items: [] }
    group.items.push(row)
    group.quantity += row.quantity
    group.total += row.total
    byCat.set(row.category, group)
  }

  return [...byCat.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => b.quantity - a.quantity),
    }))
    .sort((a, b) => b.total - a.total)
}

export function buildCategorySummary(groups: CategoryGroup[]): SimpleSummaryRow[] {
  return groups.map((g) => ({
    key: g.category,
    label: g.category,
    quantity: g.quantity,
    total: g.total,
  }))
}

export function buildVariationSummary(orders: PosOrder[], search = ''): SimpleSummaryRow[] {
  const q = search.trim().toLowerCase()
  const map = new Map<string, SimpleSummaryRow>()
  for (const order of soldOrders(orders)) {
    for (const item of order.items ?? []) {
      const variant = item.variantName || 'No variation'
      const label = `${item.name} · ${variant}`
      const key = `${item.menuItemId || item.name}::${item.variantId || variant}`
      const row = map.get(key) ?? { key, label, quantity: 0, total: 0 }
      row.quantity += item.quantity
      row.total += item.total
      map.set(key, row)
    }
  }
  let rows = [...map.values()].sort((a, b) => b.total - a.total)
  if (q) rows = rows.filter((r) => r.label.toLowerCase().includes(q))
  return rows
}

export function buildEmployeeSummary(orders: PosOrder[]): SimpleSummaryRow[] {
  const map = new Map<string, SimpleSummaryRow>()
  for (const order of soldOrders(orders)) {
    const cashierId = (order as PosOrder & { cashierId?: string | null }).cashierId
    const cashierName = (order as PosOrder & { cashierName?: string | null }).cashierName
    const label = cashierName || cashierId || 'Unassigned'
    const key = cashierId || label
    const row = map.get(key) ?? { key, label, quantity: 0, total: 0, orders: 0 }
    row.orders = (row.orders ?? 0) + 1
    row.total += order.total
    row.quantity += order.items?.reduce((n, i) => n + i.quantity, 0) ?? 0
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function buildGroupSummary(orders: PosOrder[]): SimpleSummaryRow[] {
  const map = new Map<string, SimpleSummaryRow>()
  for (const order of soldOrders(orders)) {
    const label = normalize(order.type).replace(/_/g, ' ') || 'unknown'
    const row = map.get(label) ?? { key: label, label, quantity: 0, total: 0, orders: 0 }
    row.orders = (row.orders ?? 0) + 1
    row.total += order.total
    row.quantity += order.items?.reduce((n, i) => n + i.quantity, 0) ?? 0
    map.set(label, row)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function grandTotals(groups: CategoryGroup[]) {
  return groups.reduce(
    (acc, g) => {
      acc.quantity += g.quantity
      acc.total += g.total
      return acc
    },
    { quantity: 0, total: 0 },
  )
}

export function rowsToCsv(
  headers: string[],
  rows: Array<Array<string | number>>,
): string {
  const escape = (cell: string | number) => {
    const s = String(cell)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
}
