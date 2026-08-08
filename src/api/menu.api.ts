import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type {
  BulkAvailabilityBody, Category, CreateCategoryBody, CreateMenuItemBody,
  MenuItem, UpdateCategoryBody, UpdateMenuItemBody
} from './types/menu.types'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://dininghub.in/api/v1'
const serverOrigin = new URL(apiBaseUrl).origin

export function resolveMenuImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  return new URL(imageUrl, serverOrigin).toString()
}

const mapCategory = (category: Category): Category => ({
  ...category,
  imageUrl: category.imageUrl ?? null
})

const mapMenuItem = (item: MenuItem): MenuItem => ({
  ...item,
  available: item.available,
  popular: item.popular,
  modifierGroups: item.modifierGroups ?? [],
  ...(item.hasVariants !== undefined || item.variants !== undefined ? {
    hasVariants: item.hasVariants ?? Boolean(item.variants?.length),
    variants: (item.variants ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
  } : {})
})

export const categoryService = {
  list: async (all = false) => (await unwrap(apiClient.get<ApiResponse<Category[]>>('/menu/categories', {
    params: all ? { all: true } : undefined
  }))).map(mapCategory),
  create: async (body: CreateCategoryBody) =>
    mapCategory(await unwrap(apiClient.post<ApiResponse<Category>>('/menu/categories', body))),
  update: async (id: string, body: UpdateCategoryBody) =>
    mapCategory(await unwrap(apiClient.put<ApiResponse<Category>>(`/menu/categories/${id}`, body))),
  delete: (id: string) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`/menu/categories/${id}`))
}

export const menuItemService = {
  list: async (categoryId?: string, all = false) => {
    const items = await unwrap(apiClient.get<ApiResponse<MenuItem[]>>('/menu/items', {
      params: { ...(categoryId ? { categoryId } : {}), ...(all ? { all: true } : {}) }
    }))
    return items.map(mapMenuItem)
  },
  get: async (id: string) => mapMenuItem(
    await unwrap(apiClient.get<ApiResponse<MenuItem>>(`/menu/items/${id}`))
  ),
  create: async (body: CreateMenuItemBody) => mapMenuItem(
    await unwrap(apiClient.post<ApiResponse<MenuItem>>('/menu/items', {
      ...body,
      // The write model intentionally uses isAvailable/isPopular.
      isAvailable: body.isAvailable,
      isPopular: body.isPopular
    }))
  ),
  update: async (id: string, body: UpdateMenuItemBody) => mapMenuItem(
    await unwrap(apiClient.put<ApiResponse<MenuItem>>(`/menu/items/${id}`, {
      ...body,
      isAvailable: body.isAvailable,
      isPopular: body.isPopular
    }))
  ),
  delete: (id: string) => unwrap(apiClient.delete<ApiResponse<null>>(`/menu/items/${id}`)),
  bulkToggle: (body: BulkAvailabilityBody) =>
    unwrap(apiClient.patch<ApiResponse<null>>('/menu/items/bulk-toggle', body))
}

// Compatibility facade for existing call sites.
export const menuApi = {
  listCategories: categoryService.list,
  createCategory: categoryService.create,
  updateCategory: categoryService.update,
  deleteCategory: categoryService.delete,
  listItems: menuItemService.list,
  getItem: menuItemService.get,
  createItem: menuItemService.create,
  updateItem: menuItemService.update,
  deleteItem: menuItemService.delete,
  bulkToggle: (ids: string[], isAvailable: boolean) => menuItemService.bulkToggle({ ids, isAvailable })
}
