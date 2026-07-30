import type { NavItem } from '@/constants/navigation'
import { APP_BASE, NAVIGATION } from '@/constants/navigation'
import { canAccessNav } from '@/lib/permissions'
import type { RestaurantFeature } from '@/types/restaurant-features'

export interface NavigationAccess {
  canPermission: (item: NavItem) => boolean
  hasFeature: (feature: NonNullable<NavItem['feature']>) => boolean
}

export function getFirstAccessibleRoute(options: {
  hasFeature: (feature: RestaurantFeature) => boolean
  permissions: string[]
  roles: string[]
  isSuperAdmin: boolean
  excludedPath?: string
}): string | null {
  const visible = filterNavigation(NAVIGATION, {
    canPermission: (item) => canAccessNav(
      item.permission,
      options.permissions,
      options.roles,
      options.isSuperAdmin,
      item.superAdminOnly
    ),
    hasFeature: options.hasFeature
  })

  const candidates = visible.flatMap((item) => [
    item,
    ...(item.children ?? [])
  ])
  const dashboard = candidates.find((item) => item.href === APP_BASE)
  if (dashboard && dashboard.href !== options.excludedPath) return dashboard.href
  return candidates.find((item) => item.href !== options.excludedPath)?.href ?? null
}

export function filterNavigation(items: NavItem[], access: NavigationAccess): NavItem[] {
  return items.flatMap((item) => {
    if (!access.canPermission(item)) return []

    const children = item.children ? filterNavigation(item.children, access) : undefined
    const featureAllowed = access.hasFeature(item.feature)
    if (!featureAllowed && !children?.length) return []

    return [{ ...item, ...(children ? { children } : {}) }]
  })
}
