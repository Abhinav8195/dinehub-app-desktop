import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { BadgePercent, Ban, CircleDollarSign, Receipt, RefreshCw, RotateCcw, ShoppingBag, TrendingUp, UserPlus, Users } from 'lucide-react'
import { ordersApi } from '@/api/orders.api'
import { branchesApi } from '@/api/phase1.api'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CHART_COLORS } from '@/constants/brand'
import { formatCurrency, formatDateTime, formatPercent, formatRelativeTime } from '@/lib/utils'
import type { RootState } from '@/store'
import { getDateRange, labelize, normalize, previousRange, toLocalYmd, type DatePreset } from '@/features/orders/order-utils'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { aggregateSales, groupRevenue, hourlyOrders, itemRankings, percentChange, salesSeries } from '@/features/orders/sales-utils'

const COLORS = [CHART_COLORS.primary, CHART_COLORS.success, '#f59e0b', '#6366f1', '#64748b', '#ef4444']

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const selectedBranchId = useSelector((state: RootState) => state.app.selectedBranchId)
  const [period, setPeriod] = useState<DatePreset>('last7')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [branchId, setBranchId] = useState(selectedBranchId || 'all')
  const range = useMemo(() => getDateRange(period, new Date(), fromDate, toDate), [period, fromDate, toDate])
  const prior = useMemo(() => previousRange(range.from, range.to), [range])
  const baseParams = { branchId: branchId === 'all' ? undefined : branchId, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' as const }
  const currentQuery = useQuery({
    queryKey: ['orders', 'sales', period, range, branchId],
    queryFn: ({ signal }) => ordersApi.list({
      ...baseParams,
      period,
      from: range.from,
      to: range.to,
      fromDate: period === 'custom' ? fromDate || undefined : undefined,
      toDate: period === 'custom' ? toDate || undefined : undefined,
    }, signal),
    enabled: period !== 'custom' || Boolean(fromDate && toDate),
  })
  const previousQuery = useQuery({
    queryKey: ['orders', 'sales-previous', prior, branchId],
    queryFn: ({ signal }) => ordersApi.list({
      ...baseParams,
      period: 'custom',
      from: prior.from,
      to: prior.to,
      fromDate: toLocalYmd(prior.from),
      toDate: toLocalYmd(prior.to),
    }, signal),
    enabled: Boolean(prior.from && prior.to),
  })
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: branchesApi.list })
  const orders = useMemo(() => {
    const rows = currentQuery.data?.orders ?? []
    if (!range.from && !range.to) return rows
    const fromMs = range.from ? new Date(range.from).getTime() : undefined
    const toMs = range.to ? new Date(range.to).getTime() : undefined
    return rows.filter((order) => {
      const created = new Date(order.createdAt).getTime()
      return (fromMs === undefined || created >= fromMs) && (toMs === undefined || created <= toMs)
    })
  }, [currentQuery.data?.orders, range.from, range.to])
  const previousOrders = useMemo(() => {
    const rows = previousQuery.data?.orders ?? []
    if (!prior.from && !prior.to) return rows
    const fromMs = prior.from ? new Date(prior.from).getTime() : undefined
    const toMs = prior.to ? new Date(prior.to).getTime() : undefined
    return rows.filter((order) => {
      const created = new Date(order.createdAt).getTime()
      return (fromMs === undefined || created >= fromMs) && (toMs === undefined || created <= toMs)
    })
  }, [previousQuery.data?.orders, prior.from, prior.to])
  const metrics = useMemo(() => aggregateSales(orders), [orders])
  const previousMetrics = useMemo(() => aggregateSales(previousOrders), [previousOrders])
  const series = useMemo(() => salesSeries(orders), [orders])
  const byStatus = useMemo(() => { const counts = new Map<string, number>(); orders.forEach((order) => { const key = normalize(order.status) || 'unknown'; counts.set(key, (counts.get(key) ?? 0) + 1) }); return [...counts].map(([name, value]) => ({ name, value })) }, [orders])
  const byType = useMemo(() => groupRevenue(orders, (order) => order.type), [orders])
  const byPayment = useMemo(() => groupRevenue(orders, (order) => order.paymentMethod), [orders])
  const rankings = useMemo(() => itemRankings(orders), [orders])
  const hours = useMemo(() => hourlyOrders(orders), [orders])
  const lastUpdated = currentQuery.dataUpdatedAt
  const refresh = () => { currentQuery.refetch(); previousQuery.refetch() }

  return <PageShell>
    <div className="page-container">
      <PageHeader title="Smart Sales Dashboard" description="Understand sales, customer behavior, and operational demand" actions={<div className="text-right"><Button variant="outline" onClick={refresh} disabled={currentQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${currentQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh</Button><p className="mt-1 text-xs text-muted-foreground">Updated {lastUpdated ? formatRelativeTime(lastUpdated) : 'not yet'}</p></div>} />
      <Tabs value="sales" onValueChange={(value) => value === 'orders' && navigate('/app/orders')}><TabsList aria-label="Check Orders views"><TabsTrigger value="orders">Orders Dashboard</TabsTrigger><TabsTrigger value="sales">Smart Sales</TabsTrigger></TabsList></Tabs>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <div><Label>Period</Label><Select value={period} onValueChange={(value) => setPeriod(value as DatePreset)}><SelectTrigger className="mt-1 w-[180px]" aria-label="Sales period"><SelectValue /></SelectTrigger><SelectContent>{[['today','Today'],['yesterday','Yesterday'],['last7','Last 7 days'],['last30','Last 30 days'],['month','This month'],['custom','Custom range']].map(([key,label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
        {period === 'custom' && <><div><Label htmlFor="sales-from">From</Label><Input id="sales-from" className="mt-1" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></div><div><Label htmlFor="sales-to">To</Label><Input id="sales-to" className="mt-1" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></div></>}
        {(branches as Array<{ id: string; name: string }>).length > 1 && <div><Label>Branch</Label><Select value={branchId} onValueChange={setBranchId}><SelectTrigger className="mt-1 w-[200px]" aria-label="Sales branch"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All branches</SelectItem>{(branches as Array<{ id: string; name: string }>).map((branch) => <SelectItem key={branch.id} value={String(branch.id)}>{branch.name}</SelectItem>)}</SelectContent></Select></div>}
        {(range.from || range.to) && (
          <p className="w-full text-xs text-muted-foreground">
            Showing {new Date(range.from!).toLocaleDateString('en-IN')} – {new Date(range.to!).toLocaleDateString('en-IN')}
          </p>
        )}
      </div>

      {currentQuery.isLoading ? <DashboardSkeleton /> : currentQuery.isError ? <State title="Sales data couldn’t be loaded" action={<Button variant="outline" onClick={refresh}>Try again</Button>} /> : orders.length === 0 ? <State title="No sales found for this period" action={<Button variant="outline" onClick={() => setPeriod('last30')}>Show last 30 days</Button>} /> : <>
        <TooltipProvider><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          <Metric title="Gross sales" value={formatCurrency(metrics.grossSales)} change={percentChange(metrics.grossSales, previousMetrics.grossSales)} icon={CircleDollarSign} help="Item sales before discounts, refunds, tax, and extra charges." />
          <Metric title="Net sales" value={formatCurrency(metrics.netSales)} change={percentChange(metrics.netSales, previousMetrics.netSales)} icon={TrendingUp} help="Collected order totals less refunds." />
          <Metric title="Total orders" value={metrics.totalOrders.toLocaleString()} change={percentChange(metrics.totalOrders, previousMetrics.totalOrders)} icon={ShoppingBag} help="Every order placed in the selected period." />
          <Metric title="Average order value" value={formatCurrency(metrics.averageOrderValue)} change={percentChange(metrics.averageOrderValue, previousMetrics.averageOrderValue)} icon={Receipt} help="Net sales divided by non-cancelled orders." />
          <Metric title="Completed" value={metrics.completedOrders.toLocaleString()} change={percentChange(metrics.completedOrders, previousMetrics.completedOrders)} icon={Receipt} help="Orders with completed status." />
          <Metric title="Cancelled" value={metrics.cancelledOrders.toLocaleString()} change={percentChange(metrics.cancelledOrders, previousMetrics.cancelledOrders)} icon={Ban} help="Orders cancelled during the period." />
          <Metric title="Refunds" value={formatCurrency(metrics.refunds)} change={percentChange(metrics.refunds, previousMetrics.refunds)} icon={RotateCcw} help="Recorded refunded value." inverse />
          <Metric title="Discounts" value={formatCurrency(metrics.discounts)} change={percentChange(metrics.discounts, previousMetrics.discounts)} icon={BadgePercent} help="Order and voucher discounts applied." inverse />
          <Metric title="New customers" value={metrics.newCustomers.toLocaleString()} change={percentChange(metrics.newCustomers, previousMetrics.newCustomers)} icon={UserPlus} help="Identified customers with one order in the selected dataset." />
          <Metric title="Returning customers" value={metrics.returningCustomers.toLocaleString()} change={percentChange(metrics.returningCustomers, previousMetrics.returningCustomers)} icon={Users} help="Identified customers with multiple orders in the selected dataset." />
        </div></TooltipProvider>

        <div className="grid gap-5 xl:grid-cols-2"><ChartCard title="Sales over time"><ResponsiveContainer width="100%" height={280}><AreaChart data={series}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.35}/><stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" className="stroke-border"/><XAxis dataKey="name"/><YAxis tickFormatter={(value) => `₹${Math.round(value/1000)}k`}/><ChartTooltip formatter={(value: number) => formatCurrency(value)}/><Area type="monotone" dataKey="sales" stroke={CHART_COLORS.primary} fill="url(#salesFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer></ChartCard>
          <ChartCard title="Peak ordering hours"><ResponsiveContainer width="100%" height={280}><BarChart data={hours}><CartesianGrid strokeDasharray="3 3" className="stroke-border"/><XAxis dataKey="hour" interval={2}/><YAxis allowDecimals={false}/><ChartTooltip/><Bar dataKey="orders" fill={CHART_COLORS.primary} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartCard></div>
        <div className="grid gap-5 lg:grid-cols-3"><Donut title="Orders by status" data={byStatus} currency={false}/><Donut title="Revenue by order type" data={byType} currency/><Donut title="Revenue by payment method" data={byPayment} currency/></div>

        <div className="grid gap-5 xl:grid-cols-2"><Ranking title="Top-selling items" items={rankings.slice(0, 8)} /><Ranking title="Least-selling items" items={[...rankings].reverse().slice(0, 8)} /></div>
        <Card><CardHeader><CardTitle className="text-base">Recent orders</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Placed</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{orders.slice(0, 8).map((order) => <TableRow key={order.id}><TableCell className="font-medium">{order.orderNumber}</TableCell><TableCell>{order.customer?.name || 'Walk-in'}</TableCell><TableCell>{formatDateTime(order.createdAt)}</TableCell><TableCell>{labelize(order.type)}</TableCell><TableCell><OrderStatusBadge status={order.status}/></TableCell><TableCell className="text-right font-semibold">{formatCurrency(order.total)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      </>}
    </div>
  </PageShell>
}

function Metric({ title, value, change, icon: Icon, help, inverse }: { title: string; value: string; change: number; icon: typeof ShoppingBag; help: string; inverse?: boolean }) { const positive = inverse ? change <= 0 : change >= 0; return <div className="stat-card"><div className="flex justify-between gap-2"><div><Tooltip><TooltipTrigger asChild><button className="text-left text-sm font-medium text-muted-foreground underline decoration-dotted underline-offset-4">{title}</button></TooltipTrigger><TooltipContent className="max-w-[230px]">{help}</TooltipContent></Tooltip><p className="mt-2 text-2xl font-bold">{value}</p><p className={`mt-2 text-xs font-medium ${positive ? 'text-success' : 'text-danger'}`}>{formatPercent(change)} vs previous period</p></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5"/></div></div></div> }
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) { return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card> }
function Donut({ title, data, currency }: { title: string; data: Array<{ name: string; value: number }>; currency: boolean }) { return <ChartCard title={title}><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={data} innerRadius={58} outerRadius={86} paddingAngle={2} dataKey="value">{data.map((entry,index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]}/>)}</Pie><ChartTooltip formatter={(value: number) => currency ? formatCurrency(value) : value} labelFormatter={(label) => labelize(String(label))}/></PieChart></ResponsiveContainer><div className="flex flex-wrap justify-center gap-2">{data.map((entry,index) => <span key={entry.name} className="inline-flex items-center gap-1 text-xs"><span className="h-2 w-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}/>{labelize(entry.name)}</span>)}</div></ChartCard> }
function Ranking({ title, items }: { title: string; items: Array<{ name: string; quantity: number; revenue: number }> }) { return <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent className="space-y-3">{items.map((item,index) => <div key={item.name} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 text-sm"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-semibold">{index+1}</span><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.quantity} sold</p></div><span className="font-semibold">{formatCurrency(item.revenue)}</span></div>)}</CardContent></Card> }
function DashboardSkeleton() { return <div className="space-y-5" aria-label="Loading sales dashboard"><div className="grid grid-cols-2 gap-3 xl:grid-cols-5">{Array.from({length:10}).map((_,i)=><Skeleton key={i} className="h-32 rounded-2xl"/>)}</div><div className="grid gap-5 xl:grid-cols-2"><Skeleton className="h-80 rounded-2xl"/><Skeleton className="h-80 rounded-2xl"/></div></div> }
function State({ title, action }: { title: string; action: React.ReactNode }) { return <div className="rounded-2xl border border-dashed bg-card py-16 text-center"><h2 className="mb-4 font-semibold">{title}</h2>{action}</div> }
