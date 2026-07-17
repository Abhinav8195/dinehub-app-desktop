import { create } from 'zustand'
import type { TenantBranding } from '@/api/types/tenants.types'
import { tenantsApi } from '@/api/tenants.api'

import { tokenBridge } from '@/api/client'

interface TenantState {
  slug: string | null
  branding: TenantBranding | null
  isResolving: boolean
  setSlug: (slug: string) => Promise<void>
  resolveBranding: (slug: string) => Promise<TenantBranding>
  clear: () => void
}

export const useTenantStore = create<TenantState>((set) => ({
  slug: null,
  branding: null,
  isResolving: false,

  setSlug: async (slug) => {
    await tokenBridge.setTenantSlug(slug)
    set({ slug })
  },

  resolveBranding: async (slug) => {
    set({ isResolving: true })
    try {
      const branding = await tenantsApi.resolve(slug)
      await tokenBridge.setTenantSlug(slug)
      set({ slug, branding })
      return branding
    } finally {
      set({ isResolving: false })
    }
  },

  clear: () => set({ slug: null, branding: null })
}))
