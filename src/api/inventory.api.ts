import apiClient, { unwrap, unwrapPaginated } from './client'
import type { ApiResponse, PaginatedResponse, PaginationParams } from './types/common'
import type {
  InventoryAlert, InventoryDashboard, InventoryItem, InventoryItemInput, InventoryLog, PurchaseOrder,
  StockTransfer, Supplier, SupplierInput, Warehouse, WarehouseInput,
} from './types/management.types'
import { normalizeApiData } from './management-utils'

type Id = string
type Params = PaginationParams & { [key: string]: string | number | boolean | undefined }
const one = async <T>(request: Promise<{ data: ApiResponse<T> }>) => normalizeApiData(await unwrap(request))
const page = async <T>(request: Promise<{ data: ApiResponse<T[]> }>): Promise<PaginatedResponse<T>> => {
  const result = await unwrapPaginated(request)
  return normalizeApiData({ data: result.data, meta: result.meta! })
}
const listOrPage = async <T>(request: Promise<{ data: ApiResponse<T[]> }>): Promise<T[]> => normalizeApiData(await unwrap(request))

export const inventoryKeys = {
  all: ['inventory'] as const,
  dashboard: (expiryDays: number) => ['inventory', 'dashboard', expiryDays] as const,
  items: (params?: Params) => ['inventory', 'items', params ?? {}] as const,
  item: (id: Id) => ['inventory', 'item', id] as const,
  warehouses: () => ['inventory', 'warehouses'] as const,
  warehouse: (id: Id) => ['inventory', 'warehouse', id] as const,
  transfers: (params?: Params) => ['inventory', 'transfers', params ?? {}] as const,
  logs: (params?: Params) => ['inventory', 'logs', params ?? {}] as const,
  suppliers: () => ['inventory', 'suppliers'] as const,
  purchaseOrders: (params?: Params) => ['inventory', 'purchase-orders', params ?? {}] as const,
  alerts: (params?: Params) => ['inventory', 'alerts', params ?? {}] as const,
}

