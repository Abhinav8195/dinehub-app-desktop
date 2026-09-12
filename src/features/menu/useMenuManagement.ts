import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryService, menuItemService } from '@/api/menu.api'
import type {
  BulkAvailabilityBody, CreateCategoryBody, CreateMenuItemBody,
  UpdateCategoryBody, UpdateMenuItemBody
} from '@/api/types/menu.types'

/**
 * Load the full catalog once, then filter by category in-memory.
 * Category clicks must not hit the API again (was amplifying 429s on shared Wi‑Fi).
 */
export function useMenuManagement(categoryId: string | null, showInactive: boolean) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['menu'] })

  const categories = useQuery({
    queryKey: ['menu', 'categories', showInactive],
    queryFn: () => categoryService.list(showInactive),
    staleTime: 60_000,
  })
  const itemsQuery = useQuery({
    queryKey: ['menu', 'items', 'catalog', showInactive],
    queryFn: () => menuItemService.list(undefined, showInactive),
    staleTime: 60_000,
  })

  const filteredItems = useMemo(() => {
    const all = itemsQuery.data ?? []
    if (!categoryId) return all
    return all.filter((item) => item.categoryId === categoryId)
  }, [itemsQuery.data, categoryId])

  const items = {
    ...itemsQuery,
    data: itemsQuery.data ? filteredItems : undefined,
  }

  const mutation = <TVariables>(fn: (variables: TVariables) => Promise<unknown>) =>
    useMutation({ mutationFn: fn, onSuccess: invalidate })

  return {
    categories,
    items,
    refresh: () => Promise.all([categories.refetch(), itemsQuery.refetch()]),
    createCategory: mutation<CreateCategoryBody>(categoryService.create),
    updateCategory: mutation<{ id: string; body: UpdateCategoryBody }>(
      ({ id, body }) => categoryService.update(id, body)
    ),
    deleteCategory: mutation<string>(categoryService.delete),
    createItem: mutation<CreateMenuItemBody>(menuItemService.create),
    updateItem: mutation<{ id: string; body: UpdateMenuItemBody }>(
      ({ id, body }) => menuItemService.update(id, body)
    ),
    deleteItem: mutation<string>(menuItemService.delete),
    bulkToggle: mutation<BulkAvailabilityBody>(menuItemService.bulkToggle)
  }
}
