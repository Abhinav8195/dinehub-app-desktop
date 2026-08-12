export interface TaxSettings {
  id: string
  tenantId: string
  gstPercent: number
  sgstPercent: number
  cgstPercent: number
  serviceChargePercent: number
  taxInclusive: boolean
  updatedAt: string
}

export interface PosCustomer {
  id: string
  firstName: string
  lastName: string
  name: string
  email?: string | null
  phone: string
  instructions?: string | null
  loyaltyPoints: number
  walletBalance: number
  totalOrders: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

export interface CreateCustomerRequest {
  firstName: string
  lastName?: string
  email?: string
  phone: string
  instructions?: string
}

export interface MenuCategory {
  id: string
  name: string
  icon?: string | null
  count: number
}

export interface MenuItemDto {
  id: string
  name: string
  description?: string | null
  price: number
  categoryId: string
  category: string
  imageUrl?: string | null
  available: boolean
  popular: boolean
  modifierGroups: import('./catalog.types').ModifierGroup[]
  hasVariants?: boolean
  variants?: import('./menu.types').MenuItemVariant[]
}

export interface TableDto {
  id: string
  number: number
  floor: string
  capacity: number
  status: string
  currentOrder?: {
    id: string
    orderNumber: string
    status: string
    customerName: string
    total: number
    createdAt: string
  } | null
  updatedAt?: string
}

export interface CreateTableRequest {
  number: number
  floor: string
  capacity?: number
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING'
}

export interface OrderItemRequest {
  menuItemId?: string
  variantId?: string
  comboId?: string
  modifierOptionIds?: string[]
  name?: string
  quantity: number
  unitPrice?: number
  notes?: string
}

export interface CreateOrderRequest {
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ONLINE'
  items: OrderItemRequest[]
  customerId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  instructions?: string
  tableId?: string
  voucherCode?: string
  paymentMethod?: 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'GIFT_CARD' | 'SPLIT'
}

export interface OrderTotalsPreview {
  subtotal: number
  gstAmount: number
  sgstAmount: number
  cgstAmount: number
  serviceCharge: number
  voucherDiscount: number
  total: number
  taxSettings: TaxSettings
}

export interface PosOrder {
  id: string
  orderNumber: string
  type: string
  status: string
  subtotal: number
  gstAmount: number
  sgstAmount: number
  cgstAmount: number
  serviceCharge: number
  discount: number
  voucherCode?: string | null
  voucherDiscount: number
  total: number
  tax: number
  instructions?: string | null
  paymentMethod?: string | null
  paymentStatus?: string | null
  transactionId?: string | null
  refundAmount?: number | null
  deliveryAddress?: string | null
  branchId?: string | null
  branch?: { id: string; name: string } | null
  customerId?: string | null
  tableId?: string | null
  customer?: { id: string; name: string; email?: string | null; phone: string } | null
  table?: { id: string; label: string; number: number; floor: string } | null
  items: Array<{
    id: string
    menuItemId?: string | null
    variantId?: string | null
    variantName?: string | null
    comboId?: string | null
    name: string
    imageUrl?: string | null
    quantity: number
    price: number
    total: number
    notes?: string | null
    modifiers: Array<{
      id: string
      groupId: string
      groupName: string
      name: string
      price: number
    }>
  }>
  createdAt: string
  updatedAt: string
  statusHistory?: Array<{
    status: string
    createdAt: string
    note?: string | null
  }>
}

export interface UpdateTaxSettingsRequest {
  gstPercent?: number
  sgstPercent?: number
  cgstPercent?: number
  serviceChargePercent?: number
  taxInclusive?: boolean
}
