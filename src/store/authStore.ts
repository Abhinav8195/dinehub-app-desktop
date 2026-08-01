import { create } from 'zustand'
import type { AuthUser } from '@/api/types/auth.types'
import { authApi } from '@/api/auth.api'
import { tokenBridge, onAuthExpired } from '@/api/client'
import { ApiError } from '@/api/types/common'
import { matchPermission } from '@/lib/permissions'
import { tenantsApi } from '@/api/tenants.api'
import {
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

    if (get().featuresStatus !== 'ready') {
      set({ featuresStatus: 'loading', featuresError: null })
    }
    try {
      const flags = await tenantsApi.getFeatureFlags(user.tenantId)
      set({ features: toRestaurantFeatureMap(flags), featuresStatus: 'ready', featuresError: null })
    } catch (error) {
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
    set({ isLoading: true })
    try {
      const deviceId = await tokenBridge.getDeviceId()
      const appName = import.meta.env.VITE_APP_NAME || 'DineHub Desktop'

      const result = await authApi.login({
        email,
        password,
        deviceName: `${appName} v1.0`,
        deviceType: 'electron-desktop',
        deviceId
      })

      if (result.user.tenantSlug) {
        await tokenBridge.setTenantSlug(result.user.tenantSlug)
      }
      set({ user: result.user, isAuthenticated: true })
      await get().loadFeatures(result.user)
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
    set({ user: null, isAuthenticated: false, features: {}, featuresStatus: 'idle', featuresError: null })
  },

  fetchMe: async () => {
    const user = await authApi.me()
    set({ user, isAuthenticated: true })
    await get().loadFeatures(user)
    return user
  },

  initialize: async () => {
    set({ isLoading: true })
    try {
      const hasSession = await tokenBridge.hasSession()
      if (hasSession) {
        // Restore the local session immediately. The access token is refreshed
        // transparently by the main process if the API reports it as expired.
        set({ isAuthenticated: true })
        try {
          const user = await authApi.me()
          set({ user, isAuthenticated: true })
          await get().loadFeatures(user)
        } catch (error) {
          const sessionRejected = error instanceof ApiError &&
            (error.statusCode === 401 || error.statusCode === 403)
          if (sessionRejected) {
            await tokenBridge.clearTokens()
            set({ user: null, isAuthenticated: false, features: {}, featuresStatus: 'idle', featuresError: null })
          }
          // For offline, gateway, and temporary server failures, retain the
          // stored session and retry naturally on the next API request.
        }
      }
    } catch {
      // A bridge/storage failure cannot safely establish a local session, but
      // it must not erase credentials that may still be recoverable next run.
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false, isInitialized: true })
    }
  }
}))

// Listen for 401 refresh failures
onAuthExpired(() => {
  useAuthStore.getState().setUser(null)
  useAuthStore.setState({ isAuthenticated: false, features: {}, featuresStatus: 'idle', featuresError: null })
})
