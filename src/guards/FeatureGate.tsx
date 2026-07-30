import type { RestaurantFeature } from '@/types/restaurant-features'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'

interface FeatureGateProps {
  feature: RestaurantFeature
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function FeatureGate({ feature, fallback = null, children }: FeatureGateProps) {
  const { hasFeature, isLoading } = useFeatureAccess()
  if (isLoading) return <>{fallback}</>
  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>
}
