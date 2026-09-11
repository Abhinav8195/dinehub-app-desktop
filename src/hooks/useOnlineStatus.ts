import { useSyncExternalStore } from 'react'
import { checkOnline } from '@/api/client'

/** Shared online probe so Topbar + OfflineBanner don't each hit the API. */
type OnlineSnapshot = { isOnline: boolean; isApiReachable: boolean }

let snapshot: OnlineSnapshot = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isApiReachable: true,
}
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function setSnapshot(partial: Partial<OnlineSnapshot>) {
  snapshot = { ...snapshot, ...partial }
  emit()
}

let probeStarted = false
function ensureProbe() {
  if (probeStarted || typeof window === 'undefined') return
  probeStarted = true

  const handleOnline = () => setSnapshot({ isOnline: true })
  const handleOffline = () => setSnapshot({ isOnline: false })
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  const ping = async () => {
    const reachable = await checkOnline().catch(() => false)
    setSnapshot({ isApiReachable: reachable })
  }
  void ping()
  window.setInterval(() => void ping(), 60_000)
}

function subscribe(listener: () => void) {
  ensureProbe()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

export function useOnlineStatus() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  // API reachability is authoritative (local API can work without public internet).
  return {
    isOnline: state.isOnline,
    isApiReachable: state.isApiReachable,
    isOffline: !state.isApiReachable,
  }
}
