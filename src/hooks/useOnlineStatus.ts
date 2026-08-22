import { useEffect, useState } from 'react'
import { checkOnline } from '@/api/client'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isApiReachable, setIsApiReachable] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const ping = async () => {
      const reachable = await checkOnline()
      setIsApiReachable(reachable)
    }
    ping()
    const interval = setInterval(ping, 30000)
    return () => clearInterval(interval)
  }, [isOnline])

  // API reachability is authoritative (local API can work without public internet).
  return { isOnline, isApiReachable, isOffline: !isApiReachable }
}
