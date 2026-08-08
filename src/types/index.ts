export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'refunded'
export type OrderType = 'dine-in' | 'takeaway' | 'delivery' | 'online'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'merged'
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet' | 'gift-card' | 'split'
export type UserRole = 'owner' | 'admin' | 'manager' | 'cashier' | 'captain' | 'waiter' | 'chef' | 'kitchen' | 'delivery'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  permissions: string[]
}

export interface Restaurant {
  id: string
  name: string
  logo?: string
  currency: string
  timezone: string
}

export interface Branch {
  id: string
  name: string
  restaurantId: string
  address: string
}

export interface OrderItem {
  id: string
  lineKey: string
  menuItemId?: string
  variantId?: string
  variantName?: string
  comboId?: string
  name: string
  quantity: number
  price: number
  modifiers?: Array<{ id: string; groupId: string; groupName: string; name: string; price: number }>
  notes?: string
}

export interface Order {
  id: string
  orderNumber: string
  type: OrderType
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  tableId?: string
  customerId?: string
  createdAt: string
  updatedAt: string
}

export interface Table {
  id: string
  number: number
  floor: string
  capacity: number
  status: TableStatus
  x: number
  y: number
  orderId?: string
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  image?: string
  available: boolean
  modifiers?: string[]
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  loyaltyPoints: number
  walletBalance: number
  totalOrders: number
  totalSpent: number
}

export interface StatCard {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
}

export interface Activity {
  id: string
  type: string
  message: string
  timestamp: string
  user?: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'danger'
  read: boolean
  createdAt: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
