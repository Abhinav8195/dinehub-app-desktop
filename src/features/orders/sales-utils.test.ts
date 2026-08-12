import { describe, expect, it } from 'vitest'
import type { PosOrder } from '@/api/types/pos.types'
import { aggregateSales, itemRankings, percentChange } from './sales-utils'

const makeOrder = (overrides: Partial<PosOrder>): PosOrder => ({
  id: crypto.randomUUID(), orderNumber: 'O-1', type: 'TAKEAWAY', status: 'COMPLETED', subtotal: 100, gstAmount: 5, sgstAmount: 0, cgstAmount: 0,
  serviceCharge: 0, discount: 10, voucherDiscount: 0, total: 95, tax: 5, items: [{ id: 'i', name: 'Coffee', quantity: 2, price: 50, total: 100, modifiers: [] }],
  createdAt: '2026-08-10T10:00:00Z', updatedAt: '2026-08-10T10:00:00Z', ...overrides,
})

describe('sales aggregation', () => {
  it('excludes cancelled sales and includes refunds', () => {
    const metrics = aggregateSales([makeOrder({}), makeOrder({ status: 'CANCELLED' }), makeOrder({ status: 'REFUNDED', refundAmount: 95 })])
    expect(metrics.totalOrders).toBe(3)
    expect(metrics.cancelledOrders).toBe(1)
    expect(metrics.grossSales).toBe(200)
    expect(metrics.netSales).toBe(95)
    expect(metrics.refunds).toBe(95)
  })
  it('ranks items by sold quantity', () => {
    const result = itemRankings([makeOrder({}), makeOrder({ items: [{ id: 't', name: 'Tea', quantity: 1, price: 20, total: 20, modifiers: [] }] })])
    expect(result[0].name).toBe('Coffee')
  })
  it('compares equivalent periods safely', () => {
    expect(percentChange(120, 100)).toBe(20)
    expect(percentChange(10, 0)).toBe(100)
  })
})
