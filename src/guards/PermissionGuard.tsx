import { usePermissions } from '@/hooks/usePermissions'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import type { RestaurantFeature } from '@/types/restaurant-features'

interface PermissionGuardProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  fallback?: React.ReactNode
  feature?: RestaurantFeature
  children: React.ReactNode
}

export function PermissionGuard({
  permission, permissions, requireAll = false, role, feature, fallback = null, children
}: PermissionGuardProps) {
  const { can, canAny, canAll, hasRole, isSuperAdmin } = usePermissions()
  const featureAccess = useFeatureAccess()

  if (isSuperAdmin) return <>{children}</>

  let allowed = true

  if (permission) allowed = can(permission)
  if (permissions?.length) {
    allowed = requireAll ? canAll(permissions) : canAny(permissions)
  }
  if (role) allowed = allowed && hasRole(role)
  if (feature) allowed = allowed && !featureAccess.isLoading && featureAccess.hasFeature(feature)

  return allowed ? <>{children}</> : <>{fallback}</>
}
