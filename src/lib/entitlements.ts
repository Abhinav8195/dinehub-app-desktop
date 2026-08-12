import type { FeatureKey, TenantSubscription } from '@/api/types/billing.types'

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  pos: 'POS and checkout',
  orders: 'Orders',
  menu: 'Menu management',
  tables: 'Table management',
  customers: 'Customer database',
  shifts: 'Staff shifts and PIN login',
  attendance: 'Employee attendance',
  inventory_basic: 'Inventory',
  dashboard: 'Dashboard',
  notifications: 'Notifications',
  reports_export: 'Report exports',
  kitchen_display: 'Kitchen display',
  reservations: 'Reservations',
  qr_ordering: 'QR ordering',
  multi_branch: 'Multiple branches',
  purchasing: 'Purchasing',
  stock_transfer: 'Stock transfers',
  expenses: 'Expenses',
  accounting: 'Accounting',
  analytics: 'Analytics',
  offers: 'Offers and coupons',
  loyalty: 'Loyalty',
  campaigns: 'Campaigns',
  employee_invites: 'Employee invitations',
  custom_roles: 'Custom roles and permissions',
  offline_sync: 'Offline sync',
  api_access: 'API access',
  priority_support: 'Priority support',
  custom_domain: 'Custom domain',
  white_label: 'White-label branding'
}

const ENTITLED_STATUSES = new Set(['active', 'trial', 'trialing'])

export function isSubscriptionActive(subscription: TenantSubscription | null | undefined): boolean {
  return Boolean(subscription && ENTITLED_STATUSES.has(subscription.status.toLowerCase()))
}

export function hasFeature(
  subscription: TenantSubscription | null | undefined,
  feature: FeatureKey,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true
  if (!isSubscriptionActive(subscription)) return false
  return subscription?.plan?.features?.includes(feature) === true
}

export function canUseFeature(
  permissionAllowed: boolean,
  subscription: TenantSubscription | null | undefined,
  feature: FeatureKey,
  isSuperAdmin = false
): boolean {
  return isSuperAdmin || (permissionAllowed && hasFeature(subscription, feature))
}
