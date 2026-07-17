import { useAuth } from './useAuth'

export function usePermissions() {
  const { hasPermission, hasRole, user } = useAuth()

  const can = (permission: string) => hasPermission(permission)
  const canAny = (permissions: string[]) => permissions.some(hasPermission)
  const canAll = (permissions: string[]) => permissions.every(hasPermission)
  const isSuperAdmin = user?.isSuperAdmin || user?.userType === 'SUPER_ADMIN'

  return { can, canAny, canAll, hasRole, isSuperAdmin, permissions: user?.permissions ?? [], roles: user?.roles ?? [] }
}
