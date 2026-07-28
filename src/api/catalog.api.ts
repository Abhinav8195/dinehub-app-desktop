import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type {
  Combo, ComboBody, ModifierGroup, ModifierGroupBody, ModifierOption, ModifierOptionBody
} from './types/catalog.types'

export const modifiersApi = {
  listGroups: () => unwrap(apiClient.get<ApiResponse<ModifierGroup[]>>('/modifiers/groups')),
  getGroup: (id: string) => unwrap(apiClient.get<ApiResponse<ModifierGroup>>(`/modifiers/groups/${id}`)),
  createGroup: (body: ModifierGroupBody) =>
    unwrap(apiClient.post<ApiResponse<ModifierGroup>>('/modifiers/groups', body)),
  updateGroup: (id: string, body: Partial<ModifierGroupBody>) =>
    unwrap(apiClient.patch<ApiResponse<ModifierGroup>>(`/modifiers/groups/${id}`, body)),
  deleteGroup: (id: string) => unwrap(apiClient.delete<ApiResponse<null>>(`/modifiers/groups/${id}`)),
  createOption: (groupId: string, body: ModifierOptionBody) =>
    unwrap(apiClient.post<ApiResponse<ModifierOption>>(`/modifiers/groups/${groupId}/options`, body)),
  updateOption: (id: string, body: Partial<ModifierOptionBody>) =>
    unwrap(apiClient.patch<ApiResponse<ModifierOption>>(`/modifiers/options/${id}`, body)),
  deleteOption: (id: string) => unwrap(apiClient.delete<ApiResponse<null>>(`/modifiers/options/${id}`)),
  attachToMenuItem: (groupId: string, menuItemId: string) =>
    unwrap(apiClient.post<ApiResponse<null>>(`/modifiers/groups/${groupId}/menu-items/${menuItemId}`)),
  detachFromMenuItem: (groupId: string, menuItemId: string) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`/modifiers/groups/${groupId}/menu-items/${menuItemId}`)),
}

export const combosApi = {
  list: (all = false) => unwrap(apiClient.get<ApiResponse<Combo[]>>('/combos', {
    params: all ? { all: true } : undefined
  })),
  get: (id: string) => unwrap(apiClient.get<ApiResponse<Combo>>(`/combos/${id}`)),
  create: (body: ComboBody) => unwrap(apiClient.post<ApiResponse<Combo>>('/combos', body)),
  update: (id: string, body: Partial<ComboBody>) =>
    unwrap(apiClient.patch<ApiResponse<Combo>>(`/combos/${id}`, body)),
  delete: (id: string) => unwrap(apiClient.delete<ApiResponse<null>>(`/combos/${id}`)),
}
