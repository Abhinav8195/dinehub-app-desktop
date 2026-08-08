import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import { flushOfflineQueue } from '@/lib/offline'
import { toast } from 'sonner'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loadFeatures = useAuthStore((s) => s.loadFeatures)

  useEffect(() => {
    initialize()
  }, [initialize])


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

  useEffect(() => {
    if (!isAuthenticated || !user) return
    const refresh = () => {
      if (document.visibilityState === 'visible') void loadFeatures(user)
    }
    const timer = window.setInterval(refresh, 5 * 60 * 1000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [isAuthenticated, user, loadFeatures])

  return <>{children}</>
}