export const inventoryApi = {
  dashboard: (expiryDays = 30) => one(apiClient.get<ApiResponse<InventoryDashboard>>('/inventory/dashboard', { params: { expiryDays } })),
  listWarehouses: () => listOrPage(apiClient.get<ApiResponse<Warehouse[]>>('/inventory/warehouses')),
  getWarehouse: (id: Id) => one(apiClient.get<ApiResponse<Warehouse>>(`/inventory/warehouses/${id}`)),
  createWarehouse: (body: WarehouseInput) => one(apiClient.post<ApiResponse<Warehouse>>('/inventory/warehouses', { ...body, code: body.code.toUpperCase() })),
  updateWarehouse: (id: Id, body: Partial<WarehouseInput>) => one(apiClient.patch<ApiResponse<Warehouse>>(`/inventory/warehouses/${id}`, { ...body, ...(body.code ? { code: body.code.toUpperCase() } : {}) })),
  deleteWarehouse: (id: Id) => one(apiClient.delete<ApiResponse<Warehouse>>(`/inventory/warehouses/${id}`)),

  listItems: (params: Params = {}) => page(apiClient.get<ApiResponse<InventoryItem[]>>('/inventory/items', { params })),
  getItem: (id: Id) => one(apiClient.get<ApiResponse<InventoryItem>>(`/inventory/items/${id}`)),
  lookupBarcode: (barcode: string) => one(apiClient.get<ApiResponse<InventoryItem>>(`/inventory/items/barcode/${encodeURIComponent(barcode)}`)),
  createItem: (body: InventoryItemInput) => one(apiClient.post<ApiResponse<InventoryItem>>('/inventory/items', body)),
  updateItem: (id: Id, body: Partial<InventoryItemInput>) => one(apiClient.patch<ApiResponse<InventoryItem>>(`/inventory/items/${id}`, body)),
  deleteItem: (id: Id) => one(apiClient.delete<ApiResponse<InventoryItem>>(`/inventory/items/${id}`)),
  adjustStock: (id: Id, body: { mode: 'SET'|'INCREMENT'|'DECREMENT'; quantity: number; reason: string; notes?: string; referenceNumber?: string }) =>
    one(apiClient.post<ApiResponse<{ item: InventoryItem; log: InventoryLog }>>(`/inventory/items/${id}/adjustments`, body)),

  listTransfers: (params: Params = {}) => page(apiClient.get<ApiResponse<StockTransfer[]>>('/inventory/transfers', { params })),
  getTransfer: (id: Id) => one(apiClient.get<ApiResponse<StockTransfer>>(`/inventory/transfers/${id}`)),
  createTransfer: (body: { fromWarehouseId: Id; toWarehouseId: Id; inventoryItemId: Id; quantity: number; notes?: string }, immediate = true) =>
    one(apiClient.post<ApiResponse<StockTransfer>>('/inventory/transfers', body, { params: { immediate } })),
  updateTransferStatus: (id: Id, status: StockTransfer['status'], notes?: string) =>
    one(apiClient.patch<ApiResponse<StockTransfer>>(`/inventory/transfers/${id}/status`, { status, notes })),
  listLogs: (params: Params = {}) => page(apiClient.get<ApiResponse<InventoryLog[]>>('/inventory/logs', { params })),

  listSuppliers: () => listOrPage(apiClient.get<ApiResponse<Supplier[]>>('/inventory/suppliers')),
  getSupplier: (id: Id) => one(apiClient.get<ApiResponse<Supplier>>(`/inventory/suppliers/${id}`)),
  createSupplier: (body: SupplierInput) => one(apiClient.post<ApiResponse<Supplier>>('/inventory/suppliers', body)),
  updateSupplier: (id: Id, body: Partial<SupplierInput>) => one(apiClient.patch<ApiResponse<Supplier>>(`/inventory/suppliers/${id}`, body)),
  deleteSupplier: (id: Id) => one(apiClient.delete<ApiResponse<Supplier>>(`/inventory/suppliers/${id}`)),

  listPurchaseOrders: (params: Params = {}) => page(apiClient.get<ApiResponse<PurchaseOrder[]>>('/inventory/purchase-orders', { params })),
  getPurchaseOrder: (id: Id) => one(apiClient.get<ApiResponse<PurchaseOrder>>(`/inventory/purchase-orders/${id}`)),
  createPurchaseOrder: (body: { supplierId: Id; warehouseId: Id; expectedDate?: string; notes?: string; items: Array<{ inventoryItemId: Id; quantity: number; costPerUnit: number }> }) =>
    one(apiClient.post<ApiResponse<PurchaseOrder>>('/inventory/purchase-orders', body)),
  updatePurchaseOrder: (id: Id, body: Partial<PurchaseOrder>) => one(apiClient.patch<ApiResponse<PurchaseOrder>>(`/inventory/purchase-orders/${id}`, body)),
  updatePurchaseOrderStatus: (id: Id, status: PurchaseOrder['status']) => one(apiClient.patch<ApiResponse<PurchaseOrder>>(`/inventory/purchase-orders/${id}/status`, { status })),
  deletePurchaseOrder: (id: Id) => one(apiClient.delete<ApiResponse<PurchaseOrder>>(`/inventory/purchase-orders/${id}`)),
  receivePurchaseOrder: (id: Id, body: { invoiceNumber?: string; receivedAt: string; items: Array<{ purchaseOrderItemId: Id; receivedQuantity: number; batchNumber?: string; expiryDate?: string; costPerUnit?: number }> }) =>
    one(apiClient.post<ApiResponse<PurchaseOrder>>(`/inventory/purchase-orders/${id}/receive`, body)),

  listAlerts: (params: Params = {}) => page(apiClient.get<ApiResponse<InventoryAlert[]>>('/inventory/alerts', { params })),
  acknowledgeAlert: (id: Id) => one(apiClient.patch<ApiResponse<InventoryAlert>>(`/inventory/alerts/${id}/acknowledge`)),
  resolveAlert: (id: Id) => one(apiClient.patch<ApiResponse<InventoryAlert>>(`/inventory/alerts/${id}/resolve`)),
  export: () => one(apiClient.get<ApiResponse<{ filename: string; content: string }>>('/inventory/export', { params: { format: 'csv' } })),
}
