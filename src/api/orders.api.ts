import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type {
  CreateOrderRequest,
  OrderTotalsPreview,
  PosOrder,
} from './types/pos.types'

export const ordersApi = {
  list: (status?: string) =>
    unwrap(
      apiClient.get<ApiResponse<PosOrder[]>>('/orders', {
        params: status ? { status } : undefined,
      }),
    ),

  get: (id: string) =>
    unwrap(apiClient.get<ApiResponse<PosOrder>>(`/orders/${id}`)),

  previewTotals: (subtotal: number, voucherCode?: string) =>
    unwrap(
      apiClient.get<ApiResponse<OrderTotalsPreview>>('/orders/preview-totals', {
        params: { subtotal, voucherCode },
      }),
    ),

  create: (body: CreateOrderRequest) =>
    unwrap(apiClient.post<ApiResponse<PosOrder>>('/orders', body)),

  updateStatus: (id: string, status: string) =>
    unwrap(
      apiClient.patch<ApiResponse<PosOrder>>(`/orders/${id}/status`, { status }),
    ),
}
