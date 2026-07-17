import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { LockScreen } from '@/components/auth/LockScreen'
import { ShiftCloseDialog } from '@/components/auth/ShiftDialog'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { useShiftStore } from '@/store/shiftStore'
import { useAuth } from '@/hooks/useAuth'
import { useNotificationsSync } from '@/hooks/useNotificationsSync'
import { cn } from '@/lib/utils'

import { APP_BASE } from '@/constants/navigation'

const FULLSCREEN_ROUTES = [`${APP_BASE}/pos`, `${APP_BASE}/kitchen`]

export function AppLayout() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  useNotificationsSync(isAuthenticated)
  const isFullscreen = FULLSCREEN_ROUTES.some((r) => location.pathname === r)
  const isLocked = useShiftStore((s) => s.isLocked)
  const fetchCurrentShift = useShiftStore((s) => s.fetchCurrentShift)
  const syncLockStatus = useShiftStore((s) => s.syncLockStatus)
  const [shiftClose, setShiftClose] = useState(false)

  useSessionTimeout()

  useEffect(() => {
    if (!isAuthenticated) return
    fetchCurrentShift().catch(() => {})
    syncLockStatus().catch(() => {})
  }, [isAuthenticated, fetchCurrentShift, syncLockStatus])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar onCloseShift={() => setShiftClose(true)} />
        <main className={cn('flex-1 min-h-0', isFullscreen ? 'overflow-hidden' : 'overflow-auto')}>
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      {isLocked && <LockScreen />}
      <ShiftCloseDialog open={shiftClose} onOpenChange={setShiftClose} />
    </div>
  )
}
