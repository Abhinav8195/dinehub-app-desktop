import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

type Entity = Record<string, unknown>

const get = <T = Entity>(url: string, params?: Entity): Promise<T> =>
  unwrap(apiClient.get<ApiResponse<T>>(url, { params }))
const create = <T = Entity>(url: string, body: Entity): Promise<T> =>
  unwrap(apiClient.post<ApiResponse<T>>(url, body))
const remove = (url: string) => unwrap(apiClient.delete<ApiResponse<unknown>>(url))
const list = <T = Entity>(url: string, params?: Entity): Promise<T[]> =>
  unwrap(apiClient.get<ApiResponse<T[]>>(url, { params }))

export type SyncMutation = {
  resource: 'orders' | 'customers'
  operation: 'create' | 'update'
  key: string
  payload: Record<string, unknown>
}

export const invitesApi = {
  listDepartments: () => list<string>('/users/departments'),
  list: () => list('/users/invites'),
  create: (body: {
    email: string
    firstName: string
    lastName: string
    department?: string
    userType?: string
    roleId?: string
    branchId?: string
  }) => create('/users/invites', body),
  revoke: (id: string) => remove(`/users/invites/${id}`),
  accept: (token: string, password?: string) => create('/invites/accept', { token, password }),
}

export const accountingApi = {
  summary: (from?: string, to?: string) => get('/accounting/summary', { from, to }),
  ledger: (from?: string, to?: string) => list('/accounting/ledger', { from, to }),
  profitLoss: (from?: string, to?: string) => get('/accounting/profit-loss', { from, to }),
}

export const analyticsApi = {
  get: (from?: string, to?: string) => get('/analytics', { from, to }),
}

export const syncApi = {
  push: (mutations: SyncMutation[]) => create('/sync/push', { mutations }),
  pull: (cursor?: string) => get('/sync/pull', { cursor }),
}

export const billingApi = {
  subscription: () => get('/billing/subscription'),
  generateInvoice: () => create('/billing/invoices/generate', {}),
  checkout: (provider: 'razorpay' | 'stripe') => create('/billing/checkout', { provider }),
}
