import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Clock, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ordersApi } from '@/api/orders.api'
import type { PosOrder } from '@/api/types/pos.types'
import { BRAND } from '@/constants/brand'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { cn, formatRelativeTime } from '@/lib/utils'

function getOrderLabel(order: PosOrder) {
  if (order.table?.label) return order.table.label
  if (order.type === 'takeaway') return 'Takeaway'
  if (order.type === 'delivery') return 'Delivery'
  if (order.type === 'online') return 'Online'
  return 'Dine In'
}

function getElapsedMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

function formatItems(order: PosOrder) {
  return order.items.map((i) => `${i.name} x${i.quantity}`)
}

const KITCHEN_STATUSES = ['pending', 'preparing', 'ready']

export default function KitchenPage() {
  const [filter, setFilter] = useState('all')
  const queryClient = useQueryClient()

  const { data: allOrders = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
    refetchInterval: 15_000,
  })

  const kitchenOrders = useMemo(
    () => allOrders.filter((o) => KITCHEN_STATUSES.includes(o.status)),
    [allOrders]
  )

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return kitchenOrders
    if (filter === 'preparing') return kitchenOrders.filter((o) => o.status === 'preparing' || o.status === 'pending')
    return kitchenOrders.filter((o) => o.status === filter)
  }, [kitchenOrders, filter])

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success(`Order ${order.orderNumber} marked as ${order.status}`)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update order'),
  })

  const handleReady = (id: string) => statusMutation.mutate({ id, status: 'READY' })
  const handleComplete = (id: string) => statusMutation.mutate({ id, status: 'COMPLETED' })
  const handleReject = (id: string) => statusMutation.mutate({ id, status: 'CANCELLED' })
  const handleStartPreparing = (id: string) => statusMutation.mutate({ id, status: 'PREPARING' })

  const counts = useMemo(() => ({
    all: kitchenOrders.length,
    preparing: kitchenOrders.filter((o) => o.status === 'preparing' || o.status === 'pending').length,
    ready: kitchenOrders.filter((o) => o.status === 'ready').length,
  }), [kitchenOrders])

  return (
    <div className="min-h-screen bg-brand-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BrandLogo size="sm" showText subtitle="Kitchen Display System" textClassName="[&_p]:text-white [&_p.text-muted-foreground]:text-white/60" />
          <div>
            <h1 className="text-3xl font-bold">Kitchen Display</h1>
            <p className="text-white/60 mt-1">Live order queue · {BRAND.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isFetching && 'animate-spin')} /> Refresh
          </Button>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-white/10">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="preparing">Preparing ({counts.preparing})</TabsTrigger>
              <TabsTrigger value="ready">Ready ({counts.ready})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32 text-white/60">
          <Loader2 className="h-8 w-8 animate-spin mr-3" /> Loading kitchen queue...
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-32 text-white/60 gap-4">
          <p>Failed to load orders. Make sure the backend is running.</p>
          <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-white/60 gap-2">
          <p className="text-xl font-medium">No active orders</p>
          <p className="text-sm">New POS orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const elapsed = getElapsedMinutes(order.createdAt)
            const isHighPriority = elapsed >= 10
            const isReady = order.status === 'ready'
            const isPending = order.status === 'pending'
            const isUpdating = statusMutation.isPending && statusMutation.variables?.id === order.id

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'rounded-2xl border-2 p-5',
                  isHighPriority && !isReady ? 'border-danger bg-danger/10' : 'border-white/20 bg-white/5',
                  isReady && 'border-success bg-success/10'
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{order.orderNumber}</h3>
                    <p className="text-slate-400 text-sm">{getOrderLabel(order)}</p>
                    {order.customer?.name && (
                      <p className="text-slate-500 text-xs mt-0.5">{order.customer.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isHighPriority && !isReady && <AlertTriangle className="h-5 w-5 text-danger" />}
                    {elapsed > 0 && !isReady && (
                      <div className={cn('flex items-center gap-1', isHighPriority ? 'text-danger' : 'text-warning')}>
                        <Clock className="h-4 w-4" />
                        <span className="font-mono font-bold">{elapsed}m</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {formatItems(order).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-lg">
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                {order.instructions && (
                  <p className="text-sm text-amber-300/80 mb-3 italic">Note: {order.instructions}</p>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-400">{formatRelativeTime(order.createdAt)}</span>
                  <Badge variant={isReady ? 'success' : isPending ? 'secondary' : 'warning'} className="capitalize">
                    {order.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {isReady ? (
                    <Button
                      type="button"
                      className="col-span-2 bg-primary hover:bg-primary/90"
                      disabled={isUpdating}
                      onClick={() => handleComplete(order.id)}
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Completed'}
                    </Button>
                  ) : isPending ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-600 bg-transparent text-white hover:bg-slate-700 hover:text-white"
                        disabled={isUpdating}
                        onClick={() => handleReject(order.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        type="button"
                        className="bg-warning hover:bg-warning/90 text-black"
                        disabled={isUpdating}
                        onClick={() => handleStartPreparing(order.id)}
                      >
                        Start
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-600 bg-transparent text-white hover:bg-slate-700 hover:text-white"
                        disabled={isUpdating}
                        onClick={() => handleReject(order.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        type="button"
                        className="bg-success hover:bg-success/90"
                        disabled={isUpdating}
                        onClick={() => handleReady(order.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Ready
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
