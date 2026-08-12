import { describe, expect, it } from 'vitest'
import type { PosOrder } from '@/api/types/pos.types'
import { getDateRange, matchesOrder, orderItemSummary, validTransitions } from './order-utils'

const order = {
  id: '1', orderNumber: 'ORD-1042', type: 'DINE_IN', status: 'PENDING', subtotal: 500, gstAmount: 0, sgstAmount: 0, cgstAmount: 0,
  serviceCharge: 0, discount: 0, voucherDiscount: 0, total: 500, tax: 0, customer: { id: 'c1', name: 'Asha Rao', email: 'asha@example.com', phone: '9999999999' },
  items: [{ id: 'i1', name: 'Margherita Pizza', quantity: 2, price: 200, total: 400, modifiers: [] }, { id: 'i2', name: 'Coke', quantity: 1, price: 100, total: 100, modifiers: [] }],
  createdAt: '2026-08-10T10:00:00.000Z', updatedAt: '2026-08-10T10:00:00.000Z',
} as PosOrder

describe('order utilities', () => {
  it('searches customer identity and item names', () => {
    expect(matchesOrder(order, 'asha@example')).toBe(true)
    expect(matchesOrder(order, 'pizza')).toBe(true)
    expect(matchesOrder(order, 'missing')).toBe(false)
  })
  it('creates a readable item summary', () => expect(orderItemSummary(order)).toBe('2× Margherita Pizza, 1× Coke'))
  it('only exposes valid order transitions', () => {
    expect(validTransitions('PENDING')).toEqual(['confirmed', 'cancelled'])
    expect(validTransitions('CONFIRMED')).toEqual(['preparing', 'cancelled'])
  })
  it('builds an inclusive yesterday range', () => {
    const range = getDateRange('yesterday', new Date('2026-08-10T12:00:00'))
    expect(new Date(range.from!).getDate()).toBe(9)
    expect(new Date(range.to!).getDate()).toBe(9)
  })
})
