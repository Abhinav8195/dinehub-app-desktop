export interface ModifierOption {
  id: string
  name: string
  price: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

export interface ModifierMenuItem {
  id: string
  name: string
  category?: string
}

export interface ModifierGroup {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  required: boolean
  isActive: boolean
  options: ModifierOption[]
  menuItems?: ModifierMenuItem[]
}

export interface ModifierGroupBody {
  name: string
  minSelect: number
  maxSelect: number
  required: boolean
  isActive: boolean
}

export interface ModifierOptionBody {
  name: string
  price: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

export interface ComboItem {
  menuItemId: string
  quantity: number
  menuItem?: { id: string; name: string; price?: number; imageUrl?: string | null }
}

export interface Combo {
  id: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  isActive: boolean
  items: ComboItem[]
}

export interface ComboBody {
  name: string
  description?: string
  price: number
  imageUrl?: string
  isActive: boolean
  items: Array<{ menuItemId: string; quantity: number }>
}
