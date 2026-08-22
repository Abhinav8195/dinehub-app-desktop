import { create } from 'zustand'
import type { AuthUser } from '@/api/types/auth.types'
import { authApi } from '@/api/auth.api'
import { tokenBridge, onAuthExpired } from '@/api/client'
import { ApiError } from '@/api/types/common'
import { matchPermission } from '@/lib/permissions'
import { tenantsApi } from '@/api/tenants.api'
import {
  defaultRestaurantFeatureMap,
  featureEnabled,
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
    return featureEnabled(features, feature, Boolean(user?.isSuperAdmin || user?.userType === 'SUPER_ADMIN'))
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
    await get().loadFeatures(user)
    set({ user, isAuthenticated: true })
    return user
  },

  initialize: async () => {
    set({ isLoading: true })
    try {
      const hasSession = await tokenBridge.hasSession()
      if (hasSession) {
        try {
          const user = await authApi.me()
          await get().loadFeatures(user)
          set({ user, isAuthenticated: true })
        } catch (error) {
          const sessionRejected = error instanceof ApiError &&
            (error.statusCode === 401 || error.statusCode === 403)
          if (sessionRejected) {
            // Access/refresh rejected — force login. Never stay "authenticated" without a user
            // (that left FeatureAccessBoundary stuck on the splash forever).
            await tokenBridge.clearTokens().catch(() => {})
            set({ user: null, isAuthenticated: false, features: {}, featuresStatus: 'idle', featuresError: null })
          } else {
            // Offline / temporary server failure: keep tokens only with a soft session.
            // Never mark authenticated without a user — AuthGuard would bounce forever.
            set({ user: null, isAuthenticated: false })
          }
        }
      } else {
        set({ user: null, isAuthenticated: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false, isInitialized: true })
    }
  }
}))

// Listen for confirmed session death (refresh failed / tokens cleared)
onAuthExpired(() => {
  import('@/api/settings.api').then(({ clearRestaurantSettingsCache }) => clearRestaurantSettingsCache()).catch(() => {})
  void tokenBridge.clearTokens().catch(() => {})
  useAuthStore.getState().setUser(null)
  useAuthStore.setState({ isAuthenticated: false, features: {}, featuresStatus: 'idle', featuresError: null })
})
