import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Bell, ChevronDown, Globe, Moon, Search, Sun, Wifi, WifiOff,
  Printer, CircleDollarSign, Plus, Command, Lock, Clock
} from 'lucide-react'
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
import { RESTAURANTS, BRANCHES, LANGUAGES } from '@/constants/navigation'
import { setRestaurant, setBranch, setLanguage, toggleDarkMode, setCommandPaletteOpen } from '@/store/slices/appSlice'
import { useAuth } from '@/hooks/useAuth'
import { useShiftStore } from '@/store/shiftStore'
import { APP_BASE } from '@/constants/navigation'
import { getInitials } from '@/lib/utils'

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

  const restaurant = RESTAURANTS.find((r) => r.id === selectedRestaurantId)
  const branches = BRANCHES.filter((b) => b.restaurantId === selectedRestaurantId)

  return (
    <TooltipProvider>
      <header className="flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Breadcrumb />
        </div>

        <div className="flex items-center gap-2">




          {/* Branch selector */}
          <Select value={selectedBranchId} onValueChange={(v) => dispatch(setBranch(v))}>
            <SelectTrigger className="w-[140px] h-9 hidden md:flex">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
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
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.roles?.[0] || 'user'}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
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
