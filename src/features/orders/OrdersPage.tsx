import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Eye, Flag, Printer, RefreshCw, Search, ShoppingBag, CircleDollarSign, Clock3, CheckCircle2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ordersApi } from '@/api/orders.api'
import { tablesApi } from '@/api/tables.api'
import { branchesApi } from '@/api/phase1.api'
import { settingsApi } from '@/api/settings.api'
import type { PosOrder } from '@/api/types/pos.types'
import { buildReceiptHtml } from '@/lib/print/receipt'
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/utils'
import { formatApiError } from '@/api/management-utils'
import { OrderDetailDialog } from './components/OrderDetailDialog'
import { OrderStatusBadge } from './components/OrderStatusBadge'
import { getDateRange, labelize, matchesOrder, normalize, orderItemSummary, type DatePreset } from './order-utils'

const PAGE_SIZE = 10
const ALL = 'all'

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(value), delay); return () => window.clearTimeout(timer) }, [value, delay])
  return debounced
}

async function printOrderReceipt(order: PosOrder) {
  const restaurant = await settingsApi.getRestaurant().catch(() => ({} as Awaited<ReturnType<typeof settingsApi.getRestaurant>>))
  const html = buildReceiptHtml({
    orderNumber: order.orderNumber,
    restaurant: {
      name: restaurant.name,
      logoUrl: typeof restaurant.logoUrl === 'string' ? restaurant.logoUrl : undefined,
      showLogo: restaurant.receiptLogoEnabled !== false,
      address: restaurant.address,
      phone: restaurant.phone,
      gstin: restaurant.gstin,
    },
    customerName: order.customer?.name,
    table: order.table?.label,
    orderType: labelize(order.type),
    items: order.items.map((item) => ({
      name: `${item.name}${item.variantName ? ` (${item.variantName})` : ''}`,
      qty: item.quantity,
      price: item.price,
      amount: item.total,
    })),
    subtotal: order.subtotal,
    taxes: [
      { name: 'GST', amount: order.gstAmount },
      { name: 'SGST', amount: order.sgstAmount },
      { name: 'CGST', amount: order.cgstAmount },
    ].filter((tax) => tax.amount > 0),
    discount: Number(order.discount || 0) + Number(order.voucherDiscount || 0) || undefined,
    additionalCharges: order.serviceCharge > 0 ? [{ name: 'Service charge', amount: order.serviceCharge }] : undefined,
    total: order.total,
    paymentMethod: order.paymentMethod ? labelize(order.paymentMethod) : undefined,
    footerText: typeof restaurant.receiptFooter === 'string' ? restaurant.receiptFooter : undefined,
    date: order.createdAt,
  })
  if (!window.electronAPI?.printReceipt) throw new Error('Printing is unavailable in this environment')
  await window.electronAPI.printReceipt(html)
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [datePreset, setDatePreset] = useState<DatePreset>('today')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState(ALL)
  const [paymentStatus, setPaymentStatus] = useState(ALL)
  const [paymentMethod, setPaymentMethod] = useState(ALL)
  const [orderType, setOrderType] = useState(ALL)
  // Default to all branches — topbar branch is context, not a hidden orders filter
  const [branchId, setBranchId] = useState(ALL)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [printingId, setPrintingId] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const range = useMemo(
    () => getDateRange(datePreset, new Date(nowTick), fromDate, toDate),
    [datePreset, fromDate, toDate, nowTick],
  )

  useEffect(() => setPage(1), [debouncedSearch, datePreset, fromDate, toDate, status, paymentStatus, paymentMethod, orderType, branchId, sortBy, sortOrder])

  // Fresh "today" filters + forced refetch whenever this page is opened (tab / route change)
  useEffect(() => {
    setDatePreset('today')
    setFromDate('')
    setToDate('')
    setNowTick(Date.now())
    void queryClient.resetQueries({ queryKey: ['orders'] })
  }, [location.pathname, queryClient])

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    period: datePreset,
    from: range.from,
    to: range.to,
    fromDate: datePreset === 'custom' ? fromDate || undefined : undefined,
    toDate: datePreset === 'custom' ? toDate || undefined : undefined,
    status: status === ALL ? undefined : status,
    paymentStatus: paymentStatus === ALL ? undefined : paymentStatus,
    paymentMethod: paymentMethod === ALL ? undefined : paymentMethod,
    type: orderType === ALL ? undefined : orderType,
    branchId: branchId === ALL ? undefined : branchId,
    page, limit: PAGE_SIZE, sortBy, sortOrder,
  }), [debouncedSearch, datePreset, range, fromDate, toDate, status, paymentStatus, paymentMethod, orderType, branchId, page, sortBy, sortOrder])

  const ordersQuery = useQuery({
    queryKey: ['orders', 'list', params],
    queryFn: ({ signal }) => ordersApi.list(params, signal),
    staleTime: 0,
    gcTime: 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  })
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list })

  const filteredOrders = useMemo(() => {
    // Server already applies period / status / type / branch. Only re-apply search +
    // custom local range so soft navigation never hides valid API rows.
    const rows = (ordersQuery.data?.orders ?? []).filter((order) => {
      if (!matchesOrder(order, debouncedSearch)) return false
      if (datePreset === 'custom') {
        const created = new Date(order.createdAt).getTime()
        if (range.from && created < new Date(range.from).getTime()) return false
        if (range.to && created > new Date(range.to).getTime()) return false
      }
      if (branchId !== ALL && order.branchId && order.branchId !== branchId) return false
      if (status !== ALL && normalize(order.status) !== status) return false
      if (paymentStatus !== ALL && normalize(order.paymentStatus) !== paymentStatus) return false
      if (paymentMethod !== ALL && normalize(order.paymentMethod) !== paymentMethod) return false
      if (orderType !== ALL && normalize(order.type) !== orderType) return false
      return true
    })
    return [...rows].sort((a, b) => {
      const values: Record<string, [string | number, string | number]> = {
        createdAt: [a.createdAt, b.createdAt], total: [a.total, b.total], orderNumber: [a.orderNumber, b.orderNumber], customer: [a.customer?.name ?? '', b.customer?.name ?? ''],
      }
      const [left, right] = values[sortBy] ?? values.createdAt
      return (left < right ? -1 : left > right ? 1 : 0) * (sortOrder === 'asc' ? 1 : -1)
    })
  }, [ordersQuery.data, debouncedSearch, datePreset, range, status, paymentStatus, paymentMethod, orderType, branchId, sortBy, sortOrder])

  const meta = ordersQuery.data?.meta
  const visibleOrders = meta ? filteredOrders : filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const total = meta?.total ?? filteredOrders.length
  const totalPages = Math.max(1, meta?.totalPages ?? Math.ceil(total / PAGE_SIZE))
  const summary = useMemo(() => ({
    total, sales: filteredOrders.filter((order) => normalize(order.status) !== 'cancelled').reduce((sum, order) => sum + order.total, 0),
    completed: filteredOrders.filter((order) => normalize(order.status) === 'completed').length,
    active: filteredOrders.filter((order) => ['pending', 'confirmed', 'preparing', 'ready'].includes(normalize(order.status))).length,
  }), [filteredOrders, total])

  const updateStatus = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => ordersApi.updateStatus(id, nextStatus.toUpperCase().replaceAll('-', '_')),
    onSuccess: (updated) => {
      setSelectedOrder(updated)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      const status = labelize(updated.status)
      if (normalize(updated.status) === 'completed') {
        const tableLabel = updated.table?.label || updated.table?.number
        toast.success(
          tableLabel
            ? `Order completed · Table ${tableLabel} set to cleaning — Clear Table when guest leaves`
            : 'Order completed (payment received) · Sale recorded'
        )
      } else {
        toast.success(`Order moved to ${status}`)
      }
    },
    onError: (error) => toast.error(formatApiError(error, 'Could not update the order')),
  })

  const deleteOrder = useMutation({
    mutationFn: async (order: PosOrder) => {
      await ordersApi.delete(order.id)
      if (order.tableId) {
        await tablesApi.updateStatus(order.tableId, 'AVAILABLE').catch(() => {})
      }
      return order
    },
    onSuccess: (order) => {
      if (selectedOrder?.id === order.id) {
        setDetailOpen(false)
        setSelectedOrder(null)
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success(order.tableId ? 'Order deleted · table set to available' : 'Order deleted')
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to delete the order'),
  })

  const handlePrint = async (order: PosOrder) => {
    setPrintingId(order.id)
    try {
      await printOrderReceipt(order)
      toast.success(`Receipt for ${order.orderNumber} sent to printer`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to print receipt')
    } finally {
      setPrintingId(null)
    }
  }

  const handleDelete = (order: PosOrder) => {
    if (!window.confirm(`Delete order ${order.orderNumber}? This cannot be undone.`)) return
    deleteOrder.mutate(order)
  }

  const openOrderDetails = async (order: PosOrder) => {
    setSelectedOrder(order)
    setDetailOpen(true)
    try {
      const full = await ordersApi.get(order.id)
      setSelectedOrder(full)
    } catch {
      // Keep list row data if detail fetch fails
    }
  }

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortOrder((value) => value === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortOrder('asc') }
  }
  const SortIcon = ({ column }: { column: string }) => sortBy !== column ? null : sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  const resetFilters = () => { setSearch(''); setDatePreset('today'); setFromDate(''); setToDate(''); setStatus(ALL); setPaymentStatus(ALL); setPaymentMethod(ALL); setOrderType(ALL); setBranchId(ALL); setNowTick(Date.now()) }

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Check Orders" description="See exactly who ordered what and manage fulfillment from one place" actions={
          <div className="text-right">
            <Button variant="outline" onClick={() => ordersQuery.refetch()} disabled={ordersQuery.isFetching} aria-label="Refresh orders">
              <RefreshCw className={`mr-2 h-4 w-4 ${ordersQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">Updated {ordersQuery.dataUpdatedAt ? formatRelativeTime(ordersQuery.dataUpdatedAt) : 'not yet'}</p>
          </div>
        } />
        <Tabs value="orders" onValueChange={(value) => value === 'sales' && navigate('/app/orders/sales')}>
          <TabsList aria-label="Check Orders views"><TabsTrigger value="orders">Orders Dashboard</TabsTrigger><TabsTrigger value="sales">Smart Sales</TabsTrigger></TabsList>
        </Tabs>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard title="Orders in view" value={summary.total} format="number" icon={<ShoppingBag className="h-5 w-5" />} />
          <StatCard title="Sales in view" value={summary.sales} format="currency" icon={<CircleDollarSign className="h-5 w-5" />} />
          <StatCard title="Completed" value={summary.completed} format="number" icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard title="Needs attention" value={summary.active} format="number" icon={<Clock3 className="h-5 w-5" />} />
        </div>

        <section className="rounded-2xl border bg-card p-4" aria-label="Order filters">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <div className="sm:col-span-2 xl:col-span-2"><Label htmlFor="order-search">Search orders</Label><div className="relative mt-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="order-search" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order, customer, phone, email, item" /></div></div>
            <FilterSelect label="Date range" value={datePreset} onChange={(value) => setDatePreset(value as DatePreset)} options={[['today','Today'],['yesterday','Yesterday'],['last7','Last 7 days'],['last30','Last 30 days'],['month','This month'],['custom','Custom range'],['all','All time']]} />
            <FilterSelect label="Order status" value={status} onChange={setStatus} options={[[ALL,'All statuses'],['pending','Pending'],['confirmed','Confirmed'],['preparing','Preparing'],['ready','Ready'],['completed','Completed'],['cancelled','Cancelled'],['refunded','Refunded']]} />
            <FilterSelect label="Payment status" value={paymentStatus} onChange={setPaymentStatus} options={[[ALL,'All payments'],['pending','Pending'],['paid','Paid'],['failed','Failed'],['refunded','Refunded'],['partially-refunded','Partially refunded']]} />
            <FilterSelect label="Payment method" value={paymentMethod} onChange={setPaymentMethod} options={[[ALL,'All methods'],['cash','Cash'],['card','Card'],['upi','UPI'],['wallet','Wallet'],['gift-card','Gift card'],['split','Split']]} />
            <FilterSelect label="Order type" value={orderType} onChange={setOrderType} options={[[ALL,'All types'],['dine-in','Dine in'],['takeaway','Takeaway'],['delivery','Delivery'],['online','Online']]} />
            {(branches as Array<{ id: string; name: string }>).length > 1 && <FilterSelect label="Branch" value={branchId} onChange={setBranchId} options={[[ALL,'All branches'], ...(branches as Array<{ id: string; name: string }>).map((branch) => [String(branch.id), branch.name])]} />}
          </div>
          {datePreset === 'custom' && <div className="mt-3 flex flex-wrap gap-3"><div><Label htmlFor="orders-from">From</Label><Input id="orders-from" className="mt-1" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></div><div><Label htmlFor="orders-to">To</Label><Input id="orders-to" className="mt-1" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></div></div>}
          <div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button></div>
        </section>

        {ordersQuery.isPending || (ordersQuery.isFetching && !ordersQuery.data) ? <OrdersSkeleton /> : ordersQuery.isError ? <StateMessage title="Orders couldn’t be loaded" description="Check your connection and try again." action={<Button variant="outline" onClick={() => ordersQuery.refetch()}>Try again</Button>} /> : visibleOrders.length === 0 ? <StateMessage title="No matching orders" description="Try widening the date range or clearing some filters." action={<Button variant="outline" onClick={resetFilters}>Clear filters</Button>} /> : <>
          <div className="overflow-hidden rounded-2xl border bg-card"><div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <SortableHead label="Order" column="orderNumber" onSort={toggleSort}><SortIcon column="orderNumber" /></SortableHead>
              <SortableHead label="Date & time" column="createdAt" onSort={toggleSort}><SortIcon column="createdAt" /></SortableHead>
              <SortableHead label="Customer" column="customer" onSort={toggleSort}><SortIcon column="customer" /></SortableHead>
              <TableHead>Order items</TableHead>
              <TableHead>Fulfillment</TableHead>
              <SortableHead label="Total" column="total" onSort={toggleSort}><SortIcon column="total" /></SortableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>{visibleOrders.map((order) => {
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
              const itemNotes = order.items.map((item) => item.notes).filter(Boolean) as string[]
              const hasNote = Boolean(order.instructions?.trim()) || itemNotes.length > 0
              const noteText = [order.instructions, ...itemNotes].filter(Boolean).join(' · ')
              return (
              <TableRow key={order.id} tabIndex={0} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" onDoubleClick={() => openOrderDetails(order)}>
              <TableCell className="font-semibold whitespace-nowrap">
                <div className="flex items-start gap-1.5">
                  <p>{order.orderNumber}</p>
                  {hasNote && (
                    <span
                      className="inline-flex items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning"
                      title={noteText}
                    >
                      <Flag className="h-3 w-3" />
                      Note
                    </span>
                  )}
                </div>
                {hasNote && (
                  <p className="mt-0.5 max-w-[180px] truncate text-xs text-muted-foreground" title={noteText}>
                    {noteText}
                  </p>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap"><p>{formatDateTime(order.createdAt)}</p><p className="text-xs text-muted-foreground">{formatRelativeTime(order.createdAt)}</p></TableCell>
              <TableCell className="min-w-[180px]">
                <p className="font-medium">{order.customer?.name || 'Walk-in customer'}</p>
                {order.customer?.phone && <p className="text-xs text-muted-foreground">{order.customer.phone}</p>}
                {order.customer?.email && <p className="max-w-[200px] truncate text-xs text-muted-foreground" title={order.customer.email}>{order.customer.email}</p>}
                {!order.customer?.phone && !order.customer?.email && <p className="text-xs text-muted-foreground">No contact details</p>}
              </TableCell>
              <TableCell className="min-w-[220px]">
                <p className="text-sm font-medium">{itemCount} item{itemCount === 1 ? '' : 's'}</p>
                <p className="max-w-[280px] text-xs text-muted-foreground" title={orderItemSummary(order, 99)}>{orderItemSummary(order, 3)}</p>
              </TableCell>
              <TableCell>
                <p>{labelize(order.type)}</p>
                {normalize(order.type) === 'dine-in' && <p className="text-xs text-muted-foreground">{order.table?.label || 'Table not assigned'}</p>}
                {normalize(order.type) === 'delivery' && order.deliveryAddress && <p className="max-w-[160px] truncate text-xs text-muted-foreground" title={order.deliveryAddress}>{order.deliveryAddress}</p>}
                {order.branch?.name && <p className="text-xs text-muted-foreground">{order.branch.name}</p>}
              </TableCell>
              <TableCell className="font-semibold whitespace-nowrap">{formatCurrency(order.total)}</TableCell>
              <TableCell><OrderStatusBadge status={order.paymentStatus || (order.paymentMethod ? 'paid' : 'pending')} kind="payment" /><p className="mt-1 text-xs text-muted-foreground">{labelize(order.paymentMethod)}</p></TableCell>
              <TableCell><OrderStatusBadge status={order.status} /></TableCell>
              <TableCell className="text-right">
                <div className="inline-flex flex-wrap items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openOrderDetails(order)} aria-label={`View order ${order.orderNumber}`}>
                    <Eye className="mr-1.5 h-4 w-4" /> View
                  </Button>
                  <Button variant="ghost" size="sm" disabled={printingId === order.id} onClick={() => handlePrint(order)} aria-label={`Print order ${order.orderNumber}`}>
                    <Printer className="mr-1.5 h-4 w-4" /> {printingId === order.id ? 'Printing…' : 'Print'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger"
                    disabled={deleteOrder.isPending && deleteOrder.variables?.id === order.id}
                    onClick={() => handleDelete(order)}
                    aria-label={`Delete order ${order.orderNumber}`}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
              )
            })}</TableBody>
          </Table></div></div>
          <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} orders</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm">Page {page} of {totalPages}</span><Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button></div></div>
        </>}
      </div>
      <OrderDetailDialog order={selectedOrder} open={detailOpen} onOpenChange={setDetailOpen} onStatusChange={(id, nextStatus) => updateStatus.mutate({ id, nextStatus })} statusUpdating={updateStatus.isPending} />
    </PageShell>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <div><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-1" aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}</SelectContent></Select></div>
}
function SortableHead({ label, column, onSort, children }: { label: string; column: string; onSort: (column: string) => void; children: React.ReactNode }) { return <TableHead><button type="button" className="inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSort(column)}>{label}{children}</button></TableHead> }
function OrdersSkeleton() { return <div className="space-y-2" aria-label="Loading orders">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div> }
function StateMessage({ title, description, action }: { title: string; description: string; action: React.ReactNode }) { return <div className="rounded-2xl border border-dashed bg-card py-16 text-center"><h2 className="font-semibold">{title}</h2><p className="mb-4 mt-1 text-sm text-muted-foreground">{description}</p>{action}</div> }
