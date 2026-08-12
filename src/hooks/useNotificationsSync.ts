import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notificationsApi, type NotificationItem } from '@/api/notifications.api'
import { setNotifications, addNotification } from '@/store/slices/notificationsSlice'
import { getSocket } from '@/lib/socket'
import type { Notification } from '@/types'

function mapType(type: string): Notification['type'] {
  const m: Record<string, Notification['type']> = {
    ORDER: 'info',
    KITCHEN: 'success',
    INVENTORY: 'warning',
    SYSTEM: 'info',
    PAYMENT: 'success',
  }
  return m[type] ?? 'info'
}

function toNotification(n: NotificationItem): Notification {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: mapType(n.type),
    read: n.isRead,
    createdAt: n.createdAt,
  }
}

export function useNotificationsSync(enabled: boolean) {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    enabled,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!data) return
    dispatch(
      setNotifications({
        items: data.notifications.map(toNotification),
        unreadCount: data.unreadCount,
      }),
    )
  }, [data, dispatch])

  useEffect(() => {
    if (!enabled) return

    const socket = getSocket()
    if (!socket) return

    const onNotification = (payload: NotificationItem) => {
      dispatch(addNotification(toNotification(payload)))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }

    const onOrder = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }

    const onWaiterRequested = (payload: {
      request?: { type?: string; message?: string; tableId?: string }
    }) => {
      queryClient.invalidateQueries({ queryKey: ['waiter-requests'] })
      const type = payload.request?.type?.replace(/_/g, ' ') ?? 'WAITER'
      const message = payload.request?.message || 'A table requested assistance'
      toast.warning(`${type}: ${message}`)
      window.electronAPI.notify.show(`New ${type.toLowerCase()} request`, message).catch(() => {})
    }

    const onWaiterUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-requests'] })
    }

    const onTableStatusUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    }

    const onLowStockAlert = () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    }

    socket.on('notification', onNotification)
    socket.on('new_order', onOrder)
    socket.on('qr-order.created', onOrder)
    socket.on('order_status_updated', onOrder)
    socket.on('kitchen_order_updated', onOrder)
    socket.on('waiter.requested', onWaiterRequested)
    socket.on('waiter.acknowledged', onWaiterUpdated)
    socket.on('waiter.completed', onWaiterUpdated)
    socket.on('waiter.cancelled', onWaiterUpdated)
    socket.on('table_status_updated', onTableStatusUpdated)
    socket.on('low_stock_alert', onLowStockAlert)

    return () => {
      socket.off('notification', onNotification)
      socket.off('new_order', onOrder)
      socket.off('qr-order.created', onOrder)
      socket.off('order_status_updated', onOrder)
      socket.off('kitchen_order_updated', onOrder)
      socket.off('waiter.requested', onWaiterRequested)
      socket.off('waiter.acknowledged', onWaiterUpdated)
      socket.off('waiter.completed', onWaiterUpdated)
      socket.off('waiter.cancelled', onWaiterUpdated)
      socket.off('table_status_updated', onTableStatusUpdated)
      socket.off('low_stock_alert', onLowStockAlert)
    }
  }, [enabled, dispatch, queryClient])
}
