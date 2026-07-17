import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { tokenBridge } from '@/api/client'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const initTenant = async () => {
      const slug = await tokenBridge.getTenantSlug()
      if (!slug) return
      useTenantStore.setState({ slug })
      try {
        await useTenantStore.getState().resolveBranding(slug)
      } catch {
        // branding is optional on restore
      }
    }
    initTenant()
  }, [])

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      connectSocket(user.tenantId).catch(console.error)
    } else {
      disconnectSocket()
    }
    return () => disconnectSocket()
  }, [isAuthenticated, user?.tenantId])

  return <>{children}</>
}
