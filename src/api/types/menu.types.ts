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
  modifierGroups: ModifierGroup[]
}

export interface CreateMenuItemBody {
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  isAvailable?: boolean
  isPopular?: boolean
}

export interface UpdateMenuItemBody {
  categoryId?: string
  name?: string
  description?: string
  price?: number
  imageUrl?: string
  isAvailable?: boolean
  isPopular?: boolean
}

export interface BulkAvailabilityBody {
  ids: string[]
  isAvailable: boolean
}
