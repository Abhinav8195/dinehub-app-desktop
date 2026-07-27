import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

export const reportsApi = {
  sales: (period: 'daily' | 'weekly' | 'monthly' = 'daily') =>
    unwrap(
      apiClient.get<ApiResponse<Record<string, unknown>>>('/reports/sales', {
        params: { period },
      }),
    ),

  export: async (format: 'csv' | 'xlsx' | 'pdf', from?: string, to?: string) => {
    const response = await apiClient.get('/reports/export', {
      params: { format, from, to },
      responseType: 'blob',
    })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `sales-report.${format}`
    return { blob: response.data as Blob, filename }
  },
}
