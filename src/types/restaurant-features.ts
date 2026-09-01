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
  enabled: boolean | string | number | null | undefined
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

function isFlagEnabled(enabled: RestaurantFeatureFlag['enabled']): boolean {
  if (enabled === true || enabled === 1) return true
  if (typeof enabled === 'string') return enabled.trim().toLowerCase() === 'true' || enabled.trim() === '1'
  return false
}

/**
 * Build the runtime feature map.
 * Once a capability is enabled via any alias (e.g. KITCHEN_DISPLAY → KOT_KITCHEN),
 * a later `enabled: false` on a sibling key must not turn it back off.
 */
export function toRestaurantFeatureMap(flags: RestaurantFeatureFlag[]): RestaurantFeatureMap {
  return flags.reduce<RestaurantFeatureMap>((map, flag) => {
    const key = normalizeFeatureKey(flag.key)
    if (!key) return map
    if (isFlagEnabled(flag.enabled)) map[key] = true
    else if (map[key] !== true) map[key] = false
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

/** Sales/report summaries should stay available for any active restaurant module. */
export function reportsFeatureAvailable(
  features: RestaurantFeatureMap,
  isSuperAdmin = false,
): boolean {
  if (featureEnabled(features, 'REPORTS', isSuperAdmin)) return true
  const unlocks: RestaurantFeature[] = [
    'ORDERS', 'POS', 'ANALYTICS', 'KOT_KITCHEN', 'TABLE_MANAGEMENT', 'CRM', 'CUSTOMERS',
  ]
  return unlocks.some((key) => featureEnabled(features, key, isSuperAdmin))
}
