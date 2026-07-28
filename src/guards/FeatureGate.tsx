import type { FeatureKey } from '@/api/types/billing.types'
import { useEntitlements } from '@/hooks/useEntitlements'

interface FeatureGateProps {
  feature: FeatureKey
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function FeatureGate({ feature, fallback = null, children }: FeatureGateProps) {
  const { hasFeature, isLoading } = useEntitlements()
  if (isLoading) return <>{fallback}</>
  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>
}
