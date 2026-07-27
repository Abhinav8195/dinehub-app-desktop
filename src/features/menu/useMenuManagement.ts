import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryService, menuItemService } from '@/api/menu.api'
import type {
  BulkAvailabilityBody, CreateCategoryBody, CreateMenuItemBody,
  UpdateCategoryBody, UpdateMenuItemBody
} from '@/api/types/menu.types'

export function useMenuManagement(categoryId: string | null, showInactive: boolean) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['menu'] })

  const categories = useQuery({
    queryKey: ['menu', 'categories', showInactive],
    queryFn: () => categoryService.list(showInactive)
  })
  const items = useQuery({
    queryKey: ['menu', 'items', categoryId, showInactive],
    queryFn: () => menuItemService.list(categoryId ?? undefined, showInactive)
  })

  const mutation = <TVariables>(fn: (variables: TVariables) => Promise<unknown>) =>
    useMutation({ mutationFn: fn, onSuccess: invalidate })

  return {
    categories,
    items,
    refresh: () => Promise.all([categories.refetch(), items.refetch()]),
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
