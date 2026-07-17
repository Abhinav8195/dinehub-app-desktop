import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

export const inventoryApi = {
  listWarehouses: () =>
    unwrap(apiClient.get<ApiResponse<unknown[]>>('/inventory/warehouses')),

  createWarehouse: (data: { name: string; location?: string; isDefault?: boolean }) =>
    unwrap(apiClient.post<ApiResponse<unknown>>('/inventory/warehouses', data)),

  listItems: (lowStockOnly = false) =>
    unwrap(
      apiClient.get<ApiResponse<unknown[]>>('/inventory/items', {
        params: lowStockOnly ? { lowStock: true } : undefined,
      }),
    ),

  createItem: (data: Record<string, unknown>) =>
    unwrap(apiClient.post<ApiResponse<unknown>>('/inventory/items', data)),

  adjustStock: (id: string, quantity: number, notes?: string) =>
    unwrap(
      apiClient.patch<ApiResponse<unknown>>(`/inventory/items/${id}/adjust`, {
        quantity,
        notes,
      }),
    ),

  listLogs: () =>
    unwrap(apiClient.get<ApiResponse<unknown[]>>('/inventory/logs')),
}
