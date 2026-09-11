import { useEffect, useMemo, useState } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toggleSidebar, toggleFavorite, togglePinnedMenu } from '@/store/slices/appSlice'
import { usePermissions } from '@/hooks/usePermissions'
import { canAccessNav } from '@/lib/permissions'
import { filterNavigation } from '@/lib/navigation-access'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { cn } from '@/lib/utils'
import type { RootState } from '@/store'
import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/api/settings.api'
import { dashboardApi } from '@/api/dashboard.api'
import { useAuth } from '@/hooks/useAuth'

export function Sidebar() {
  const location = useLocation()
  const dispatch = useDispatch()
  const { sidebarCollapsed, favorites, pinnedMenus, selectedRestaurantId } = useSelector((s: RootState) => s.app)
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount)
  const { user } = useAuth()
  const { permissions, roles, isSuperAdmin } = usePermissions()
  const { hasFeature } = useFeatureAccess()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string[]>(['menu', 'inventory', 'users', 'reports'])
  const { data: restaurant } = useQuery({ queryKey: ['settings', 'restaurant'], queryFn: settingsApi.getRestaurant, staleTime: 60_000 })
  // Show KOT / Kitchen whenever admin feature is on, restaurant KOT setting is on,
  // or staff already has kitchen/POS access (so the nav item is never "missing").
  const kitchenFeatureOn = hasFeature('KOT_KITCHEN')
  const kotSettingOn = restaurant?.kotEnabled !== false
  const showKitchenNav = kitchenFeatureOn || kotSettingOn
  const tenantId = user?.isSuperAdmin || user?.userType === 'SUPER_ADMIN'
    ? selectedRestaurantId
    : user?.tenantId
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', 'stats', tenantId],
    queryFn: () => dashboardApi.getStats(tenantId),
    enabled: Boolean(tenantId),
    refetchInterval: 30_000,
  })

  const navigationWithLiveBadges = useMemo(() => NAVIGATION.map((item) => {
    let badge = item.badge
    if (item.id === 'orders') badge = dashboard?.stats.orders.value || undefined
    if (item.id === 'kitchen') badge = dashboard?.kitchenQueue || undefined
    if (item.id === 'reservations') badge = dashboard?.tables.reserved || undefined
    if (item.id === 'notifications') badge = unreadCount || undefined
    if (item.id === 'inventory') badge = undefined
    return badge === item.badge ? item : { ...item, badge }
  }), [dashboard, unreadCount])

  const canSee = (item: NavItem) =>
    canAccessNav(item.permission, permissions, roles, isSuperAdmin, item.superAdminOnly)

  const allVisible = useMemo(() => {
    let visible = filterNavigation(navigationWithLiveBadges, {
      canPermission: canSee,
      // Treat KOT as available when Kitchen Display / KOT feature OR POS is enabled,
      // so the sidebar entry is not dropped by a missing flag row.
      hasFeature: (feature) => {
        if (feature === 'KOT_KITCHEN') {
          return hasFeature('KOT_KITCHEN') || hasFeature('POS') || kotSettingOn
        }
        if (feature === 'REPORTS') {
          return hasFeature('REPORTS')
        }
        return hasFeature(feature)
      },
    }).filter((item) => !item.hideInSidebar)

    const kitchen = navigationWithLiveBadges.find((item) => item.id === 'kitchen')
    if (kitchen && canSee(kitchen) && showKitchenNav && !visible.some((item) => item.id === 'kitchen')) {
      const insertAfter = visible.findIndex((item) => item.id === 'orders' || item.id === 'pos')
      visible = [...visible]
      visible.splice(insertAfter >= 0 ? insertAfter + 1 : 0, 0, kitchen)
    }

    const reports = navigationWithLiveBadges.find((item) => item.id === 'reports')
    // Soft-unlock: show Reports whenever hasFeature('REPORTS') is true (includes
    // restaurants that only have POS/Orders/etc. enabled).
    if (reports && canSee(reports) && hasFeature('REPORTS') && !visible.some((item) => item.id === 'reports')) {
      const insertAfter = visible.findIndex((item) => item.id === 'crm' || item.id === 'customers' || item.id === 'reservations')
      visible = [...visible]
      visible.splice(insertAfter >= 0 ? insertAfter : visible.length, 0, reports)
    }

    const query = search.trim().toLowerCase()
    if (!query) return visible

    return visible.flatMap((item) => {
      if (item.title.toLowerCase().includes(query)) return [item]
      const matchingChildren = item.children?.filter((child) => child.title.toLowerCase().includes(query))
      return matchingChildren?.length ? [{ ...item, children: matchingChildren }] : []
    })
  }, [search, permissions, roles, isSuperAdmin, hasFeature, showKitchenNav, kotSettingOn, navigationWithLiveBadges])
  const pinnedIds = new Set(pinnedMenus)
  const favoriteIds = new Set(favorites)

  const pinnedItems = allVisible.filter((item) => pinnedIds.has(item.id))
  const favoriteItems = allVisible.filter((item) => favoriteIds.has(item.id) && !pinnedIds.has(item.id))
  const mainItems = allVisible.filter((item) => !pinnedIds.has(item.id) && !favoriteIds.has(item.id))
  const collapsedItems = allVisible

  useEffect(() => {
    const activeParent = allVisible.find((item) =>
      item.children?.some((child) => {
        const [childPath, childQuery = ''] = child.href.split('?')
        if (childQuery) {
          return location.pathname === childPath && location.search === `?${childQuery}`
        }
        return location.pathname === child.href || location.pathname.startsWith(child.href + '/')
      })
      || (item.id === 'reports' && location.pathname.startsWith('/app/reports')),
    )
    if (activeParent) {
      setExpanded((current) => current.includes(activeParent.id) ? current : [...current, activeParent.id])
    }
  }, [location.pathname])

  useEffect(() => {
    if (!search.trim()) return
    const parentIds = allVisible.filter((item) => item.children?.length).map((item) => item.id)
    setExpanded((current) => Array.from(new Set([...current, ...parentIds])))
  }, [search])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const [itemPath, itemQuery = ''] = item.href.split('?')
    const isActive = itemQuery
      ? location.pathname === itemPath && location.search === `?${itemQuery}`
      : location.pathname === item.href ||
        (item.href !== '/app' && item.href !== '/' && location.pathname.startsWith(item.href + '/'))
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expanded.includes(item.id)
    const visibleChildren = (item.children ?? []).filter((child) =>
      canSee(child) && (!child.feature || hasFeature(child.feature))
    )

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
            {depth === 0 && (
              <>
                <button
                  type="button"
                  aria-label={pinnedMenus.includes(item.id) ? `Unpin ${item.title}` : `Pin ${item.title}`}
                  title={pinnedMenus.includes(item.id) ? 'Unpin' : 'Pin'}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); dispatch(togglePinnedMenu(item.id)) }}
                  className="p-1 rounded hover:bg-sidebar-accent"
                >
                  <Pin className={cn('h-3.5 w-3.5', pinnedMenus.includes(item.id) ? 'fill-primary text-primary' : 'text-muted-foreground')} />
                </button>
                <button
                  type="button"
                  aria-label={favorites.includes(item.id) ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
                  title={favorites.includes(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); dispatch(toggleFavorite(item.id)) }}
                  className="p-1 rounded hover:bg-sidebar-accent"
                >
                  <Star className={cn('h-3.5 w-3.5', favorites.includes(item.id) ? 'fill-warning text-warning' : 'text-muted-foreground')} />
                </button>
              </>
            )}
            {hasChildren && visibleChildren.length > 0 && (
              <button type="button" onClick={() => toggleExpand(item.id)} className="p-1 rounded hover:bg-sidebar-accent">
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
              </button>
            )}
          </div>
        )}
      </div>
    )

    // Collapsed sidebar: show a right-side flyout so Reports / Menu / etc. children stay reachable.
    if (sidebarCollapsed) {
      if (visibleChildren.length > 0) {
        const childActive = visibleChildren.some((child) => {
          const [childPath, childQuery = ''] = child.href.split('?')
          return childQuery
            ? location.pathname === childPath && location.search === `?${childQuery}`
            : location.pathname === child.href || location.pathname.startsWith(child.href + '/')
        })
        return (
          <DropdownMenu key={item.id}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={item.title}
                aria-label={item.title}
                className={cn(
                  'flex w-full items-center justify-center rounded-xl px-2 py-2.5 transition-all duration-200',
                  isActive || childActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent',
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px] shrink-0', (isActive || childActive) ? 'text-primary-foreground' : 'text-muted-foreground')} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={10} className="min-w-[200px]">
              <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={item.href} className="cursor-pointer">
                  All {item.title}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {visibleChildren.map((child) => (
                <DropdownMenuItem key={child.id} asChild>
                  <Link to={child.href} className="cursor-pointer gap-2">
                    <child.icon className="h-4 w-4 text-muted-foreground" />
                    {child.title}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }

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
        animate={{ width: sidebarCollapsed ? 56 : 232 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col border-r border-sidebar-border bg-sidebar h-full shrink-0 z-20"
      >
        <div className={cn('flex items-center h-16 px-3 border-b border-sidebar-border shrink-0', sidebarCollapsed && 'justify-center px-1')}>
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
              <div className="space-y-0.5">
                {(sidebarCollapsed ? collapsedItems : mainItems).map((item) => renderNavItem(item))}
              </div>
            </section>
            {!sidebarCollapsed && search.trim() && allVisible.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No menu items match “{search.trim()}”.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-sidebar-border shrink-0">
          {!sidebarCollapsed && <AppFooter className="px-3 pt-2" />}
          <div className="p-3">
          <button
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
