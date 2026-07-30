/** Maps nav permission keys to API permission variants */
const PERMISSION_ALIASES: Record<string, string[]> = {
  'dashboard.view': ['dashboard.view', 'dashboard.read', 'dashboard.access'],
  'pos.access': ['pos.access', 'pos.read', 'pos.write'],
  'orders.view': ['orders.view', 'orders.read', 'orders.write'],
  'tables.view': ['tables.view', 'tables.read', 'tables.write'],
  'qr.view': ['qr.view', 'qr.read'],
  'kitchen.view': ['kitchen.view', 'kitchen.read'],
  'menu.view': ['menu.view', 'menu.read', 'menu.write'],
  'inventory.view': ['inventory.view', 'inventory.read', 'inventory.write'],
  'purchase.view': ['purchase.view', 'purchase.read', 'purchase.write'],
  'customers.view': ['customers.view', 'customers.read', 'customers.write'],
  'employees.view': ['employees.view', 'employees.read', 'users.read', 'users.write'],
  'staff.view': ['staff.view', 'staff.read', 'users.read', 'users.write', 'roles.manage'],
  'users.view': ['users.view', 'users.read', 'users.write', 'staff.view'],
  'reservations.view': ['reservations.view', 'reservations.read'],
  'reports.view': ['reports.view', 'reports.read'],
  'crm.view': ['crm.view', 'crm.read'],
  'accounting.view': ['accounting.view', 'accounting.read'],
  'analytics.view': ['analytics.view', 'analytics.read'],
  'notifications.view': ['notifications.view', 'notifications.read'],
  'roles.manage': ['roles.manage', 'roles.read', 'roles.create', 'roles.update', 'roles.write'],
  'inventory.warehouse.manage': ['inventory.warehouse.manage'],
  'inventory.purchase.view': ['inventory.purchase.view', 'inventory.purchase.manage'],
  'departments.view': ['departments.view', 'departments.manage'],
  'users.invites.view': ['users.invites.view', 'users.invites.manage'],
  'audit.view': ['audit.view'],
  'auth.sessions.read': ['auth.sessions.read', 'sessions.read']
}

const OWNER_ROLES = ['owner', 'admin', 'super_admin', 'superadmin']

export function matchPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes('*') || userPermissions.includes('all')) return true

  const aliases = PERMISSION_ALIASES[required] ?? [required]
  return aliases.some((p) => userPermissions.includes(p))
}

export function isOwnerRole(roles: string[]): boolean {
  return roles.some((r) => OWNER_ROLES.includes(r.toLowerCase()))
}

export function canAccessNav(
  permission: string | undefined,
  userPermissions: string[],
  roles: string[],
  isSuperAdmin: boolean,
  superAdminOnly?: boolean,
  featureAllowed = true
): boolean {
  if (superAdminOnly && !isSuperAdmin) return false
  if (isSuperAdmin) return true
  if (!featureAllowed) return false
  if (isOwnerRole(roles)) return true
  if (!permission) return true
  // Keep navigation consistent with authStore.hasPermission(). Some backend
  // user/profile responses currently omit the expanded permission list; in
  // that case the authenticated role policy remains authoritative.
  if (userPermissions.length === 0) return true
  return matchPermission(userPermissions, permission)
}
