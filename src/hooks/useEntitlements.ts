import { useQuery } from '@tanstack/react-query'
import { billingApi } from '@/api/phase2.api'
import type { FeatureKey } from '@/api/types/billing.types'
import { hasFeature as checkFeature, isSubscriptionActive } from '@/lib/entitlements'
import { useAuth } from './useAuth'

export const subscriptionQueryKey = ['billing', 'subscription'] as const

export function useEntitlements() {
  const { user, isAuthenticated } = useAuth()
  const isSuperAdmin = Boolean(user?.isSuperAdmin || user?.userType === 'SUPER_ADMIN')
  const query = useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: billingApi.subscription,
    enabled: isAuthenticated && !isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    retry: 1
  })

  return {
    subscription: query.data ?? null,
    features: query.data?.plan?.features ?? [],
    status: query.data?.status ?? 'missing',
    isLoading: !isSuperAdmin && query.isLoading,
    isError: query.isError,
    isActive: isSuperAdmin || isSubscriptionActive(query.data),
    isSuperAdmin,
    hasFeature: (feature: FeatureKey) => checkFeature(query.data, feature, isSuperAdmin),
    refetch: query.refetch
  }
}
