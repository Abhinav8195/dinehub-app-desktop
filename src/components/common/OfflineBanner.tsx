import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getSyncQueueStatus } from '@/lib/offline'

export function OfflineBanner() {
  const { isOffline } = useOnlineStatus()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        const status = await getSyncQueueStatus()
        if (!cancelled) setPending(status.pending)
      } catch {
        if (!cancelled) setPending(0)
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 5_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [isOffline])

  if (!isOffline && pending === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      {isOffline
        ? pending > 0
          ? `Offline mode — POS works from cache. ${pending} order${pending === 1 ? '' : 's'} waiting to sync.`
          : 'Offline mode — POS uses cached menu/tables. New orders will sync when online.'
        : `${pending} offline order${pending === 1 ? '' : 's'} waiting to sync…`}
    </div>
  )
}
