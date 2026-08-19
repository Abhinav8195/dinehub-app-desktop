import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import {
  Bell, ChevronDown, Moon, Search, Sun,
  Plus, Lock, Clock, Radio
} from 'lucide-react'
import { toast } from 'sonner'
import { getSocketConnectionState, onSocketConnectionState } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Breadcrumb } from '@/components/common/Breadcrumb'
import { AppUpdateButton } from '@/components/common/AppUpdateButton'
import { setRestaurant, setBranch, toggleDarkMode } from '@/store/slices/appSlice'
import { useAuth } from '@/hooks/useAuth'
import { useShiftStore } from '@/store/shiftStore'
import { APP_BASE } from '@/constants/navigation'
import { getInitials } from '@/lib/utils'
import { branchesApi } from '@/api/phase1.api'
import { tenantsApi } from '@/api/tenants.api'

import type { RootState } from '@/store'

interface TopbarProps {
  onCloseShift?: () => void
}

export function Topbar({ onCloseShift }: TopbarProps) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { darkMode, selectedRestaurantId, selectedBranchId } = useSelector((s: RootState) => s.app)
  const { user, logout } = useAuth()
  const currentShift = useShiftStore((s) => s.currentShift)
  const lockScreen = useShiftStore((s) => s.lockScreen)
  const { unreadCount } = useSelector((s: RootState) => s.notifications)

  const isSuperAdmin = Boolean(user?.isSuperAdmin)
  const { data: tenantsResult } = useQuery({
    queryKey: ['tenants', 'selector'],
    queryFn: () => tenantsApi.list({ limit: 100 }),
    enabled: isSuperAdmin,
  })
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list })
  const restaurants = tenantsResult?.data ?? []
  const branchList = branches as Array<{ id: string; name: string; isDefault?: boolean }>
  const [socketState, setSocketState] = useState(getSocketConnectionState())
  useEffect(() => onSocketConnectionState(setSocketState), [])
  useEffect(() => {
    if (isSuperAdmin && !selectedRestaurantId && restaurants[0]) dispatch(setRestaurant(restaurants[0].id))
    const selectedStillValid = Boolean(selectedBranchId && branchList.some((b) => String(b.id) === selectedBranchId))
    if (!selectedStillValid && branchList.length) {
      const preferred = branchList.find((b) => b.isDefault) ?? branchList[0]
      dispatch(setBranch(String(preferred.id)))
    }
  }, [branchList, dispatch, isSuperAdmin, restaurants, selectedBranchId, selectedRestaurantId])

  const handleLock = async () => {
    if (!user?.hasPin) {
      toast.error('Set a PIN in Account Settings before locking the screen')
      navigate(`${APP_BASE}/account?tab=security`)
      return
    }
    try {
      await lockScreen()
      toast.success('Screen locked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to lock screen')
    }
  }

  const selectedBranch = branchList.find((b) => String(b.id) === selectedBranchId)

  return (
    <TooltipProvider>
      <header className="flex h-16 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-md px-3 xl:px-6 shrink-0">
        <div className="hidden min-w-0 items-center gap-4 xl:flex">
          <Breadcrumb />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 mr-2">
            <Tooltip>
              <TooltipTrigger>
                <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${socketState === 'connected' ? 'text-success' : socketState === 'connecting' ? 'text-warning' : 'text-muted-foreground'}`}>
                  <Radio className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {socketState === 'connected' ? 'Realtime connected' : socketState === 'connecting' ? 'Realtime connecting…' : 'Realtime disconnected'}
              </TooltipContent>
            </Tooltip>
          </div>

          {isSuperAdmin ? (
            <div className="hidden xl:flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground px-1">Restaurant</span>
              <Select value={selectedRestaurantId} onValueChange={(v) => dispatch(setRestaurant(v))}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Badge variant="secondary" className="hidden xl:flex h-9 px-3">
              {user?.tenant?.name ?? 'Current restaurant'}
            </Badge>
          )}

          <div className="hidden xl:flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground px-1">Branch</span>
            {branchList.length === 0 ? (
              <Badge variant="outline" className="h-9 px-3 font-normal text-muted-foreground">No branch yet</Badge>
            ) : (
              <Select
                value={selectedBranch ? String(selectedBranch.id) : undefined}
                onValueChange={(v) => dispatch(setBranch(v))}
              >
                <SelectTrigger className="w-[180px] h-9" aria-label="Select branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branchList.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}{b.isDefault ? ' (Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {currentShift && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="hidden md:flex gap-1.5" onClick={() => onCloseShift?.()}>
                  <Clock className="h-3.5 w-3.5" />
                  Close Shift
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Shift open since {new Date(currentShift.openedAt).toLocaleTimeString()}
              </TooltipContent>
            </Tooltip>
          )}

          <AppUpdateButton />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => void handleLock()}>
                <Lock className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{user?.hasPin ? 'Lock Screen' : 'Set a PIN first to lock'}</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Quick
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`${APP_BASE}/pos`)}>New Order</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`${APP_BASE}/reservations`)}>New Reservation</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`${APP_BASE}/customers`)}>Add Customer</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`${APP_BASE}/menu`)}>Add Menu Item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge variant="outline" className="hidden sm:flex h-9 gap-1.5 px-3 text-xs font-medium">
            English
          </Badge>

          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => dispatch(toggleDarkMode())}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={() => navigate(`${APP_BASE}/notifications`)}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-accent transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(`${user?.firstName || ''} ${user?.lastName || ''}` || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:block text-left">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.roles?.[0] || 'user'}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden xl:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p>{user?.firstName} {user?.lastName}</p>
                <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(`${APP_BASE}/account`)}>Account Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`${APP_BASE}/sessions`)}>Active Sessions</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger" onClick={() => logout().then(() => navigate('/login'))}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  )
}
