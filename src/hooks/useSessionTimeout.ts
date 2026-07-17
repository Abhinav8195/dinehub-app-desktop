import { useEffect, useCallback } from 'react'
import { useShiftStore } from '@/store/shiftStore'

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

export function useSessionTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const lockScreen = useShiftStore((s) => s.lockScreen)
  const isLocked = useShiftStore((s) => s.isLocked)

  const resetTimer = useCallback(() => {
    if (isLocked) return
    window.sessionTimeoutId && window.clearTimeout(window.sessionTimeoutId)
    window.sessionTimeoutId = window.setTimeout(() => {
      lockScreen().catch(() => {})
    }, timeoutMs)
  }, [isLocked, lockScreen, timeoutMs])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach((event) => window.addEventListener(event, resetTimer))
    resetTimer()
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer))
      if (window.sessionTimeoutId) window.clearTimeout(window.sessionTimeoutId)
    }
  }, [resetTimer])

  return { resetTimer }
}

declare global {
  interface Window {
    sessionTimeoutId?: number
  }
}
