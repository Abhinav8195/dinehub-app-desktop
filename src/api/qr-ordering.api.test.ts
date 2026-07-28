import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestDineHub = vi.fn()

vi.stubGlobal('window', {
  electronAPI: {
    requestDineHub,
    hasSession: vi.fn(),
    clearTokens: vi.fn(),
    getTenantSlug: vi.fn(),
    setTenantSlug: vi.fn(),
    getDeviceId: vi.fn(),
  },
})

import { qrOrderingApi, waiterRequestsApi } from './qr-ordering.api'

const ok = (data: unknown) => ({
  ok: true,
  payload: { success: true, message: 'OK', data },
})

describe('QR ordering APIs', () => {
  beforeEach(() => requestDineHub.mockReset())

  it('uses secure QR management endpoints', async () => {
    requestDineHub
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(ok({ id: 'qr-1' }))
      .mockResolvedValueOnce(ok({ id: 'qr-1', isActive: false }))
      .mockResolvedValueOnce(ok({ id: 'qr-1', token: 'rotated' }))
      .mockResolvedValueOnce(ok({ qrDataUrl: 'data:image/png;base64,x' }))
      .mockResolvedValueOnce(ok({ id: 'qr-1' }))

    await qrOrderingApi.list()
    await qrOrderingApi.create({ tableId: 'table-1', label: 'Patio' })
    await qrOrderingApi.update('qr-1', { isActive: false })
    await qrOrderingApi.regenerate('qr-1')
    await qrOrderingApi.image('qr-1')
    await qrOrderingApi.remove('qr-1')

    expect(requestDineHub.mock.calls.map(([request]) => request)).toMatchObject([
      { method: 'GET', path: '/qr-codes' },
      { method: 'POST', path: '/qr-codes', body: { tableId: 'table-1', label: 'Patio' } },
      { method: 'PATCH', path: '/qr-codes/qr-1', body: { isActive: false } },
      { method: 'POST', path: '/qr-codes/qr-1/regenerate' },
      { method: 'GET', path: '/qr-codes/qr-1/image' },
      { method: 'DELETE', path: '/qr-codes/qr-1' },
    ])
  })

  it('lists and transitions waiter requests', async () => {
    requestDineHub
      .mockResolvedValueOnce(ok({ data: [], meta: { total: 0 } }))
      .mockResolvedValueOnce(ok({ id: 'wr-1', status: 'ACKNOWLEDGED' }))
      .mockResolvedValueOnce(ok({ id: 'wr-1', status: 'COMPLETED' }))
      .mockResolvedValueOnce(ok({ id: 'wr-2', status: 'CANCELLED' }))

    await waiterRequestsApi.list({ status: 'PENDING' })
    await waiterRequestsApi.acknowledge('wr-1')
    await waiterRequestsApi.complete('wr-1')
    await waiterRequestsApi.cancel('wr-2')

    expect(requestDineHub.mock.calls.map(([request]) => request)).toMatchObject([
      { method: 'GET', path: '/waiter-requests', query: { status: 'PENDING' } },
      { method: 'PATCH', path: '/waiter-requests/wr-1/acknowledge' },
      { method: 'PATCH', path: '/waiter-requests/wr-1/complete' },
      { method: 'PATCH', path: '/waiter-requests/wr-2/cancel' },
    ])
  })
})
