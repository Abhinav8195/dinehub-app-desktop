import type { NavItem } from '@/constants/navigation'

export interface NavigationAccess {
  canPermission: (item: NavItem) => boolean
  hasFeature: (feature: NonNullable<NavItem['feature']>) => boolean
}

export function filterNavigation(items: NavItem[], access: NavigationAccess): NavItem[] {
  return items.flatMap((item) => {
    if (!access.canPermission(item)) return []
    if (item.feature && !access.hasFeature(item.feature)) return []

    const children = item.children ? filterNavigation(item.children, access) : undefined
    return [{ ...item, ...(children ? { children } : {}) }]
  })
}
