import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Command } from 'cmdk'
import { Search, LayoutDashboard, ShoppingCart, Users, Settings } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { NAVIGATION, QUICK_ACTIONS, APP_BASE } from '@/constants/navigation'
import { setCommandPaletteOpen } from '@/store/slices/appSlice'
import type { RootState } from '@/store'

export function CommandPalette() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const open = useSelector((s: RootState) => s.app.commandPaletteOpen)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        dispatch(setCommandPaletteOpen(true))
      }
      if (e.key === 'Escape') {
        dispatch(setCommandPaletteOpen(false))
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [dispatch])

  const run = (href: string) => {
    dispatch(setCommandPaletteOpen(false))
    navigate(href)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(v) => dispatch(setCommandPaletteOpen(v))}>
      <DialogContent className="overflow-hidden p-0 max-w-lg">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input placeholder="Search pages, actions..." className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none" />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty>No results found.</Command.Empty>
            <Command.Group heading="Quick Actions">
              {QUICK_ACTIONS.map((action) => (
                <Command.Item key={action.id} onSelect={() => run(action.href)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  {action.title}
                  <span className="ml-auto text-xs text-muted-foreground">{action.shortcut}</span>
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Pages">
              {NAVIGATION.map((item) => (
                <Command.Item key={item.id} onSelect={() => run(item.href)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.title}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Settings">
              <Command.Item onSelect={() => run(`${APP_BASE}/settings`)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <Settings className="h-4 w-4 text-muted-foreground" /> Settings
              </Command.Item>
              <Command.Item onSelect={() => run(APP_BASE)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Dashboard
              </Command.Item>
              <Command.Item onSelect={() => run(`${APP_BASE}/customers`)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent">
                <Users className="h-4 w-4 text-muted-foreground" /> Customers
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
