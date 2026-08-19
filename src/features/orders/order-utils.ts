import type { PosOrder } from '@/api/types/pos.types'

export type DatePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'month' | 'custom' | 'all'

export function normalize(value?: string | null) {
  return (value ?? '').toLowerCase().replaceAll('_', '-').trim()
}

export function labelize(value?: string | null) {
  const normalized = normalize(value)
  return normalized ? normalized.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : 'Not available'
}

export function orderItemSummary(order: PosOrder, max = 2) {
  const visible = order.items.slice(0, max).map((item) => `${item.quantity}× ${item.name}${item.variantName ? ` (${item.variantName})` : ''}`)
  const remaining = order.items.length - visible.length
  return `${visible.join(', ')}${remaining > 0 ? ` +${remaining} more` : ''}` || 'No items'
}

export function getDateRange(preset: DatePreset, now = new Date(), customFrom = '', customTo = '') {
  if (preset === 'all') return { from: undefined, to: undefined }
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const from = new Date(dayStart)
  const to = new Date(dayStart)
  to.setHours(23, 59, 59, 999)
  if (preset === 'yesterday') { from.setDate(from.getDate() - 1); to.setDate(to.getDate() - 1) }
  if (preset === 'last7') from.setDate(from.getDate() - 6)
  if (preset === 'last30') from.setDate(from.getDate() - 29)
  if (preset === 'month') from.setDate(1)
  if (preset === 'custom') {
    const customStart = customFrom ? new Date(`${customFrom}T00:00:00`) : from
    const customEnd = customTo ? new Date(`${customTo}T23:59:59.999`) : to
    return { from: customStart.toISOString(), to: customEnd.toISOString() }
  }
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Local calendar YYYY-MM-DD for API date filters (avoids UTC day shift). */
export function toLocalYmd(value?: string | Date | null) {
  if (!value) return undefined
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function previousRange(from?: string, to?: string) {
  if (!from || !to) return { from: undefined, to: undefined }
  const start = new Date(from)
  const end = new Date(to)
  const duration = end.getTime() - start.getTime() + 1
  return { from: new Date(start.getTime() - duration).toISOString(), to: new Date(start.getTime() - 1).toISOString() }
}

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
}

export function validTransitions(status: string) {
  return STATUS_TRANSITIONS[normalize(status)] ?? []
}

export function matchesOrder(order: PosOrder, search: string) {
  const needle = search.trim().toLowerCase()
  if (!needle) return true
  return [order.orderNumber, order.customer?.name, order.customer?.phone, order.customer?.email, ...order.items.map((item) => item.name)]
    .some((value) => value?.toLowerCase().includes(needle))
}
