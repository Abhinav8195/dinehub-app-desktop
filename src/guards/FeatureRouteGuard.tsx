import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import type { RestaurantFeature } from '@/types/restaurant-features'
import { SplashScreen } from '@/components/brand/SplashScreen'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { usePermissions } from '@/hooks/usePermissions'
import { getFirstAccessibleRoute } from '@/lib/navigation-access'

export const RESTRICTED_FEATURE_MESSAGE = 'This feature is no longer enabled for your restaurant.'

export function getFeatureRouteDecision(
  loading: boolean,
  featureAllowed: boolean,
  permissionAllowed: boolean
): 'loading' | 'allow' | 'redirect' {
  if (loading) return 'loading'
  return featureAllowed && permissionAllowed ? 'allow' : 'redirect'
}

export function FeatureRouteGuard({ feature, permission, children }: {
  feature: RestaurantFeature
  permission?: string
  children: React.ReactNode
}) {
  const location = useLocation()
  const { hasFeature, isLoading } = useFeatureAccess()
  const { can, permissions, roles, isSuperAdmin } = usePermissions()
  const featureAllowed = hasFeature(feature)
  const permissionAllowed = !permission || can(permission)
  const decision = getFeatureRouteDecision(isLoading, featureAllowed, permissionAllowed)
  const fallbackRoute = getFirstAccessibleRoute({
    hasFeature,
    permissions,
    roles,
    isSuperAdmin: Boolean(isSuperAdmin),
    excludedPath: location.pathname
  })

  useEffect(() => {
    if (!isLoading && !featureAllowed) toast.error(RESTRICTED_FEATURE_MESSAGE)
  }, [featureAllowed, isLoading])

  if (decision === 'loading') return <SplashScreen />
  if (decision === 'redirect') return <Navigate to={fallbackRoute ?? '/app/no-features'} replace />
  return <>{children}</>
}
