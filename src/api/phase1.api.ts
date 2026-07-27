import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

type Entity = Record<string, unknown>
type List<T = Entity> = Promise<T[]>

const list = <T = Entity>(url: string, params?: Entity): List<T> =>
  unwrap(apiClient.get<ApiResponse<T[]>>(url, { params }))
const get = <T = Entity>(url: string): Promise<T> =>
  unwrap(apiClient.get<ApiResponse<T>>(url))
const create = <T = Entity>(url: string, body: Entity): Promise<T> =>
  unwrap(apiClient.post<ApiResponse<T>>(url, body))
const update = <T = Entity>(url: string, body: Entity): Promise<T> =>
  unwrap(apiClient.patch<ApiResponse<T>>(url, body))
const remove = (url: string) => unwrap(apiClient.delete<ApiResponse<unknown>>(url))

export const branchesApi = {
  list: () => list('/branches'),
  get: (id: string) => get(`/branches/${id}`),
  create: (body: Entity) => create('/branches', body),
  update: (id: string, body: Entity) => update(`/branches/${id}`, body),
  setDefault: (id: string) => update(`/branches/${id}/default`, {}),
  delete: (id: string) => remove(`/branches/${id}`),
}

const staffApi = (resource: 'employees' | 'users') => ({
  list: () => list(`/${resource}`),
  get: (id: string) => get(`/${resource}/${id}`),
  create: (body: Entity) => create(`/${resource}`, body),
  update: (id: string, body: Entity) => update(`/${resource}/${id}`, body),
  updateStatus: (id: string, status: string) => update(`/${resource}/${id}/status`, { status }),
  delete: (id: string) => remove(`/${resource}/${id}`),
})
export const employeesApi = staffApi('employees')
export const usersApi = staffApi('users')
export const rolesApi = {
  list: () => list('/auth/roles'),
  permissions: () => list('/auth/permissions'),
}

export const reservationsApi = {
  list: () => list('/reservations'),
  get: (id: string) => get(`/reservations/${id}`),
  create: (body: Entity) => create('/reservations', body),
  update: (id: string, body: Entity) => update(`/reservations/${id}`, body),
  updateStatus: (id: string, status: string) => update(`/reservations/${id}/status`, { status }),
  delete: (id: string) => remove(`/reservations/${id}`),
}

export const vendorsApi = {
  list: () => list('/vendors'),
  create: (body: Entity) => create('/vendors', body),
  update: (id: string, body: Entity) => update(`/vendors/${id}`, body),
  delete: (id: string) => remove(`/vendors/${id}`),
}
export const purchasesApi = {
  list: () => list('/purchases'),
  get: (id: string) => get(`/purchases/${id}`),
  create: (body: Entity) => create('/purchases', body),
  cancel: (id: string) => update(`/purchases/${id}/cancel`, {}),
  listReceipts: () => list('/purchases/receipts'),
  createReceipt: (body: Entity) => create('/purchases/receipts', body),
  listReturns: () => list('/purchases/returns'),
  createReturn: (body: Entity) => create('/purchases/returns', body),
}

export const modifiersApi = {
  listGroups: () => list('/modifiers/groups'),
  createGroup: (body: Entity) => create('/modifiers/groups', body),
  updateGroup: (id: string, body: Entity) => update(`/modifiers/groups/${id}`, body),
  deleteGroup: (id: string) => remove(`/modifiers/groups/${id}`),
  createOption: (groupId: string, body: Entity) => create(`/modifiers/groups/${groupId}/options`, body),
  updateOption: (id: string, body: Entity) => update(`/modifiers/options/${id}`, body),
  deleteOption: (id: string) => remove(`/modifiers/options/${id}`),
  attachToMenuItem: (groupId: string, menuItemId: string) => create(`/modifiers/groups/${groupId}/menu-items/${menuItemId}`, {}),
}
export const combosApi = {
  list: () => list('/combos'),
  get: (id: string) => get(`/combos/${id}`),
  create: (body: Entity) => create('/combos', body),
  update: (id: string, body: Entity) => update(`/combos/${id}`, body),
  delete: (id: string) => remove(`/combos/${id}`),
}

export const qrApi = {
  list: () => list('/qr'),
  create: (body: Entity) => create('/qr', body),
  stats: () => get('/qr/stats'),
  download: (id: string) => get(`/qr/${id}/download`),
}
export const filesApi = {
  upload: async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return unwrap(apiClient.post<ApiResponse<Entity>>('/files/upload', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }))
  },
}

export const expensesApi = {
  list: () => list('/expenses'),
  get: (id: string) => get(`/expenses/${id}`),
  create: (body: Entity) => create('/expenses', body),
  update: (id: string, body: Entity) => update(`/expenses/${id}`, body),
  delete: (id: string) => remove(`/expenses/${id}`),
  listCategories: () => list('/expenses/categories'),
  createCategory: (body: Entity) => create('/expenses/categories', body),
  updateCategory: (id: string, body: Entity) => update(`/expenses/categories/${id}`, body),
  deleteCategory: (id: string) => remove(`/expenses/categories/${id}`),
}
export const offersApi = {
  list: () => list('/offers'),
  get: (id: string) => get(`/offers/${id}`),
  create: (body: Entity) => create('/offers', body),
  update: (id: string, body: Entity) => update(`/offers/${id}`, body),
  delete: (id: string) => remove(`/offers/${id}`),
  validate: (code: string, orderAmount?: number) => get(`/offers/validate/${code}${orderAmount == null ? '' : `?orderAmount=${orderAmount}`}`),
}
export const loyaltyApi = {
  earn: (body: Entity) => create('/loyalty/earn', body),
  redeem: (body: Entity) => create('/loyalty/redeem', body),
  adjust: (body: Entity) => create('/loyalty/adjust', body),
  listForCustomer: (customerId: string) => list(`/loyalty/customers/${customerId}`),
}
export const printersApi = {
  list: () => list('/printers'),
  get: (id: string) => get(`/printers/${id}`),
  create: (body: Entity) => create('/printers', body),
  update: (id: string, body: Entity) => update(`/printers/${id}`, body),
  delete: (id: string) => remove(`/printers/${id}`),
  test: (id: string) => create(`/printers/${id}/test`, {}),
}
export const campaignsApi = {
  list: () => list('/campaigns'),
  get: (id: string) => get(`/campaigns/${id}`),
  create: (body: Entity) => create('/campaigns', body),
  update: (id: string, body: Entity) => update(`/campaigns/${id}`, body),
  delete: (id: string) => remove(`/campaigns/${id}`),
  send: (id: string) => create(`/campaigns/${id}/send`, {}),
}
