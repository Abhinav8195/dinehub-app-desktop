export const FEATURE_KEYS = [
  'pos', 'orders', 'menu', 'tables', 'customers', 'shifts', 'attendance',
  'inventory_basic', 'dashboard', 'notifications', 'reports_export',
  'kitchen_display', 'reservations', 'qr_ordering', 'multi_branch',
  'purchasing', 'stock_transfer', 'expenses', 'accounting', 'analytics',
  'offers', 'loyalty', 'campaigns', 'employee_invites', 'custom_roles',
  'offline_sync', 'api_access', 'priority_support', 'custom_domain',
  'white_label'
] as const

export type FeatureKey = typeof FEATURE_KEYS[number]

export interface SubscriptionPlan {
  id?: string
  name: string
  features: string[]
}

export interface TenantSubscription {
  id?: string
  status: string
  amount?: number
  currency?: string
  plan?: SubscriptionPlan | null
  invoices?: Array<{
    id: string
    invoiceNumber: string
    amount: number
    status: string
    dueDate: string
  }>
}
