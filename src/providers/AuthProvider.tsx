import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useTenantStore } from '@/store/tenantStore'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { flushOfflineQueue } from '@/lib/offline'
import { tokenBridge } from '@/api/client'
import { toast } from 'sonner'

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
    }
    void initTenant()
  }, [])

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      connectSocket(user.tenantId).catch(console.error)
    } else {
      disconnectSocket()
    }
    return () => disconnectSocket()
  }, [isAuthenticated, user?.tenantId])

  useEffect(() => {
    if (!isAuthenticated) return
    const flush = async () => {
      try {
        const count = await flushOfflineQueue()
        if (count > 0) toast.success(`Synced ${count} offline order${count === 1 ? '' : 's'}`)
      } catch (error) {
        console.error(error)
      }
    }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [isAuthenticated])

  return <>{children}</>
}
