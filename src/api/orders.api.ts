import apiClient, { unwrap } from './client'
import type { ApiResponse, PaginationMeta } from './types/common'
import { ApiError } from './types/common'
import type {
  CreateOrderRequest,
  OrderTotalsPreview,
  PosOrder,
} from './types/pos.types'

export type OrderPeriodPreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'month' | 'custom' | 'all'

export interface OrderListParams {
  search?: string
  /** ISO datetime — used for client-side filtering / local ranges */
  from?: string
  to?: string
  /** Prefer this for server filtering (maps to backend `period`) */
  period?: OrderPeriodPreset
  /** YYYY-MM-DD for custom period */
  fromDate?: string
  toDate?: string
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

const PERIOD_MAP: Record<OrderPeriodPreset, string> = {
  today: 'today',
  yesterday: 'yesterday',
  last7: 'last_7_days',
  last30: 'last_30_days',
  month: 'this_month',
  custom: 'custom',
  all: 'all_time',
}

function toYmd(isoOrDate?: string) {
  if (!isoOrDate) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate
  const date = new Date(isoOrDate)
  if (Number.isNaN(date.getTime())) return undefined
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Map UI filter params to the Nest OrderListQueryDto shape. */
export function toBackendOrderParams(params: OrderListParams = {}) {
  const periodKey = params.period
    ?? (params.from || params.to || params.fromDate || params.toDate ? 'custom' : undefined)
  const period = periodKey ? PERIOD_MAP[periodKey] : undefined
  const fromDate = params.fromDate || (period === 'custom' ? toYmd(params.from) : undefined)
  const toDate = params.toDate || (period === 'custom' ? toYmd(params.to) : undefined)
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100)

  return {
    period,
    from_date: fromDate,
    to_date: toDate,
    search: params.search,
    status: params.status,
    order_type: params.type,
    payment_status: params.paymentStatus,
    payment_method: params.paymentMethod
      ? String(params.paymentMethod).toUpperCase().replace(/-/g, '_')
      : undefined,
    branch_id: params.branchId,
    page: params.page ?? 1,
    limit,
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc',
  }
}

async function requestOrders(params?: OrderListParams, signal?: AbortSignal): Promise<OrderListResult> {
  const query = toBackendOrderParams(params ?? {})
  const response = await apiClient.get<ApiResponse<OrderListPayload>>('/orders', { params: query, signal })
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
      // Older DiningHub deployments reject the new dashboard query parameters.
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

  previewStock: (items: Array<{ menuItemId?: string; variantId?: string; quantity: number }>) =>
    unwrap(
      apiClient.post<ApiResponse<{
        ok: boolean
        shortages: Array<{
          inventoryItemId: string
          name: string
          unit: string
          required: number
          available: number
          shortBy: number
        }>
      }>>('/orders/preview-stock', { items }),
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
