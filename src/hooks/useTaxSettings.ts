import { useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/api/settings.api'
import { DEFAULT_TAX_SETTINGS } from '@/lib/tax'

export function useTaxSettings() {
  return useQuery({
    queryKey: ['tax-settings'],
    queryFn: () => settingsApi.getTax(),
    staleTime: 60_000,
    placeholderData: DEFAULT_TAX_SETTINGS,
  })
}

export function useInvalidateTaxSettings() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['tax-settings'] })
}
