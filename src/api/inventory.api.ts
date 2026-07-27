import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

export const inventoryApi = {
  listWarehouses: () =>
    unwrap(apiClient.get<ApiResponse<unknown[]>>('/inventory/warehouses')),

  createWarehouse: (data: { name: string; location?: string; isDefault?: boolean }) =>
    unwrap(apiClient.post<ApiResponse<unknown>>('/inventory/warehouses', data)),

  listItems: (lowStockOnly = false, itemType?: 'RAW' | 'FINISHED') =>
    unwrap(
      apiClient.get<ApiResponse<unknown[]>>('/inventory/items', {
        params: { ...(lowStockOnly ? { lowStock: true } : {}), ...(itemType ? { itemType } : {}) },
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

  transfer: (data: { fromWarehouseId: string; toWarehouseId: string; inventoryItemId: string; quantity: number; notes?: string }) =>
    unwrap(apiClient.post<ApiResponse<unknown>>('/inventory/transfers', data)),

  listTransfers: () =>
    unwrap(apiClient.get<ApiResponse<unknown[]>>('/inventory/transfers')),

  export: () =>
    unwrap(apiClient.get<ApiResponse<{ filename: string; content: string }>>('/inventory/export')),
}
