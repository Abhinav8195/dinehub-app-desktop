import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type { MenuCategory, MenuItemDto } from './types/pos.types'

export const menuApi = {
  listCategories: (all = false) =>
    unwrap(
      apiClient.get<ApiResponse<MenuCategory[]>>('/menu/categories', {
        params: all ? { all: true } : undefined,
      }),
    ),

  createCategory: (data: { name: string; icon?: string; sortOrder?: number }) =>
    unwrap(apiClient.post<ApiResponse<MenuCategory>>('/menu/categories', data)),

  updateCategory: (id: string, data: Partial<{ name: string; icon: string; sortOrder: number; isActive: boolean }>) =>
    unwrap(apiClient.put<ApiResponse<MenuCategory>>(`/menu/categories/${id}`, data)),

  deleteCategory: (id: string) =>
    unwrap(apiClient.delete<ApiResponse<unknown>>(`/menu/categories/${id}`)),

  listItems: (categoryId?: string, all = false) =>
    unwrap(
      apiClient.get<ApiResponse<MenuItemDto[]>>('/menu/items', {
        params: { ...(categoryId ? { categoryId } : {}), ...(all ? { all: true } : {}) },
      }),
    ),

  createItem: (data: {
    categoryId: string
    name: string
    price: number
    description?: string
    imageUrl?: string
    isAvailable?: boolean
    isPopular?: boolean
  }) => unwrap(apiClient.post<ApiResponse<MenuItemDto>>('/menu/items', data)),

  updateItem: (id: string, data: Partial<{
    categoryId: string
    name: string
    price: number
    description: string
    imageUrl: string
    isAvailable: boolean
    isPopular: boolean
  }>) => unwrap(apiClient.put<ApiResponse<MenuItemDto>>(`/menu/items/${id}`, data)),

  deleteItem: (id: string) =>
    unwrap(apiClient.delete<ApiResponse<unknown>>(`/menu/items/${id}`)),

  bulkToggle: (ids: string[], isAvailable: boolean) =>
    unwrap(
      apiClient.patch<ApiResponse<unknown>>('/menu/items/bulk-toggle', {
        ids,
        isAvailable,
      }),
    ),
}
