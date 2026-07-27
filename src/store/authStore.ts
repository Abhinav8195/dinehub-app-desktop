import { create } from 'zustand'
import type { AuthUser } from '@/api/types/auth.types'
import { authApi } from '@/api/auth.api'
import { tokenBridge, onAuthExpired } from '@/api/client'
import { matchPermission } from '@/lib/permissions'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: AuthUser | null) => void
  login: (email: string, password: string, tenantSlug: string) => Promise<void>
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

  login: async (email, password, tenantSlug) => {
    set({ isLoading: true })
    try {
      await tokenBridge.setTenantSlug(tenantSlug)
      const deviceId = await tokenBridge.getDeviceId()
      const appName = import.meta.env.VITE_APP_NAME || 'DineHub Desktop'

      const result = await authApi.login({
        email,
        password,
        tenantSlug,
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
        const user = await authApi.me()
        set({ user, isAuthenticated: true })
      }
    } catch {
      await tokenBridge.clearTokens()
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
