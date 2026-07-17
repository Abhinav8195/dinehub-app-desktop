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
      if (!navigator.onLine) {
        setIsApiReachable(false)
        return
      }
      const reachable = await checkOnline()
      setIsApiReachable(reachable)
    }
    ping()
    const interval = setInterval(ping, 30000)
    return () => clearInterval(interval)
  }, [isOnline])

  return { isOnline, isApiReachable, isOffline: !isOnline || !isApiReachable }
}
