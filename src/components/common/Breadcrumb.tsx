import { ChevronRight, Home } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAVIGATION } from '@/constants/navigation'

export function Breadcrumb() {
  const location = useLocation()
  const path = location.pathname

  const findNavItem = (href: string) => {
    for (const item of NAVIGATION) {
      if (item.href === href) return item
      if (item.children) {
        const child = item.children.find((c) => c.href === href)
        if (child) return child
      }
    }
    return null
  }

  const segments = path.split('/').filter(Boolean)
  const crumbs = [{ label: 'Home', href: '/' }]

  let currentPath = ''
  segments.forEach((seg) => {
    currentPath += `/${seg}`
    const nav = findNavItem(currentPath)
    crumbs.push({ label: nav?.title || seg.charAt(0).toUpperCase() + seg.slice(1), href: currentPath })
  })

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <div key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link to={crumb.href} className={cn('hover:text-foreground transition-colors flex items-center gap-1')}>
              {i === 0 && <Home className="h-3.5 w-3.5" />}
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
