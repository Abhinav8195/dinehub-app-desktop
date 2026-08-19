import { describe, expect, it } from 'vitest'
import { toBackendOrderParams } from './orders.api'

describe('toBackendOrderParams', () => {
  it('maps UI period presets to backend period values', () => {
    expect(toBackendOrderParams({ period: 'yesterday' }).period).toBe('yesterday')
    expect(toBackendOrderParams({ period: 'last7' }).period).toBe('last_7_days')
    expect(toBackendOrderParams({ period: 'last30' }).period).toBe('last_30_days')
    expect(toBackendOrderParams({ period: 'month' }).period).toBe('this_month')
    expect(toBackendOrderParams({ period: 'all' }).period).toBe('all_time')
  })

  it('sends from_date/to_date for custom ranges and caps limit at 100', () => {
    const params = toBackendOrderParams({
      period: 'custom',
      fromDate: '2026-08-01',
      toDate: '2026-08-10',
      limit: 1000,
    })
    expect(params.period).toBe('custom')
    expect(params.from_date).toBe('2026-08-01')
    expect(params.to_date).toBe('2026-08-10')
    expect(params.limit).toBe(100)
  })

  it('derives custom dates from ISO from/to when period is missing', () => {
    const params = toBackendOrderParams({
      from: '2026-08-18T00:00:00.000Z',
      to: '2026-08-18T23:59:59.999Z',
    })
    expect(params.period).toBe('custom')
    expect(params.from_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(params.to_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
