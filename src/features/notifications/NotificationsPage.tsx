import { Bell, CheckCheck, Trash2, ChefHat, ShoppingBag, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notificationsApi } from '@/api/notifications.api'
import { useNotificationsSync } from '@/hooks/useNotificationsSync'
import { useDispatch, useSelector } from 'react-redux'
import { markAsRead } from '@/store/slices/notificationsSlice'
import type { RootState } from '@/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const typeIcons: Record<string, React.ReactNode> = {
  info: <ShoppingBag className="h-4 w-4 text-info" />,
  success: <ChefHat className="h-4 w-4 text-success" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
  danger: <AlertTriangle className="h-4 w-4 text-danger" />,
}

export default function NotificationsPage() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { items } = useSelector((s: RootState) => s.notifications)

  useNotificationsSync(true)

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: (_, id) => {
      dispatch(markAsRead(id))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
  })

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="Notifications"
          description="Order alerts, kitchen updates, and system notifications"
          actions={
            <Button
              variant="outline"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
            </Button>
          }
        />

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="kitchen">Kitchen</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3 mt-4">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No notifications yet</p>
          )}
          {items.map((notif) => (
            <Card key={notif.id} className={cn('transition-all hover:shadow-card', !notif.read && 'border-primary/30 bg-primary/5')}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {typeIcons[notif.type] || <Bell className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{notif.title}</p>
                    {!notif.read && <Badge variant="default" className="text-[10px]">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!notif.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate(notif.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
