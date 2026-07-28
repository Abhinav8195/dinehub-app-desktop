import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { FeatureKey } from '@/api/types/billing.types'
import { SplashScreen } from '@/components/brand/SplashScreen'
import { useEntitlements } from '@/hooks/useEntitlements'
import { usePermissions } from '@/hooks/usePermissions'

export const RESTRICTED_FEATURE_MESSAGE = 'This feature is not included in your current plan.'

export function getFeatureRouteDecision(
  loading: boolean,
  featureAllowed: boolean,
  permissionAllowed: boolean,
  isSuperAdmin: boolean
): 'loading' | 'allow' | 'redirect' {
  if (loading) return 'loading'
  return isSuperAdmin || (featureAllowed && permissionAllowed) ? 'allow' : 'redirect'
}

export function FeatureRouteGuard({ feature, permission, children }: {
  feature: FeatureKey
  permission?: string
  children: React.ReactNode
}) {
  const { hasFeature, isLoading } = useEntitlements()
  const { can, isSuperAdmin } = usePermissions()
  const featureAllowed = hasFeature(feature)
  const permissionAllowed = !permission || can(permission)
  const decision = getFeatureRouteDecision(isLoading, featureAllowed, permissionAllowed, Boolean(isSuperAdmin))
  const allowed = decision === 'allow'

  useEffect(() => {
    if (!isLoading && !featureAllowed) toast.error(RESTRICTED_FEATURE_MESSAGE)
  }, [featureAllowed, isLoading])

  if (decision === 'loading') return <SplashScreen />
  if (!allowed) return <Navigate to="/app" replace />
  return <>{children}</>
}
