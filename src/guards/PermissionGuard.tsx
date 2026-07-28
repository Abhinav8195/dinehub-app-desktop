import { usePermissions } from '@/hooks/usePermissions'
import { useEntitlements } from '@/hooks/useEntitlements'
import type { FeatureKey } from '@/api/types/billing.types'

interface PermissionGuardProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  fallback?: React.ReactNode
  feature?: FeatureKey
  children: React.ReactNode
}

export function PermissionGuard({
  permission, permissions, requireAll = false, role, feature, fallback = null, children
}: PermissionGuardProps) {
  const { can, canAny, canAll, hasRole, isSuperAdmin } = usePermissions()
  const entitlements = useEntitlements()

  if (isSuperAdmin) return <>{children}</>

  let allowed = true

  if (permission) allowed = can(permission)
  if (permissions?.length) {
    allowed = requireAll ? canAll(permissions) : canAny(permissions)
  }
  if (role) allowed = allowed && hasRole(role)
  if (feature) allowed = allowed && !entitlements.isLoading && entitlements.hasFeature(feature)

  return allowed ? <>{children}</> : <>{fallback}</>
}
