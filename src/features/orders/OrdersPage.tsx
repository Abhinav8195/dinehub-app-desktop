import { useMemo, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Filter, Download, Eye, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { DataTable } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ordersApi } from '@/api/orders.api'
import type { PosOrder } from '@/api/types/pos.types'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { OrderDetailDialog } from './components/OrderDetailDialog'
import { reportsApi } from '@/api/reports.api'
import { toast } from 'sonner'

type OrderRow = {
  id: string
  orderNumber: string
  customer: string
  type: string
  table: string
  items: number
  total: number
  status: string
  time: string
}

const statusVariant = (s: string) => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'destructive' | 'secondary'> = {
    completed: 'success', preparing: 'warning', ready: 'info', pending: 'secondary', cancelled: 'destructive'
  }
  return map[s] || 'secondary'
}

function mapOrderToRow(order: PosOrder): OrderRow {
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0)
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customer: order.customer?.name || 'Walk-in',
    type: order.type,
    table: order.table?.label || '—',
    items: itemCount,
    total: order.total,
    status: order.status,
    time: formatRelativeTime(order.createdAt),
  }
}

export default function OrdersPage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
    refetchInterval: 30_000,
  })
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ordersApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order status updated') },
    onError: (error: Error) => toast.error(error.message || 'Unable to update order'),
  })
  const exportOrders = async () => {
    try {
      const result = await reportsApi.export('xlsx')
      const url = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = result.filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to export orders') }
  }

  const handleViewOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId)
    setDetailOpen(true)
  }, [])

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  )

  const filteredOrders = useMemo(() => {
    const rows = orders.map(mapOrderToRow)
    if (typeFilter === 'all') return rows
    if (typeFilter === 'cancelled') return rows.filter((o) => o.status === 'cancelled')
    return rows.filter((o) => o.type === typeFilter)
  }, [orders, typeFilter])

  const columns = useMemo<ColumnDef<OrderRow>[]>(() => [
    { accessorKey: 'orderNumber', header: 'Order #' },
    { accessorKey: 'customer', header: 'Customer' },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <span className="capitalize">{row.original.type.replace('-', ' ')}</span> },
    { accessorKey: 'table', header: 'Table' },
    { accessorKey: 'items', header: 'Items' },
    { accessorKey: 'total', header: 'Total', cell: ({ row }) => formatCurrency(row.original.total) },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>
    },
    { accessorKey: 'time', header: 'Time' },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleViewOrder(row.original.id)}
          title="View order details"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {row.original.status === 'pending' && <Button type="button" variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: row.original.id, status: 'PREPARING' })}>Start</Button>}
        </div>
      )
    }
  ], [handleViewOrder, updateStatus])

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Orders" description="Manage all restaurant orders across channels" actions={
          <>
            <Button variant="outline" onClick={() => refetch()}><Filter className="h-4 w-4 mr-2" /> Refresh</Button>
            <Button variant="outline" onClick={exportOrders}><Download className="h-4 w-4 mr-2" /> Export</Button>
          </>
        } />
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="dine-in">Dine In</TabsTrigger>
            <TabsTrigger value="takeaway">Takeaway</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="online">Online</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading orders...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <p>Failed to load orders. Make sure the backend is running.</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <p className="font-medium">No orders yet</p>
            <p className="text-sm">Place an order from POS to see it here</p>
          </div>
        ) : (
          <DataTable columns={columns} data={filteredOrders} searchKey="orderNumber" searchPlaceholder="Search orders..." />
        )}
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </PageShell>
  )
}
