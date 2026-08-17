export const RESTAURANT_FEATURES = [
  'DASHBOARD', 'POS', 'ORDERS', 'TABLE_MANAGEMENT', 'QR_ORDERING', 'KOT_KITCHEN',
  'MENU_MANAGEMENT', 'MENU_CATEGORIES', 'MENU_ITEMS', 'MODIFIERS', 'COMBOS',
  'INVENTORY_DASHBOARD', 'INVENTORY_ITEMS', 'WAREHOUSES', 'RAW_MATERIALS',
  'FINISHED_GOODS', 'STOCK_TRANSFER', 'SUPPLIERS', 'PURCHASE_ORDERS',
  'INVENTORY_ALERTS', 'INVENTORY_LOGS', 'PURCHASE', 'CUSTOMERS',
  'USER_MANAGEMENT', 'USERS', 'ROLES_PERMISSIONS', 'DEPARTMENTS', 'INVITATIONS',
  'AUDIT_LOGS', 'EMPLOYEES', 'ATTENDANCE', 'STAFF_PERMISSIONS', 'RESERVATIONS', 'REPORTS',
  'CRM', 'ACCOUNTING', 'ANALYTICS', 'NOTIFICATIONS', 'SUBSCRIPTION_PLANS',
  'SAAS_ADMIN', 'ROLES', 'SESSIONS', 'RESTAURANT_SETTINGS', 'ACCOUNT'
] as const

export type RestaurantFeature = typeof RESTAURANT_FEATURES[number]
export type RestaurantFeatureMap = Partial<Record<RestaurantFeature, boolean>>

export const isRestaurantFeature = (value: string): value is RestaurantFeature =>
  (RESTAURANT_FEATURES as readonly string[]).includes(value)

export interface RestaurantFeatureFlag {
  key: string
  enabled: boolean
  config?: unknown
}

/** Backend / legacy flag names → desktop nav feature keys */
const FEATURE_ALIASES: Record<string, RestaurantFeature> = {
  KITCHEN_DISPLAY: 'KOT_KITCHEN',
  INVENTORY: 'INVENTORY_DASHBOARD',
  EMPLOYEE_ATTENDANCE: 'ATTENDANCE',
}

export function normalizeFeatureKey(key: string): RestaurantFeature | null {
  const upper = key.toUpperCase()
  if (isRestaurantFeature(upper)) return upper
  return FEATURE_ALIASES[upper] ?? null
}

export function toRestaurantFeatureMap(flags: RestaurantFeatureFlag[]): RestaurantFeatureMap {
  return flags.reduce<RestaurantFeatureMap>((map, flag) => {
    const key = normalizeFeatureKey(flag.key)
    if (key) map[key] = flag.enabled === true
    return map
  }, {})
}

/** When the tenants feature-flags API is unavailable, unblock restaurant staff. */
export function defaultRestaurantFeatureMap(): RestaurantFeatureMap {
  return RESTAURANT_FEATURES.reduce<RestaurantFeatureMap>((map, feature) => {
    if (feature !== 'SAAS_ADMIN') map[feature] = true
    return map
  }, {})
}

export function featureEnabled(
  features: RestaurantFeatureMap,
  feature: RestaurantFeature,
  isSuperAdmin = false
): boolean {
  return isSuperAdmin || features[feature] === true
}
