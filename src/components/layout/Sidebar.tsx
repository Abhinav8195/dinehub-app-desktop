import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Search, Star, Pin } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { AppFooter } from '@/components/brand/AppFooter'
import { NAVIGATION, type NavItem } from '@/constants/navigation'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toggleSidebar, toggleFavorite } from '@/store/slices/appSlice'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { canAccessNav } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { RootState } from '@/store'

export function Sidebar() {
  const location = useLocation()
  const dispatch = useDispatch()
  const { sidebarCollapsed, favorites, pinnedMenus } = useSelector((s: RootState) => s.app)
  const { user } = useAuth()
  const { permissions, roles, isSuperAdmin } = usePermissions()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string[]>(['menu', 'inventory', 'users'])

  const canSee = (item: NavItem) =>
    canAccessNav(item.permission, permissions, roles, isSuperAdmin, item.superAdminOnly)

  const filterBySearch = (items: NavItem[]) => {
    const visible = items.filter(canSee)
    if (!search) return visible
    return visible.filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.children?.some((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    )
  }

  const allVisible = filterBySearch(NAVIGATION)
  const pinnedIds = new Set(pinnedMenus)
  const favoriteIds = new Set(favorites)

  const pinnedItems = allVisible.filter((item) => pinnedIds.has(item.id))
  const favoriteItems = allVisible.filter((item) => favoriteIds.has(item.id) && !pinnedIds.has(item.id))
  const mainItems = allVisible.filter((item) => !pinnedIds.has(item.id) && !favoriteIds.has(item.id))

  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive =
      location.pathname === item.href ||
      (item.href !== '/' && location.pathname.startsWith(item.href + '/')) ||
      (item.href !== '/' && location.pathname.startsWith(item.href))
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expanded.includes(item.id)
    const visibleChildren = item.children?.filter(canSee) ?? []

    const linkEl = (
      <Link
        to={item.href}
        className={cn(
          'flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 min-w-0',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-sidebar-foreground hover:bg-sidebar-accent',
          sidebarCollapsed && 'justify-center px-2',
          depth > 0 && 'ml-2'
        )}
      >
        <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0',
                  isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary'
                )}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    )

    const row = (
      <div className="group flex items-center w-full min-w-0">
        {linkEl}
        {!sidebarCollapsed && (
          <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); dispatch(toggleFavorite(item.id)) }}
              className="p-1 rounded hover:bg-sidebar-accent"
            >
              <Star className={cn('h-3.5 w-3.5', favorites.includes(item.id) ? 'fill-warning text-warning' : 'text-muted-foreground')} />
            </button>
            {hasChildren && visibleChildren.length > 0 && (
              <button type="button" onClick={() => toggleExpand(item.id)} className="p-1 rounded hover:bg-sidebar-accent">
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
              </button>
            )}
          </div>
        )}
      </div>
    )

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{row}</TooltipTrigger>
          <TooltipContent side="right">{item.title}</TooltipContent>
        </Tooltip>
      )
    }

    return (
      <div key={item.id}>
        {row}
        <AnimatePresence>
          {hasChildren && isExpanded && visibleChildren.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-0.5 pl-2 border-l border-sidebar-border ml-4">
                {visibleChildren.map((child) => renderNavItem(child, depth + 1))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col border-r border-sidebar-border bg-sidebar h-full shrink-0 z-20"
      >
        <div className={cn('flex items-center h-16 px-4 border-b border-sidebar-border shrink-0', sidebarCollapsed && 'justify-center px-2')}>
          <BrandLogo size="sm" showText={!sidebarCollapsed} />
        </div>

        {!sidebarCollapsed && (
          <div className="px-3 py-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-sidebar-accent border-none"
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 px-3">
          <div className="space-y-4 pb-4">
            {!sidebarCollapsed && pinnedItems.length > 0 && (
              <section>
                <p className="flex items-center gap-1.5 px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Pin className="h-3 w-3" /> Pinned
                </p>
                <div className="space-y-0.5">{pinnedItems.map((item) => renderNavItem(item))}</div>
              </section>
            )}

            {!sidebarCollapsed && favoriteItems.length > 0 && (
              <section>
                <p className="flex items-center gap-1.5 px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Star className="h-3 w-3" /> Favorites
                </p>
                <div className="space-y-0.5">{favoriteItems.map((item) => renderNavItem(item))}</div>
              </section>
            )}

            <section>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Main Menu</p>
              )}
              <div className="space-y-0.5">{mainItems.map((item) => renderNavItem(item))}</div>
            </section>
          </div>
        </ScrollArea>

        <div className="border-t border-sidebar-border shrink-0">
          {!sidebarCollapsed && <AppFooter className="px-3 pt-2" />}
          <div className="p-3">
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="flex w-full items-center justify-center rounded-xl p-2 hover:bg-sidebar-accent transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}
