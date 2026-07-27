import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type { CreateTableRequest, TableDto } from './types/pos.types'

export const tablesApi = {
  list: () =>
    unwrap(apiClient.get<ApiResponse<TableDto[]>>('/tables')),

  create: (body: CreateTableRequest) =>
    unwrap(apiClient.post<ApiResponse<TableDto>>('/tables', body)),

  updateStatus: (id: string, status: string) =>
    unwrap(
      apiClient.patch<ApiResponse<TableDto>>(`/tables/${id}/status`, { status }),
    ),

  transfer: (id: string, body: { targetTableId: string; orderId?: string }) =>
    unwrap(apiClient.post<ApiResponse<TableDto>>(`/tables/${id}/transfer`, body)),

  merge: (body: { sourceTableIds: string[]; targetTableId: string }) =>
    unwrap(apiClient.post<ApiResponse<TableDto>>('/tables/merge', body)),
}
