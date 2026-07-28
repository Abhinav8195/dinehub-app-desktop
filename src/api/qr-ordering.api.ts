import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

export type QrTable = {
  id: string
  number: number
  floor: string
  status: string
}

export type QrCodeRecord = {
  id: string
  branchId?: string | null
  tableId: string
  token: string
  label?: string | null
  scanCount: number
  orderCount: number
  isActive: boolean
  expiresAt?: string | null
  publicUrl: string
  table?: QrTable | null
}

export type WaiterRequestType =
  | 'WAITER'
  | 'WATER'
  | 'BILL'
  | 'CLEAN_TABLE'
  | 'ASSISTANCE'
  | 'OTHER'

export type WaiterRequestStatus =
  | 'PENDING'
  | 'ACKNOWLEDGED'
  | 'COMPLETED'
  | 'CANCELLED'

export type WaiterRequest = {
  id: string
  tenantId: string
  branchId?: string | null
  tableId: string
  qrCodeId: string
  type: WaiterRequestType
  message?: string | null
  status: WaiterRequestStatus
  requestedAt: string
  acknowledgedAt?: string | null
  completedAt?: string | null
}

type WaiterListResponse = {
  data: WaiterRequest[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export const qrOrderingApi = {
  list: () =>
    unwrap(apiClient.get<ApiResponse<QrCodeRecord[]>>('/qr-codes')),

  create: (body: { tableId: string; branchId?: string; label?: string; expiresAt?: string }) =>
    unwrap(apiClient.post<ApiResponse<QrCodeRecord>>('/qr-codes', body)),

  update: (id: string, body: Partial<Pick<QrCodeRecord, 'label' | 'isActive' | 'tableId' | 'branchId' | 'expiresAt'>>) =>
    unwrap(apiClient.patch<ApiResponse<QrCodeRecord>>(`/qr-codes/${id}`, body)),

  remove: (id: string) =>
    unwrap(apiClient.delete<ApiResponse<{ id: string }>>(`/qr-codes/${id}`)),

  regenerate: (id: string) =>
    unwrap(apiClient.post<ApiResponse<QrCodeRecord>>(`/qr-codes/${id}/regenerate`)),

  image: (id: string) =>
    unwrap(apiClient.get<ApiResponse<{ publicUrl: string; qrDataUrl: string }>>(`/qr-codes/${id}/image`)),
}

export const waiterRequestsApi = {
  list: (params?: { status?: WaiterRequestStatus; branchId?: string; tableId?: string }) =>
    unwrap(apiClient.get<ApiResponse<WaiterListResponse>>('/waiter-requests', { params })),

  acknowledge: (id: string) =>
    unwrap(apiClient.patch<ApiResponse<WaiterRequest>>(`/waiter-requests/${id}/acknowledge`)),

  complete: (id: string) =>
    unwrap(apiClient.patch<ApiResponse<WaiterRequest>>(`/waiter-requests/${id}/complete`)),

  cancel: (id: string) =>
    unwrap(apiClient.patch<ApiResponse<WaiterRequest>>(`/waiter-requests/${id}/cancel`)),
}
