import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

    socket.on('notification', onNotification)
    socket.on('new_order', onOrder)
    socket.on('order_status_updated', onOrder)
    socket.on('kitchen_order_updated', onOrder)
    socket.on('table_status_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    })
    socket.on('low_stock_alert', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    })

    return () => {
      socket.off('notification', onNotification)
      socket.off('new_order', onOrder)
      socket.off('order_status_updated', onOrder)
      socket.off('kitchen_order_updated', onOrder)
      socket.off('table_status_updated')
      socket.off('low_stock_alert')
    }
  }, [enabled, dispatch, queryClient])
}
