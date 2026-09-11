import { create } from 'zustand'
import type { AuthUser } from '@/api/types/auth.types'
import { authApi } from '@/api/auth.api'
import { tokenBridge, onAuthExpired } from '@/api/client'
import { mapUser } from '@/lib/mappers/auth.mapper'
import { matchPermission } from '@/lib/permissions'
import { tenantsApi } from '@/api/tenants.api'
import {
  defaultRestaurantFeatureMap,
  featureEnabled,
  reportsFeatureAvailable,
  toRestaurantFeatureMap,
  type RestaurantFeature,
  type RestaurantFeatureMap
} from '@/types/restaurant-features'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  features: RestaurantFeatureMap
  featuresStatus: 'idle' | 'loading' | 'ready' | 'error'
  featuresError: string | null
  setUser: (user: AuthUser | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: (allDevices?: boolean) => Promise<void>
  fetchMe: () => Promise<AuthUser>
  initialize: () => Promise<void>
  loadFeatures: (user?: AuthUser | null) => Promise<void>
  clearFeatures: () => void
  hasFeature: (feature: RestaurantFeature) => boolean
  hasAnyFeature: (features: RestaurantFeature[]) => boolean
  hasAllFeatures: (features: RestaurantFeature[]) => boolean
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  features: {},
  featuresStatus: 'idle',
  featuresError: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  clearFeatures: () => set({ features: {}, featuresStatus: 'idle', featuresError: null }),

  hasFeature: (feature) => {
    const { user, features } = get()
    const isSuperAdmin = Boolean(user?.isSuperAdmin || user?.userType === 'SUPER_ADMIN')
    if (feature === 'REPORTS') {
      return reportsFeatureAvailable(features, isSuperAdmin)
    }
    if (feature === 'KOT_KITCHEN') {
      return featureEnabled(features, 'KOT_KITCHEN', isSuperAdmin)
        || featureEnabled(features, 'POS', isSuperAdmin)
    }
    return featureEnabled(features, feature, isSuperAdmin)
  },

  hasAnyFeature: (requested) => requested.some((feature) => get().hasFeature(feature)),
  hasAllFeatures: (requested) => requested.every((feature) => get().hasFeature(feature)),

  loadFeatures: async (specifiedUser) => {
    const user = specifiedUser ?? get().user
    if (!user) {
      set({ features: {}, featuresStatus: 'idle', featuresError: null })
      return
    }
    if (user.isSuperAdmin || user.userType === 'SUPER_ADMIN') {
      set({ features: {}, featuresStatus: 'ready', featuresError: null })
      return
    }
    if (!user.tenantId) {
      set({ features: {}, featuresStatus: 'error', featuresError: 'The authenticated user has no restaurant assigned.' })
      return
    }

    // Login already returns featureFlags — use them and skip the SaaS-only tenants API.
    if (user.featureFlags?.length) {
      set({
        features: toRestaurantFeatureMap(user.featureFlags),
        featuresStatus: 'ready',
        featuresError: null,
      })
      return
    }

    if (get().featuresStatus !== 'ready') {
      set({ featuresStatus: 'loading', featuresError: null })
    }

    const unlockStaffDefaults = () => {
      const isRestaurantStaff = Boolean(
        user.tenantId &&
        (user.roles?.some((role) =>
          ['owner', 'admin', 'manager', 'cashier', 'waiter', 'chef', 'kitchen'].includes(role.toLowerCase())
        ) || user.userType)
      )
      if (isRestaurantStaff) {
        set({ features: defaultRestaurantFeatureMap(), featuresStatus: 'ready', featuresError: null })
        return true
      }
      return false
    }

    try {
      const flags = await Promise.race([
        tenantsApi.getFeatureFlags(user.tenantId),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Feature flags request timed out')), 12_000)
        }),
      ])
      set({ features: toRestaurantFeatureMap(flags), featuresStatus: 'ready', featuresError: null })
    } catch (error) {
      // /tenants/:id/feature-flags often 404s for restaurant users (needs tenants.read).
      // Keep an already-loaded map, otherwise unlock core restaurant modules.
      if (get().featuresStatus === 'ready' && Object.keys(get().features).length) return
      if (unlockStaffDefaults()) return
      set({
        features: {},
        featuresStatus: 'error',
        featuresError: error instanceof Error ? error.message : 'Unable to load restaurant features.'
      })
    }
  },

  hasPermission: (permission) => {
    const { user } = get()
    if (!user) return false
    if (user.isSuperAdmin || user.userType === 'SUPER_ADMIN') return true
    if (user.roles?.some((r) => ['owner', 'admin', 'super_admin', 'super-admin'].includes(r.toLowerCase()))) return true
    if (!user.permissions?.length) return true
    return matchPermission(user.permissions, permission)
  },

  hasRole: (role) => {
    const { user } = get()
    if (!user) return false
    if (user.isSuperAdmin || user.userType === 'SUPER_ADMIN') return true
    return user.roles.includes(role)
  },

  login: async (email, password) => {
    set({ isLoading: true, featuresStatus: 'loading', featuresError: null })
    try {
      const deviceId = await tokenBridge.getDeviceId()
      const appName = import.meta.env.VITE_APP_NAME || 'DiningHub Desktop'

      const result = await authApi.login({
        email,
        password,
        deviceName: `${appName} v1.0`,
        deviceType: 'electron-desktop',
        deviceId
      })

      if (result.user.tenant?.slug) {
        await tokenBridge.setTenantSlug(result.user.tenant.slug).catch(() => {})
      }
      // Resolve features BEFORE flipping isAuthenticated — otherwise GuestGuard
      // navigates into /app while FeatureAccessBoundary is stuck on a white splash.
      await get().loadFeatures(result.user)
      set({ user: result.user, isAuthenticated: true })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async (allDevices = false) => {
    try {
      await authApi.logout({ allDevices })
    } catch {
      // proceed with local logout even if API fails
    }
    await tokenBridge.clearTokens()
    const { clearRestaurantSettingsCache } = await import('@/api/settings.api')
    clearRestaurantSettingsCache()
    set({ user: null, isAuthenticated: false, features: {}, featuresStatus: 'idle', featuresError: null })
  },

  fetchMe: async () => {
    const user = await authApi.me()
    if (user.tenant?.slug) {
      await tokenBridge.setTenantSlug(user.tenant.slug).catch(() => {})
    }
    await get().loadFeatures(user)
    set({ user, isAuthenticated: true })
    return user
  },

  initialize: async () => {
    set({ isLoading: true })
    try {
      const hasSession = await tokenBridge.hasSession()
      const cachedRaw = await tokenBridge.getCachedUser().catch(() => null)

      if (!hasSession && !cachedRaw) {
        set({ user: null, isAuthenticated: false })
        return
      }

      const restoreCached = async () => {
        if (!cachedRaw) return false
        const user = mapUser(cachedRaw as never)
        if (user.tenant?.slug) {
          await tokenBridge.setTenantSlug(user.tenant.slug).catch(() => {})
        }
        await get().loadFeatures(user)
        set({ user, isAuthenticated: true })
        return true
      }

      try {
        const user = await Promise.race([
          authApi.me(),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(Object.assign(new Error('Auth bootstrap timed out'), { statusCode: 0 })),
              12_000,
            )
          }),
        ])
        if (user.tenant?.slug) {
          await tokenBridge.setTenantSlug(user.tenant.slug).catch(() => {})
        }
        await get().loadFeatures(user)
        set({ user, isAuthenticated: true })
      } catch {
        // Hard refresh / offline: restore last profile so AuthGuard does not bounce to login.
        if (await restoreCached()) return

        // Tokens exist but cache missing — one more me() attempt (refresh may have finished).
        if (hasSession) {
          try {
            const user = await authApi.me()
            if (user.tenant?.slug) {
              await tokenBridge.setTenantSlug(user.tenant.slug).catch(() => {})
            }
            await get().loadFeatures(user)
            set({ user, isAuthenticated: true })
            return
          } catch {
            /* fall through */
          }
        }
        set({ user: null, isAuthenticated: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false, isInitialized: true })
    }
  }
}))

// Never auto-logout from API signals — only explicit Sign Out clears the session.
onAuthExpired(() => {})
