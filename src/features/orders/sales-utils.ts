import type { PosOrder } from '@/api/types/pos.types'
import { normalize } from './order-utils'

export interface SalesMetrics {
  grossSales: number; netSales: number; totalOrders: number; averageOrderValue: number
  completedOrders: number; cancelledOrders: number; refunds: number; discounts: number
  newCustomers: number; returningCustomers: number
}

export function aggregateSales(orders: PosOrder[]): SalesMetrics {
  const valid = orders.filter((order) => normalize(order.status) !== 'cancelled')
  const grossSales = valid.reduce((sum, order) => sum + order.subtotal, 0)
  const discounts = valid.reduce((sum, order) => sum + Number(order.discount || 0) + Number(order.voucherDiscount || 0), 0)
  const refunds = orders.reduce((sum, order) => sum + Number(order.refundAmount || (normalize(order.status) === 'refunded' ? order.total : 0)), 0)
  const netSales = valid.reduce((sum, order) => sum + order.total, 0) - refunds
  const customers = new Map<string, number>()
  orders.forEach((order) => { if (order.customer?.id) customers.set(order.customer.id, (customers.get(order.customer.id) ?? 0) + 1) })
  return {
    grossSales, netSales, totalOrders: orders.length,
    averageOrderValue: valid.length ? netSales / valid.length : 0,
    completedOrders: orders.filter((order) => normalize(order.status) === 'completed').length,
    cancelledOrders: orders.filter((order) => normalize(order.status) === 'cancelled').length,
    refunds, discounts,
    newCustomers: [...customers.values()].filter((count) => count === 1).length,
    returningCustomers: [...customers.values()].filter((count) => count > 1).length,
  }
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

export function salesSeries(orders: PosOrder[]) {
  const buckets = new Map<string, { name: string; sales: number; orders: number }>()
  orders.forEach((order) => {
    const date = new Date(order.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const bucket = buckets.get(key) ?? { name: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date), sales: 0, orders: 0 }
    bucket.orders += 1
    if (normalize(order.status) !== 'cancelled') bucket.sales += order.total
    buckets.set(key, bucket)
  })
  return [...buckets.entries()].sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()).map(([, value]) => value)
}

export function groupRevenue(orders: PosOrder[], getKey: (order: PosOrder) => string | null | undefined) {
  const groups = new Map<string, number>()
  orders.filter((order) => normalize(order.status) !== 'cancelled').forEach((order) => {
    const key = normalize(getKey(order)) || 'not-specified'
    groups.set(key, (groups.get(key) ?? 0) + order.total)
  })
  return [...groups].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function itemRankings(orders: PosOrder[]) {
  const items = new Map<string, { name: string; quantity: number; revenue: number }>()
  orders.filter((order) => normalize(order.status) !== 'cancelled').forEach((order) => order.items.forEach((item) => {
    const row = items.get(item.name) ?? { name: item.name, quantity: 0, revenue: 0 }
    row.quantity += item.quantity; row.revenue += item.total; items.set(item.name, row)
  }))
  return [...items.values()].sort((a, b) => b.quantity - a.quantity)
}

export function hourlyOrders(orders: PosOrder[]) {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, orders: 0 }))
  orders.forEach((order) => { hours[new Date(order.createdAt).getHours()].orders += 1 })
  return hours
}
