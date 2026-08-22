import type { ModifierGroup } from './catalog.types'

export interface Category {
  id: string
  name: string
  icon: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  count: number
}

export interface CreateCategoryBody {
  name: string
  icon?: string
  sortOrder?: number
  imageUrl?: string
}

export interface UpdateCategoryBody {
  name?: string
  icon?: string
  sortOrder?: number
  isActive?: boolean
  imageUrl?: string
}

export interface MenuItemRecipeLine {
  id?: string
  inventoryItemId: string
  quantity: number
  variantId?: string | null
  inventoryItem?: {
    id: string
    name: string
    sku: string
    unit: string
    quantity: number
    warehouseId: string
  }
}

export interface MenuItemRecipeLineInput {
  inventoryItemId: string
  quantity: number
  variantId?: string | null
}

export interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  categoryId: string
  category: string
  imageUrl: string | null
  available: boolean
  popular: boolean
  isVegetarian?: boolean | null
  dietary?: 'veg' | 'nonveg' | null
  modifierGroups: ModifierGroup[]
  hasVariants?: boolean
  variants?: MenuItemVariant[]
  recipeLines?: MenuItemRecipeLine[]
}

export interface MenuItemVariant {
  id: string
  name: string
  price: number
  discountedPrice?: number | null
  isAvailable: boolean
  isDefault: boolean
  sortOrder: number
}

export interface MenuItemVariantInput {
  id?: string
  name: string
  price: number
  discountedPrice?: number | null
  isAvailable: boolean
  isDefault: boolean
  sortOrder: number
}

export interface CreateMenuItemBody {
  categoryId: string
  name: string
  description?: string
  price?: number
  imageUrl?: string
  isAvailable?: boolean
  isPopular?: boolean
  isVegetarian?: boolean | null
  hasVariants?: boolean
  variants?: MenuItemVariantInput[]
  recipeLines?: MenuItemRecipeLineInput[]
}

export interface UpdateMenuItemBody {
  categoryId?: string
  name?: string
  description?: string
  price?: number
  imageUrl?: string
  isAvailable?: boolean
  isPopular?: boolean
  isVegetarian?: boolean | null
  hasVariants?: boolean
  variants?: MenuItemVariantInput[]
  recipeLines?: MenuItemRecipeLineInput[]
}

export interface BulkAvailabilityBody {
  ids: string[]
  isAvailable: boolean
}
