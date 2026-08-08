import { useMemo, useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnDef } from '@tanstack/react-table'
import { Filter, Download, Eye, Loader2, ClipboardList, IndianRupee, CheckCircle2, Clock3, XCircle, Printer, Trash2 } from 'lucide-react'
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
import { PermissionGuard } from '@/guards/PermissionGuard'
import { StatCard } from '@/components/common/StatCard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils'
import { settingsApi } from '@/api/settings.api'
import { buildReceiptHtml } from '@/lib/print/receipt'
import { useTaxSettings } from '@/hooks/useTaxSettings'

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
  createdAt: string
  phone: string
}

type DateFilter = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom' | 'all'

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
    time: `${formatDateTime(order.createdAt)} · ${formatRelativeTime(order.createdAt)}`,
    createdAt: order.createdAt,
    phone: order.customer?.phone || '',
  }
}

export default function OrdersPage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: ordersResult, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
    refetchInterval: 30_000,
  })
  const orders = Array.isArray(ordersResult) ? ordersResult : []
  const { data: restaurant } = useQuery({ queryKey: ['settings', 'restaurant'], queryFn: settingsApi.getRestaurant })
  const { data: taxSettings } = useTaxSettings()
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ordersApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order status updated') },
    onError: (error: Error) => toast.error(error.message || 'Unable to update order'),
  })
  const deleteOrder = useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order deleted') },
    onError: (error: Error) => toast.error(error.message || 'Unable to delete order'),
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

  const handlePrintOrder = useCallback((orderId: string) => {
    const order = orders.find((entry) => entry.id === orderId)
    if (!order) return
    const value = restaurant ?? {}
    const invoiceNumber = (order as PosOrder & { invoiceNumber?: string }).invoiceNumber
    const html = buildReceiptHtml({
      orderNumber: order.orderNumber,
      invoiceNumber,
      restaurant: {
        name: typeof value.name === 'string' ? value.name : 'DineHub Restaurant',
        logoUrl: typeof value.logoUrl === 'string' ? value.logoUrl : undefined,
        showLogo: value.receiptLogoEnabled !== false,
        address: typeof value.address === 'string' ? value.address : undefined,
        phone: typeof value.phone === 'string' ? value.phone : undefined,
        gstin: typeof value.gstin === 'string' ? value.gstin : undefined,
      },
      customerName: order.customer?.name || 'Walk-in', table: order.table?.label,
      orderType: order.type.replaceAll('_', ' ').replaceAll('-', ' '),
      cashierName: typeof (order as PosOrder & { cashierName?: string }).cashierName === 'string' ? (order as PosOrder & { cashierName?: string }).cashierName : undefined,
      items: order.items.map((item) => ({ name: item.name, qty: item.quantity, price: item.price, amount: item.total })),
      subtotal: order.subtotal,
      taxes: [
        { name: 'GST', rate: taxSettings?.gstPercent, amount: order.gstAmount },
        { name: 'SGST', rate: taxSettings?.sgstPercent, amount: order.sgstAmount },
        { name: 'CGST', rate: taxSettings?.cgstPercent, amount: order.cgstAmount },
      ].filter((tax) => tax.amount > 0),
      discount: order.discount + order.voucherDiscount,
      additionalCharges: order.serviceCharge > 0 ? [{ name: 'Service Charge', amount: order.serviceCharge }] : [],
      total: order.total, paymentMethod: order.paymentMethod || undefined,
      footerText: typeof value.receiptFooter === 'string' ? value.receiptFooter : undefined,
      date: order.createdAt,
    })
    if (window.electronAPI?.printReceipt) window.electronAPI.printReceipt(html).catch(() => toast.error('Unable to print invoice'))
    else { const popup = window.open('', '_blank', 'width=420,height=720'); popup?.document.write(html); popup?.document.close(); popup?.print() }
  }, [orders, restaurant, taxSettings])

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  )

  const filteredOrders = useMemo(() => {
    let rows = orders.map(mapOrderToRow)
    if (typeFilter === 'cancelled') rows = rows.filter((o) => o.status === 'cancelled')
    else if (typeFilter !== 'all') rows = rows.filter((o) => o.type === typeFilter)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const start = new Date(today)
    let end: Date | null = null
    if (dateFilter === 'yesterday') { start.setDate(start.getDate() - 1); end = new Date(today.getTime() - 1) }
    if (dateFilter === 'last7') start.setDate(start.getDate() - 6)
    if (dateFilter === 'last30') start.setDate(start.getDate() - 29)
    if (dateFilter === 'custom') {
      if (fromDate) start.setTime(new Date(`${fromDate}T00:00:00`).getTime())
      if (toDate) end = new Date(`${toDate}T23:59:59.999`)
    }
    if (dateFilter !== 'all') rows = rows.filter((row) => {
      const created = new Date(row.createdAt)
      return created >= start && (!end || created <= end)
    })
    const query = search.trim().toLowerCase()
    if (query) rows = rows.filter((row) => [row.orderNumber, row.customer, row.phone].some((value) => value.toLowerCase().includes(query)))
    return rows
  }, [orders, typeFilter, dateFilter, fromDate, toDate, search])

  const summary = useMemo(() => ({
    total: filteredOrders.length,
    sales: filteredOrders.filter((order) => order.status !== 'cancelled').reduce((sum, order) => sum + order.total, 0),
    completed: filteredOrders.filter((order) => order.status === 'completed').length,
    pending: filteredOrders.filter((order) => ['pending', 'preparing', 'ready'].includes(order.status)).length,
    cancelled: filteredOrders.filter((order) => order.status === 'cancelled').length,
  }), [filteredOrders])

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
        <Button type="button" variant="ghost" size="icon" onClick={() => handlePrintOrder(row.original.id)} title="Print invoice">
          <Printer className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="text-danger hover:text-danger" disabled={deleteOrder.isPending} onClick={() => {
          if (window.confirm(`Delete order ${row.original.orderNumber}? This action cannot be undone.`)) deleteOrder.mutate(row.original.id)
        }} title="Delete order">
          <Trash2 className="h-4 w-4" />
        </Button>
        {row.original.status === 'pending' && <Button type="button" variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: row.original.id, status: 'PREPARING' })}>Start</Button>}
        </div>
      )
    }
  ], [handleViewOrder, handlePrintOrder, updateStatus, deleteOrder])

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Orders" description="Manage all restaurant orders across channels" actions={
          <>
            <Button variant="outline" onClick={() => refetch()}><Filter className="h-4 w-4 mr-2" /> Refresh</Button>
            <PermissionGuard permission="reports.view" feature="REPORTS">
              <Button variant="outline" onClick={exportOrders}><Download className="h-4 w-4 mr-2" /> Export</Button>
            </PermissionGuard>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <StatCard title="Total Orders" value={summary.total} format="number" icon={<ClipboardList className="h-5 w-5" />} />
          <StatCard title="Total Sales" value={summary.sales} format="currency" icon={<IndianRupee className="h-5 w-5" />} />
          <StatCard title="Completed" value={summary.completed} format="number" icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard title="Pending" value={summary.pending} format="number" icon={<Clock3 className="h-5 w-5" />} />
          <StatCard title="Cancelled" value={summary.cancelled} format="number" icon={<XCircle className="h-5 w-5" />} />
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
          <div className="min-w-[220px] flex-1"><label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order #, customer or phone" /></div>
          <div className="w-[180px]"><label className="mb-1 block text-xs font-medium text-muted-foreground">Date range</label><Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="yesterday">Yesterday</SelectItem><SelectItem value="last7">Last 7 days</SelectItem><SelectItem value="last30">Last 30 days</SelectItem><SelectItem value="custom">Custom range</SelectItem><SelectItem value="all">All time</SelectItem></SelectContent></Select></div>
          {dateFilter === 'custom' && <><div><label className="mb-1 block text-xs font-medium text-muted-foreground">From</label><Input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></div><div><label className="mb-1 block text-xs font-medium text-muted-foreground">To</label><Input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></div></>}
        </div>

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
          <DataTable columns={columns} data={filteredOrders} />
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
