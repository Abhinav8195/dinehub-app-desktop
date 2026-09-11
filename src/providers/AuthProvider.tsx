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
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Safety net: if auth flipped on without features (e.g. older PIN path), load them once.
  useEffect(() => {
    if (!isAuthenticated || !user) return
    const status = useAuthStore.getState().featuresStatus
    if (status === 'idle') void loadFeatures(user)
  }, [isAuthenticated, user, loadFeatures])

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      connectSocket(user.tenantId).catch(console.error)
    } else {
      disconnectSocket()
    }
    return () => disconnectSocket()
  }, [isAuthenticated, user?.tenantId])

  // Quiet keep-alive — never force logout on failure (Sign Out only).
  useEffect(() => {
    if (!isAuthenticated) return
    const keepAlive = () => {
      void fetchMe().catch(() => {})
    }
    const timer = window.setInterval(keepAlive, 10 * 60 * 1000)
    window.addEventListener('online', keepAlive)
    const onVisible = () => {
      if (document.visibilityState === 'visible') keepAlive()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', keepAlive)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isAuthenticated, fetchMe])

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
    void flush()
    window.addEventListener('online', flush)
    const timer = window.setInterval(() => void flush(), 30_000)
    return () => {
      window.removeEventListener('online', flush)
      window.clearInterval(timer)
    }
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
