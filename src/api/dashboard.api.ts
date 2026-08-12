import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

export interface DashboardStats {
  stats: {
    revenue: { value: number; change: number }
    orders: { value: number; change: number }
    customers: { value: number; change: number }
    avgOrder: { value: number; change: number }
    profit: { value: number; change: number }
    expense: { value: number; change: number }
  }
  revenueChart: Array<{ name: string; revenue: number; orders: number }>
  topProducts: Array<{ rank: number; name: string; sold: number; revenue: number }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    type: string
    status: string
    total: number
    customer: string
    table: string | null
    createdAt: string
    itemCount: number
  }>
  tables: { total: number; occupied: number; available: number; reserved: number }
  kitchenQueue: number
  activities: Array<{
    id: string
    action: string
    module: string
    message: string
    createdAt: string
    tenantId?: string
    restaurantId?: string
  }>
}

export const dashboardApi = {
  getStats: (tenantId?: string) =>
    unwrap(apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats', {
      params: tenantId ? { tenantId } : undefined,
    })),
}
