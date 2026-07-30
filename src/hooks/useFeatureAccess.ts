import { useAuthStore } from '@/store/authStore'

export function useFeatureAccess() {
  const features = useAuthStore((state) => state.features)
  const status = useAuthStore((state) => state.featuresStatus)
  const error = useAuthStore((state) => state.featuresError)
  const hasFeature = useAuthStore((state) => state.hasFeature)
  const hasAnyFeature = useAuthStore((state) => state.hasAnyFeature)
  const hasAllFeatures = useAuthStore((state) => state.hasAllFeatures)
  const refetch = useAuthStore((state) => state.loadFeatures)

  return {
    features,
    status,
    error,
    isLoading: status === 'idle' || status === 'loading',
    isError: status === 'error',
    hasFeature,
    hasAnyFeature,
    hasAllFeatures,
    refetch
  }
}
