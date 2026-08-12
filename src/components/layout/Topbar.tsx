import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import {
  Bell, ChevronDown, Globe, Moon, Search, Sun, Wifi, WifiOff,
  Printer, CircleDollarSign, Plus, Command, Lock, Clock, Radio
} from 'lucide-react'
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
import { LANGUAGES } from '@/constants/navigation'
import { setRestaurant, setBranch, setLanguage, toggleDarkMode, setCommandPaletteOpen } from '@/store/slices/appSlice'
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
  const {
    darkMode, selectedRestaurantId, selectedBranchId, language,
    isOnline, printerConnected, cashRegisterOpen
  } = useSelector((s: RootState) => s.app)
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
  const [socketState, setSocketState] = useState(getSocketConnectionState())
  useEffect(() => onSocketConnectionState(setSocketState), [])
  useEffect(() => {
    if (isSuperAdmin && !selectedRestaurantId && restaurants[0]) dispatch(setRestaurant(restaurants[0].id))
    if (!selectedBranchId && branches[0]) dispatch(setBranch(String(branches[0].id)))
  }, [branches, dispatch, isSuperAdmin, restaurants, selectedBranchId, selectedRestaurantId])

  return (
    <TooltipProvider>
      <header className="flex h-16 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-md px-3 xl:px-6 shrink-0">
        <div className="hidden min-w-0 items-center gap-4 xl:flex">
          <Breadcrumb />
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicators */}
          <div className="hidden lg:flex items-center gap-1.5 mr-2">
            <Tooltip>
              <TooltipTrigger>
                <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${isOnline ? 'text-success' : 'text-danger'}`}>
                  {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                </div>
              </TooltipTrigger>
              <TooltipContent>{isOnline ? 'Online' : 'Offline Mode'}</TooltipContent>
            </Tooltip>
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
            <Tooltip>
              <TooltipTrigger>
                <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${printerConnected ? 'text-success' : 'text-danger'}`}>
                  <Printer className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{printerConnected ? 'Printer Connected' : 'Printer Offline'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${cashRegisterOpen ? 'text-success' : 'text-warning'}`}>
                  <CircleDollarSign className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{cashRegisterOpen ? 'Register Open' : 'Register Closed'}</TooltipContent>
            </Tooltip>
          </div>

          {/* Restaurant selector */}
          {isSuperAdmin ? (
            <Select value={selectedRestaurantId} onValueChange={(v) => dispatch(setRestaurant(v))}>
              <SelectTrigger className="w-[160px] h-9 hidden xl:flex">
                <SelectValue placeholder="Restaurant" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary" className="hidden xl:flex h-9 px-3">
              {user?.tenant?.name ?? 'Current restaurant'}
            </Badge>
          )}




          {/* Branch selector */}
          <Select value={selectedBranchId} onValueChange={(v) => dispatch(setBranch(v))}>
            <SelectTrigger className="w-[140px] h-9 hidden xl:flex">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {(branches as Array<{ id: string; name: string }>).map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>



          {/* Shift status — close only when shift is open */}
          {currentShift && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden md:flex gap-1.5"
                  onClick={() => onCloseShift?.()}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Close Shift
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Shift open since {new Date(currentShift.openedAt).toLocaleTimeString()}
              </TooltipContent>
            </Tooltip>
          )}

          {/* App updates */}
          <AppUpdateButton />

          {/* Lock screen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => lockScreen().catch(() => {})}>
                <Lock className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lock Screen</TooltipContent>
          </Tooltip>

          {/* Quick action */}
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

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem key={lang.code} onClick={() => dispatch(setLanguage(lang.code))}>
                  <span className="mr-2">{lang.flag}</span> {lang.label}
                  {language === lang.code && <Badge variant="secondary" className="ml-auto text-[10px]">Active</Badge>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dark mode */}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => dispatch(toggleDarkMode())}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9 relative" onClick={() => navigate(`${APP_BASE}/notifications`)}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Profile */}
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
