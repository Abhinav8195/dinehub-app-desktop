import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type { CreateCustomerRequest, PosCustomer } from './types/pos.types'

export const customersApi = {
  list: (search?: string) =>
    unwrap(
      apiClient.get<ApiResponse<PosCustomer[]>>('/customers', {
        params: search ? { search } : undefined,
      }),
    ),

  get: (id: string) =>
    unwrap(apiClient.get<ApiResponse<PosCustomer>>(`/customers/${id}`)),

  findByPhone: (phone: string) =>
    unwrap(apiClient.get<ApiResponse<PosCustomer | null>>(`/customers/phone/${encodeURIComponent(phone)}`)),

  create: (body: CreateCustomerRequest) =>
    unwrap(apiClient.post<ApiResponse<PosCustomer>>('/customers', body)),

  update: (id: string, body: Partial<CreateCustomerRequest>) =>
    unwrap(apiClient.patch<ApiResponse<PosCustomer>>(`/customers/${id}`, body)),
}
