import apiClient, { unwrap } from './client'
import type { ApiResponse, PaginationMeta } from './types/common'
import { ApiError } from './types/common'
import type {
  CreateOrderRequest,
  OrderTotalsPreview,
  PosOrder,
} from './types/pos.types'

export interface OrderListParams {
  search?: string
  from?: string
  to?: string
  status?: string
  paymentStatus?: string
  paymentMethod?: string
  type?: string
  branchId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface OrderListResult {
  orders: PosOrder[]
  meta?: PaginationMeta
}

type OrderListPayload = PosOrder[] | { orders?: PosOrder[]; data?: PosOrder[]; meta?: PaginationMeta }

async function requestOrders(params?: OrderListParams, signal?: AbortSignal): Promise<OrderListResult> {
  const response = await apiClient.get<ApiResponse<OrderListPayload>>('/orders', { params, signal })
  const result = await unwrap(Promise.resolve(response))
  const responseMeta = response.data.meta
  if (Array.isArray(result)) return { orders: result, meta: responseMeta }
  if (Array.isArray(result?.orders)) return { orders: result.orders, meta: result.meta ?? responseMeta }
  if (Array.isArray(result?.data)) return { orders: result.data, meta: result.meta ?? responseMeta }
  return { orders: [], meta: responseMeta }
}

export const ordersApi = {
  list: async (params?: OrderListParams, signal?: AbortSignal): Promise<OrderListResult> => {
    try {
      return await requestOrders(params, signal)
    } catch (error) {
      // Older DineHub deployments reject the new dashboard query parameters.
      // Fall back to the original endpoint shape; the screen applies the same
      // filters locally until server-side filtering is available.
      const canFallback = Boolean(params && Object.values(params).some((value) => value !== undefined)) &&
        error instanceof ApiError && error.statusCode >= 400 && error.statusCode !== 401 && error.statusCode !== 403
      if (!canFallback || signal?.aborted) throw error
      return requestOrders(undefined, signal)
    }
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
