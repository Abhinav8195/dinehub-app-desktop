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
      responseType: 'arraybuffer',
    })
    const disposition = String(response.headers['content-disposition'] ?? '')
    const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
    const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
    const filename = decodeURIComponent(utf8Name ?? plainName ?? `sales-report.${format}`)
      .replace(/[\\/:\0]/g, '_')
    return {
      bytes: new Uint8Array(response.data as ArrayBuffer),
      filename,
      contentType: String(response.headers['content-type'] ?? 'application/octet-stream')
    }
  },
}
