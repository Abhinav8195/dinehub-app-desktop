import { Link, useNavigate } from 'react-router-dom'
import {
  Bell, ChefHat, LayoutGrid, LogOut, Menu, Plus, Power, Search, User, Zap,
} from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/constants/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { APP_BASE } from '@/constants/navigation'
import { cn } from '@/lib/utils'

export type PosLayoutMode = 'fast' | 'normal'

interface PosHeaderProps {
  userName?: string
  unreadCount?: number
  billSearch: string
  onBillSearchChange: (value: string) => void
  onBillSearchSubmit?: () => void
  onNewOrder: () => void
  onOpenTables: () => void
  onOpenMenu?: () => void
  onLogout: () => void
  viewMode: 'order' | 'tables'
  layoutMode: PosLayoutMode
  onLayoutModeChange: (mode: PosLayoutMode) => void
}

export function PosHeader({
  userName,
  unreadCount = 0,
  billSearch,
  onBillSearchChange,
  onBillSearchSubmit,
  onNewOrder,
  onOpenTables,
  onOpenMenu,
  onLogout,
  viewMode,
  layoutMode,
  onLayoutModeChange,
}: PosHeaderProps) {
  const navigate = useNavigate()

  const openKitchen = () => {
    navigate(`${APP_BASE}/kitchen`)
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-2 xl:px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onOpenMenu} title="Navigation">
          <Menu className="h-4 w-4" />
        </Button>
        <BrandLogo size="xs" showText={false} />
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-bold leading-none">{BRAND.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {layoutMode === 'fast' ? 'Fast POS' : 'Normal POS'}
          </p>
        </div>
      </div>

      <div className="mx-1 flex flex-1 items-center justify-center gap-1.5 xl:gap-2">
        <div className="flex shrink-0 rounded-lg border bg-background p-0.5">
          <button
            type="button"
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors',
              layoutMode === 'fast' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onLayoutModeChange('fast')}
            title="Fast counter layout"
          >
            <Zap className="h-3 w-3" />
            Fast
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors',
              layoutMode === 'normal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onLayoutModeChange('normal')}
            title="Simple classic layout"
          >
            Normal
          </button>
        </div>

        <Button type="button" size="sm" className="h-8 shrink-0 gap-1 px-2.5" onClick={onNewOrder}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden md:inline">New Order</span>
        </Button>
        {layoutMode === 'fast' && (
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'tables' ? 'default' : 'outline'}
            className="h-8 shrink-0 gap-1 px-2.5"
            onClick={onOpenTables}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Tables</span>
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1 px-2.5"
          title="Open Kitchen Display (F4)"
          onClick={openKitchen}
        >
          <ChefHat className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Kitchen</span>
        </Button>
        <div className="relative hidden min-w-[140px] max-w-[220px] flex-1 lg:block">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={billSearch}
            onChange={(e) => onBillSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onBillSearchSubmit?.()
              }
            }}
            placeholder="Bill / order #"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="relative h-8 w-8" asChild>
          <Link to={`${APP_BASE}/notifications`}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[9px]" variant="destructive">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Link>
        </Button>
        <div className={cn('hidden items-center gap-1.5 rounded-lg border px-2 py-1 md:flex')}>
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[100px] truncate text-xs font-medium">{userName || 'Staff'}</span>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-danger" title="Logout" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Close POS" asChild>
          <Link to={`${APP_BASE}/dashboard`}>
            <Power className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  )
}
