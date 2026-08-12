import { useEffect, useCallback, useRef } from 'react'
import { useShiftStore } from '@/store/shiftStore'

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

export function useSessionTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const lockScreen = useShiftStore((s) => s.lockScreen)
  const isLocked = useShiftStore((s) => s.isLocked)
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
  }, [])

  const resetTimer = useCallback(() => {
    if (isLocked) return
    clearTimer()
    timeoutIdRef.current = setTimeout(() => {
      lockScreen().catch(() => {})
      timeoutIdRef.current = null
    }, timeoutMs)
  }, [isLocked, lockScreen, timeoutMs, clearTimer])

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach((event) => window.addEventListener(event, resetTimer))
    resetTimer()
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer))
      clearTimer()
    }
  }, [resetTimer, clearTimer])

  return { resetTimer }
}
