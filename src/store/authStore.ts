import { create } from 'zustand'
import type { AuthUser } from '@/api/types/auth.types'
import { authApi } from '@/api/auth.api'
import { tokenBridge, onAuthExpired } from '@/api/client'
import { ApiError } from '@/api/types/common'
import { matchPermission } from '@/lib/permissions'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: AuthUser | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: (allDevices?: boolean) => Promise<void>
  fetchMe: () => Promise<AuthUser>
  initialize: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

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
      const tenantSlug = await tokenBridge.getTenantSlug()
      const appName = import.meta.env.VITE_APP_NAME || 'DineHub Desktop'

      const result = await authApi.login({
        email,
        password,
        ...(tenantSlug ? { tenantSlug } : {}),
        deviceName: `${appName} v1.0`,
        deviceType: 'electron-desktop',
        deviceId
      })

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
    set({ user: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    const user = await authApi.me()
    set({ user, isAuthenticated: true })
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
        } catch (error) {
          const sessionRejected = error instanceof ApiError &&
            (error.statusCode === 401 || error.statusCode === 403)
          if (sessionRejected) {
            await tokenBridge.clearTokens()
            set({ user: null, isAuthenticated: false })
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
  useAuthStore.setState({ isAuthenticated: false })
})
