import apiClient, { unwrap } from './client'
import type { ApiResponse } from './types/common'
import type {
  BulkAvailabilityBody, Category, CreateCategoryBody, CreateMenuItemBody,
  MenuItem, MenuItemVariant, MenuItemVariantInput, UpdateCategoryBody, UpdateMenuItemBody
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
  isVegetarian: item.isVegetarian ?? (item.dietary === 'veg' ? true : item.dietary === 'nonveg' ? false : null),
  dietary: item.dietary ?? (item.isVegetarian === true ? 'veg' : item.isVegetarian === false ? 'nonveg' : null),
  modifierGroups: item.modifierGroups ?? [],
  recipeLines: item.recipeLines ?? [],
  ...(item.hasVariants !== undefined || item.variants !== undefined ? {
    hasVariants: item.hasVariants ?? Boolean(item.variants?.length),
    variants: (item.variants ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder)
  } : {})
})

/** Update DTO rejects nested `variants` — manage them via dedicated endpoints. */
function itemWriteBody(body: CreateMenuItemBody | UpdateMenuItemBody, { allowVariants }: { allowVariants: boolean }) {
  const { variants, ...rest } = body
  return {
    ...rest,
    isAvailable: body.isAvailable,
    isPopular: body.isPopular,
    ...(body.recipeLines !== undefined ? { recipeLines: body.recipeLines } : {}),
    ...(allowVariants && body.hasVariants && variants?.length ? { variants } : {}),
  }
}

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
    await unwrap(apiClient.post<ApiResponse<MenuItem>>('/menu/items', itemWriteBody(body, { allowVariants: true })))
  ),
  update: async (id: string, body: UpdateMenuItemBody) => mapMenuItem(
    await unwrap(apiClient.put<ApiResponse<MenuItem>>(`/menu/items/${id}`, itemWriteBody(body, { allowVariants: false })))
  ),
  delete: (id: string) => unwrap(apiClient.delete<ApiResponse<null>>(`/menu/items/${id}`)),
  bulkToggle: (body: BulkAvailabilityBody) =>
    unwrap(apiClient.patch<ApiResponse<null>>('/menu/items/bulk-toggle', body)),
  createVariant: (itemId: string, body: MenuItemVariantInput) =>
    unwrap(apiClient.post<ApiResponse<MenuItemVariant>>(`/menu/items/${itemId}/variants`, body)),
  updateVariant: (itemId: string, variantId: string, body: Partial<MenuItemVariantInput>) =>
    unwrap(apiClient.patch<ApiResponse<MenuItemVariant>>(`/menu/items/${itemId}/variants/${variantId}`, body)),
  deleteVariant: (itemId: string, variantId: string) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`/menu/items/${itemId}/variants/${variantId}`)),
  /** Sync draft variants after a menu-item update (create / patch / delete). */
  syncVariants: async (itemId: string, existing: MenuItemVariant[] = [], drafts: MenuItemVariantInput[]) => {
    const kept = new Set(drafts.map((v) => v.id).filter(Boolean) as string[])
    for (const variant of existing) {
      if (!kept.has(variant.id)) await menuItemService.deleteVariant(itemId, variant.id)
    }
    for (const draft of drafts) {
      const body = {
        name: draft.name,
        price: draft.price,
        discountedPrice: draft.discountedPrice ?? null,
        isAvailable: draft.isAvailable,
        isDefault: draft.isDefault,
        sortOrder: draft.sortOrder,
      }
      if (draft.id) await menuItemService.updateVariant(itemId, draft.id, body)
      else await menuItemService.createVariant(itemId, body)
    }
  },
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
