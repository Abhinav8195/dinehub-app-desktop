import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type {
  CreateOrderRequest,
  OrderTotalsPreview,
  PosOrder,
} from './types/pos.types'

export const ordersApi = {
  list: async (status?: string): Promise<PosOrder[]> => {
    const result = await unwrap(
      apiClient.get<ApiResponse<PosOrder[] | { orders?: PosOrder[]; data?: PosOrder[] }>>('/orders', {
        params: status ? { status } : undefined,
      }),
    )
    if (Array.isArray(result)) return result
    if (Array.isArray(result?.orders)) return result.orders
    if (Array.isArray(result?.data)) return result.data
    return []
  },

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

  delete: (id: string, force = false) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`/orders/${id}`, {
      params: force ? { force: true } : undefined,
    })),
}
