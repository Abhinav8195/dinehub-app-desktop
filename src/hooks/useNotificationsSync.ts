import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notificationsApi, type NotificationItem } from '@/api/notifications.api'
import { setNotifications, addNotification } from '@/store/slices/notificationsSlice'
import { onSocketEvent } from '@/lib/socket'
import { playOrderBell, playWaiterBell } from '@/lib/orderBell'
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

function orderLabel(payload: unknown): string {
  const data = payload as {
    orderNumber?: string
    order?: { orderNumber?: string }
  }
  return data?.order?.orderNumber || data?.orderNumber || 'New order'
}

const WAITER_MOTIVE_LABELS: Record<string, string> = {
  WAITER: 'Call waiter',
  WATER: 'Water',
  BILL: 'Bill request',
  CLEAN_TABLE: 'Clean table',
  ASSISTANCE: 'Assistance',
  OTHER: 'Other',
}

function waiterMotiveLabel(type?: string | null) {
  const key = (type || 'WAITER').toUpperCase().replace(/\s+/g, '_')
  return WAITER_MOTIVE_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function resolveWaiterTable(payload: Record<string, unknown>, request: Record<string, unknown>): string | null {
  const table = (request.table ?? payload.table) as { number?: number | string; label?: string; name?: string } | undefined
  if (table?.label?.trim()) return table.label.trim()
  if (table?.name?.trim()) return table.name.trim()
  const number =
    table?.number
    ?? request.tableNumber
    ?? payload.tableNumber
    ?? (typeof request.tableLabel === 'string' ? request.tableLabel : null)
  if (number == null || number === '') return null
  const raw = String(number).trim()
  if (/^t-?\d+/i.test(raw) || /^table\s/i.test(raw)) return raw.replace(/^t(?=\d)/i, 'T-')
  if (/^\d+$/.test(raw)) return `T-${raw}`
  return raw
}

function parseWaiterPayload(payload: unknown): {
  motive: string
  table: string | null
  note: string
} {
  const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const request = (
    data.request && typeof data.request === 'object'
      ? data.request
      : data
  ) as Record<string, unknown>

  const motive = waiterMotiveLabel(
    (request.type as string | undefined)
    ?? (data.type as string | undefined)
    ?? (request.motive as string | undefined),
  )
  const table = resolveWaiterTable(data, request)
  const note = String(
    request.message
    ?? data.message
    ?? request.note
    ?? data.note
    ?? '',
  ).trim()

  return { motive, table, note }
}

export function useNotificationsSync(enabled: boolean) {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const lastBellAt = useRef(0)
  const invalidateTimers = useRef<Map<string, number>>(new Map())

  const softInvalidate = (queryKey: string[]) => {
    const key = queryKey.join(':')
    const existing = invalidateTimers.current.get(key)
    if (existing) window.clearTimeout(existing)
    const timer = window.setTimeout(() => {
      invalidateTimers.current.delete(key)
      void queryClient.invalidateQueries({ queryKey })
    }, 750)
    invalidateTimers.current.set(key, timer)
  }

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
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

    const announceNewOrder = (payload: unknown, source: 'pos' | 'qr') => {
      const now = Date.now()
      // Debounce double emit (new_order + qr-order.created for the same QR sale)
      if (now - lastBellAt.current < 1500) {
        softInvalidate(['orders'])
        softInvalidate(['dashboard', 'stats'])
        return
      }
      lastBellAt.current = now
      const number = orderLabel(payload)
      playOrderBell()
      toast.success(source === 'qr' ? `QR order ${number}` : `New order ${number}`, {
        description: 'Ring — check Orders / POS',
        duration: 6000,
      })
      window.electronAPI.notify.show(
        source === 'qr' ? 'New QR order' : 'New order',
        `${number} just came in`,
      ).catch(() => {})
      softInvalidate(['orders'])
      softInvalidate(['dashboard', 'stats'])
      softInvalidate(['notifications'])
    }

    const onNotification = (payload: NotificationItem) => {
      dispatch(addNotification(toNotification(payload)))
      softInvalidate(['notifications'])
    }

    const onOrderUpdated = () => {
      softInvalidate(['orders'])
      softInvalidate(['dashboard', 'stats'])
    }

    const onWaiterRequested = (payload: unknown) => {
      softInvalidate(['waiter-requests'])
      const { motive, table, note } = parseWaiterPayload(payload)
      const title = table ? `Table ${table}` : 'Waiter call'
      const description = note
        ? `Motive: ${motive} · ${note}`
        : `Motive: ${motive}`
      const desktopBody = [table ? `Table ${table}` : null, `Motive: ${motive}`, note || null]
        .filter(Boolean)
        .join(' · ')

      playWaiterBell()
      toast.warning(title, {
        description,
        duration: 8000,
      })
      window.electronAPI.notify.show(title, desktopBody).catch(() => {})
    }

    const onWaiterUpdated = () => {
      softInvalidate(['waiter-requests'])
    }

    const onTableStatusUpdated = () => {
      softInvalidate(['tables'])
    }

    const onLowStockAlert = () => {
      softInvalidate(['inventory'])
    }

    // Register on the facade even before the socket finishes connecting
    // (AuthProvider connects asynchronously after this effect may run).
    const unsubs = [
      onSocketEvent('notification', onNotification),
      onSocketEvent('new_order', (payload) => announceNewOrder(payload, 'pos')),
      onSocketEvent('qr-order.created', (payload) => announceNewOrder(payload, 'qr')),
      onSocketEvent('order_status_updated', onOrderUpdated),
      onSocketEvent('kitchen_order_updated', onOrderUpdated),
      onSocketEvent('waiter.requested', onWaiterRequested),
      onSocketEvent('waiter_call_alert', onWaiterRequested),
      onSocketEvent('waiter.acknowledged', onWaiterUpdated),
      onSocketEvent('waiter.completed', onWaiterUpdated),
      onSocketEvent('waiter.cancelled', onWaiterUpdated),
      onSocketEvent('table_status_updated', onTableStatusUpdated),
      onSocketEvent('low_stock_alert', onLowStockAlert),
    ]

    return () => {
      unsubs.forEach((unsub) => unsub())
      invalidateTimers.current.forEach((timer) => window.clearTimeout(timer))
      invalidateTimers.current.clear()
    }
  }, [enabled, dispatch, queryClient])
}
