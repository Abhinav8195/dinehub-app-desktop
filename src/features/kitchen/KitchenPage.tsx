import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Clock, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ordersApi } from '@/api/orders.api'
import { withOfflineCache } from '@/lib/offline'
import type { PosOrder } from '@/api/types/pos.types'
import { BRAND } from '@/constants/brand'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { cn } from '@/lib/utils'
import { preparationTransitionStatuses } from './kitchen-utils'

function getOrderLabel(order: PosOrder) {
  if (order.table?.label) return order.table.label
  if (order.table?.number != null) return `T-${order.table.number}`
  if (order.type === 'takeaway') return 'Takeaway'
  if (order.type === 'delivery') return 'Delivery'
  if (order.type === 'online') return 'Online'
  return 'Dine In'
}

function getElapsedMinutes(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
}

function formatElapsed(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

function shortOrderNote(instructions?: string | null) {
  if (!instructions?.trim()) return null
  // Drop internal POS meta so kitchen only sees useful notes.
  const cleaned = instructions
    .split('·')
    .map((part) => part.trim())
    .filter((part) => part && !/^KOT/i.test(part) && !/^Guests?:/i.test(part) && !/^Waiter:/i.test(part))
    .join(' · ')
  return cleaned || null
}

const KITCHEN_STATUSES = ['pending', 'confirmed', 'preparing', 'ready']

export default function KitchenPage() {
  const [filter, setFilter] = useState('all')
  const queryClient = useQueryClient()

  const { data: allOrders = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['orders'],
    queryFn: () => withOfflineCache('orders:list', () => ordersApi.list().then((result) => result.orders)),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const kitchenOrders = useMemo(
    () => allOrders.filter((o) => KITCHEN_STATUSES.includes(o.status)),
    [allOrders],
  )

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return kitchenOrders
    if (filter === 'preparing') return kitchenOrders.filter((o) => ['pending', 'confirmed', 'preparing'].includes(o.status))
    return kitchenOrders.filter((o) => o.status === filter)
  }, [kitchenOrders, filter])

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, currentStatus }: { id: string; status: string; currentStatus?: string }) => {
      if (currentStatus && status === 'PREPARING') {
        let updated: PosOrder | undefined
        for (const nextStatus of preparationTransitionStatuses(currentStatus)) {
          updated = await ordersApi.updateStatus(id, nextStatus)
        }
        return updated as PosOrder
      }
      return ordersApi.updateStatus(id, status)
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      if (String(order.status).toUpperCase() === 'COMPLETED' && order.table) {
        toast.success(`Order ${order.orderNumber} complete · clear table when guest leaves`)
      } else {
        toast.success(`${order.orderNumber} → ${order.status}`)
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update order'),
  })

  const handleReady = (id: string) => statusMutation.mutate({ id, status: 'READY' })
  const handleComplete = (id: string) => statusMutation.mutate({ id, status: 'COMPLETED' })
  const handleReject = (id: string) => statusMutation.mutate({ id, status: 'CANCELLED' })
  const handleStartPreparing = (order: PosOrder) =>
    statusMutation.mutate({ id: order.id, status: 'PREPARING', currentStatus: order.status })

  const counts = useMemo(() => ({
    all: kitchenOrders.length,
    preparing: kitchenOrders.filter((o) => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
    ready: kitchenOrders.filter((o) => o.status === 'ready').length,
  }), [kitchenOrders])

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0f1218] text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo size="xs" showText={false} />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight">Kitchen Display</h1>
            <p className="truncate text-[10px] text-white/45">{BRAND.name} · live queue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-white/15 bg-transparent px-2 text-[11px] text-white hover:bg-white/10 hover:text-white"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('mr-1 h-3 w-3', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-7 bg-white/10 p-0.5">
              <TabsTrigger value="all" className="h-6 px-2 text-[10px]">All {counts.all}</TabsTrigger>
              <TabsTrigger value="preparing" className="h-6 px-2 text-[10px]">Prep {counts.preparing}</TabsTrigger>
              <TabsTrigger value="ready" className="h-6 px-2 text-[10px]">Ready {counts.ready}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-white/50">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/50">
            <p className="text-sm">Could not load kitchen queue</p>
            <Button variant="outline" size="sm" className="border-white/20 bg-transparent text-white" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-20 text-white/45">
            <p className="text-sm font-medium">No active orders</p>
            <p className="text-xs">New KOT tickets appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredOrders.map((order) => {
              const elapsed = getElapsedMinutes(order.createdAt)
              const isHighPriority = elapsed >= 10
              const isReady = order.status === 'ready'
              const isPending = order.status === 'pending' || order.status === 'confirmed'
              const isUpdating = statusMutation.isPending && statusMutation.variables?.id === order.id
              const note = shortOrderNote(order.instructions)

              return (
                <motion.article
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex flex-col overflow-hidden rounded-xl border bg-white/[0.04] shadow-sm',
                    isReady && 'border-emerald-400/50 bg-emerald-500/10',
                    isHighPriority && !isReady && 'border-rose-400/60 bg-rose-500/[0.08]',
                    !isReady && !isHighPriority && 'border-white/10',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-start justify-between gap-2 px-2.5 py-2',
                      isReady ? 'bg-emerald-500/15' : isHighPriority ? 'bg-rose-500/15' : 'bg-white/[0.03]',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold leading-none tracking-tight">{order.orderNumber}</p>
                      <p className="mt-1 truncate text-[10px] text-white/55">
                        {getOrderLabel(order)}
                        {order.customer?.name ? ` · ${order.customer.name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {isHighPriority && !isReady && <AlertTriangle className="h-3 w-3 text-rose-300" />}
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                          isReady ? 'bg-emerald-500/20 text-emerald-200' : isHighPriority ? 'bg-rose-500/20 text-rose-200' : 'bg-amber-500/15 text-amber-200',
                        )}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {formatElapsed(elapsed)}
                      </span>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-1 px-2.5 py-2">
                    {order.items.map((item) => {
                      const mods = (item.modifiers || []).map((mod) => mod.name).join(', ')
                      return (
                        <li key={item.id} className="rounded-md bg-black/25 px-2 py-1">
                          <p className="text-[12px] font-semibold leading-snug">
                            <span className="mr-1 tabular-nums text-primary">{item.quantity}×</span>
                            {item.name}
                            {item.variantName ? (
                              <span className="font-medium text-white/50"> · {item.variantName}</span>
                            ) : null}
                          </p>
                          {mods ? <p className="mt-0.5 text-[10px] leading-tight text-white/45">{mods}</p> : null}
                          {item.notes?.trim() ? (
                            <p className="mt-0.5 text-[10px] font-medium leading-tight text-amber-300">
                              {item.notes.trim()}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>

                  {note && (
                    <p className="mx-2.5 mb-1.5 rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-1 text-[10px] leading-snug text-amber-100">
                      {note}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-1 border-t border-white/5 px-2.5 py-1.5">
                    <Badge
                      variant={isReady ? 'success' : isPending ? 'secondary' : 'warning'}
                      className="h-4 px-1.5 text-[9px] capitalize"
                    >
                      {order.status}
                    </Badge>
                    <div className="flex gap-1">
                      {isReady ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-6 bg-primary px-2 text-[10px] hover:bg-primary/90"
                          disabled={isUpdating}
                          onClick={() => handleComplete(order.id)}
                        >
                          {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Done'}
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px] text-white/60 hover:bg-white/10 hover:text-white"
                            disabled={isUpdating}
                            onClick={() => handleReject(order.id)}
                            title="Reject"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                          {isPending ? (
                            <Button
                              type="button"
                              size="sm"
                              className="h-6 bg-amber-400 px-2 text-[10px] font-semibold text-black hover:bg-amber-300"
                              disabled={isUpdating}
                              onClick={() => handleStartPreparing(order)}
                            >
                              Start
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="h-6 bg-emerald-500 px-2 text-[10px] hover:bg-emerald-400"
                              disabled={isUpdating}
                              onClick={() => handleReady(order.id)}
                            >
                              <CheckCircle className="mr-0.5 h-3 w-3" /> Ready
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
