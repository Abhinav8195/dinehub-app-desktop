import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'

export const reportsApi = {
  sales: (period: 'daily' | 'weekly' | 'monthly' = 'daily') =>
    unwrap(
      apiClient.get<ApiResponse<Record<string, unknown>>>('/reports/sales', {
        params: { period },
      }),
    ),
}
