import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type { TaxSettings, UpdateTaxSettingsRequest } from './types/pos.types'

export const settingsApi = {
  getTax: () =>
    unwrap(apiClient.get<ApiResponse<TaxSettings>>('/settings/tax')),

  updateTax: (body: UpdateTaxSettingsRequest) =>
    unwrap(apiClient.put<ApiResponse<TaxSettings>>('/settings/tax', body)),

  getRestaurant: () =>
    unwrap(apiClient.get<ApiResponse<Record<string, unknown>>>('/settings/restaurant')),

  updateRestaurant: (body: Record<string, unknown>) =>
    unwrap(apiClient.put<ApiResponse<Record<string, unknown>>>('/settings/restaurant', body)),
}
