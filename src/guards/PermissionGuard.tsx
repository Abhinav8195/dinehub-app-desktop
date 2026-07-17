import { usePermissions } from '@/hooks/usePermissions'

interface PermissionGuardProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGuard({
  permission, permissions, requireAll = false, role, fallback = null, children
}: PermissionGuardProps) {
  const { can, canAny, canAll, hasRole, isSuperAdmin } = usePermissions()

  if (isSuperAdmin) return <>{children}</>

  let allowed = true

  if (permission) allowed = can(permission)
  if (permissions?.length) {
    allowed = requireAll ? canAll(permissions) : canAny(permissions)
  }
  if (role) allowed = allowed && hasRole(role)

  return allowed ? <>{children}</> : <>{fallback}</>
}
