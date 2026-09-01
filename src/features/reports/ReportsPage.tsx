import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, Download, FileText, Printer, RefreshCw, Search, TrendingUp,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { CHART_COLORS } from '@/constants/brand'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { menuApi } from '@/api/menu.api'
import { ordersApi } from '@/api/orders.api'
import { reportsApi } from '@/api/reports.api'
import type { PosOrder } from '@/api/types/pos.types'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'
import { getDateRange, labelize, normalize, toLocalYmd, type DatePreset } from '@/features/orders/order-utils'
import { aggregateSales, groupRevenue } from '@/features/orders/sales-utils'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { GroupedItemReport } from './components/GroupedItemReport'
import {
  REPORT_KINDS,
  buildCategoryLookup,
  buildCategorySummary,
  buildEmployeeSummary,
  buildGroupSummary,
  buildItemGroups,
  buildVariationSummary,
  grandTotals,
  rowsToCsv,
  type ReportKind,
} from './lib/report-aggregates'

const CHANNEL_COLORS: Record<string, string> = {
  DINE_IN: CHART_COLORS.primary,
  TAKEAWAY: CHART_COLORS.success,
  DELIVERY: '#FFB300',
  ONLINE: CHART_COLORS.muted,
}

async function fetchOrdersForPeriod(
  period: DatePreset,
  fromDate: string,
  toDate: string,
  signal?: AbortSignal,
): Promise<PosOrder[]> {
  const range = getDateRange(period, new Date(), fromDate, toDate)
  const all: PosOrder[] = []
  let page = 1
  let totalPages = 1
  while (page <= totalPages && page <= 25) {
    const result = await ordersApi.list({
      period,
      from: range.from,
      to: range.to,
      fromDate: period === 'custom' ? fromDate || undefined : undefined,
      toDate: period === 'custom' ? toDate || undefined : undefined,
      limit: 100,
      page,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }, signal)
    all.push(...(result.orders ?? []))
    totalPages = result.meta?.totalPages ?? 1
    page += 1
    if (!result.orders?.length) break
  }
  return all
}

function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const VALID_KINDS = new Set<ReportKind>(REPORT_KINDS.map((r) => r.id))

function parseReportKind(value: string | null): ReportKind {
  if (value && VALID_KINDS.has(value as ReportKind)) return value as ReportKind
  return 'item'
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const kind = parseReportKind(searchParams.get('kind'))
  const [period, setPeriod] = useState<DatePreset>('today')

  useEffect(() => {
    if (!searchParams.get('kind')) {
      setSearchParams({ kind: 'item' }, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')

  const range = useMemo(
    () => getDateRange(period, new Date(), fromDate, toDate),
    [period, fromDate, toDate],
  )
  const rangeLabel = useMemo(() => {
    if (period === 'custom' && fromDate && toDate) return `${fromDate} → ${toDate}`
    if (range.from && range.to) {
      return `${toLocalYmd(new Date(range.from))} → ${toLocalYmd(new Date(range.to))}`
    }
    return period
  }, [period, fromDate, toDate, range])

  const ordersQuery = useQuery({
    queryKey: ['reports', 'orders', period, fromDate, toDate],
    queryFn: ({ signal }) => fetchOrdersForPeriod(period, fromDate, toDate, signal),
    enabled: period !== 'custom' || Boolean(fromDate && toDate),
    staleTime: 30_000,
  })

  const menuQuery = useQuery({
    queryKey: ['menu', 'items', 'reports'],
    queryFn: () => menuApi.listItems(),
    staleTime: 60_000,
  })

  const categoriesQuery = useQuery({
    queryKey: ['menu', 'categories', 'reports'],
    queryFn: () => menuApi.listCategories(),
    staleTime: 60_000,
  })

  // Lightweight sales API for Sales Summary KPIs (when backend period maps)
  const backendPeriod =
    period === 'today' ? 'daily' : period === 'last7' || period === 'yesterday' ? 'weekly' : 'monthly'
  const salesApiQuery = useQuery({
    queryKey: ['reports', 'sales-api', backendPeriod],
    queryFn: () => reportsApi.sales(backendPeriod),
    enabled: kind === 'sales',
  })

  const orders = ordersQuery.data ?? []
  const categoryByMenuId = useMemo(
    () => buildCategoryLookup(menuQuery.data ?? [], categoriesQuery.data ?? []),
    [menuQuery.data, categoriesQuery.data],
  )
  const itemGroups = useMemo(
    () => buildItemGroups(orders, categoryByMenuId, search),
    [orders, categoryByMenuId, search],
  )
  const categoryRows = useMemo(() => buildCategorySummary(itemGroups), [itemGroups])
  const variationRows = useMemo(() => buildVariationSummary(orders, search), [orders, search])
  const employeeRows = useMemo(() => buildEmployeeSummary(orders), [orders])
  const groupRows = useMemo(() => buildGroupSummary(orders), [orders])
  const metrics = useMemo(() => aggregateSales(orders), [orders])
  const byChannel = useMemo(() => groupRevenue(orders, (o) => o.type), [orders])
  const byPayment = useMemo(() => groupRevenue(orders, (o) => o.paymentMethod), [orders])
  const totals = useMemo(() => grandTotals(itemGroups), [itemGroups])
  const activeMeta = REPORT_KINDS.find((r) => r.id === kind)

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) =>
      o.orderNumber?.toLowerCase().includes(q)
      || o.customer?.name?.toLowerCase().includes(q)
      || o.table?.label?.toLowerCase().includes(q)
      || normalize(o.status).includes(q),
    )
  }, [orders, search])

  const exportCsv = () => {
    let headers: string[] = []
    let rows: Array<Array<string | number>> = []
    if (kind === 'item') {
      headers = ['Category', 'Item', 'Code', 'Qty', 'Rate', 'Total']
      rows = itemGroups.flatMap((g) =>
        g.items.map((i) => [g.category, i.name, i.code, i.quantity, i.rate.toFixed(2), i.total.toFixed(2)]),
      )
    } else if (kind === 'category') {
      headers = ['Category', 'Qty', 'Total']
      rows = categoryRows.map((r) => [r.label, r.quantity, r.total.toFixed(2)])
    } else if (kind === 'variation') {
      headers = ['Variation', 'Qty', 'Total']
      rows = variationRows.map((r) => [r.label, r.quantity, r.total.toFixed(2)])
    } else if (kind === 'employee') {
      headers = ['Employee', 'Orders', 'Items', 'Total']
      rows = employeeRows.map((r) => [r.label, r.orders ?? 0, r.quantity, r.total.toFixed(2)])
    } else if (kind === 'group') {
      headers = ['Group', 'Orders', 'Items', 'Total']
      rows = groupRows.map((r) => [r.label, r.orders ?? 0, r.quantity, r.total.toFixed(2)])
    } else if (kind === 'order') {
      headers = ['Order', 'Type', 'Status', 'Payment', 'Total', 'Created']
      rows = filteredOrders.map((o) => [
        o.orderNumber,
        o.type,
        o.status,
        o.paymentMethod || '',
        o.total.toFixed(2),
        o.createdAt,
      ])
    } else {
      headers = ['Metric', 'Value']
      rows = [
        ['Gross Sales', metrics.grossSales.toFixed(2)],
        ['Net Sales', metrics.netSales.toFixed(2)],
        ['Orders', metrics.totalOrders],
        ['AOV', metrics.averageOrderValue.toFixed(2)],
        ['Discounts', metrics.discounts.toFixed(2)],
      ]
    }
    downloadTextFile(`dininghub-${kind}-report.csv`, rowsToCsv(headers, rows))
    toast.success('CSV exported')
  }

  const printReport = () => {
    const title = `${activeMeta?.label ?? 'Report'} · ${rangeLabel}`
    let body = ''
    if (kind === 'item' || kind === 'category') {
      body = itemGroups.map((g) => `
        <h3 style="margin:12px 0 4px;background:#f3f4f6;padding:6px 8px">${g.category}
          <span style="float:right">${g.quantity} · ${formatCurrency(g.total)}</span></h3>
        <table width="100%" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-size:12px">
          <tr style="border-bottom:1px solid #ddd"><th align="left">Item</th><th align="right">Qty</th><th align="right">Rate</th><th align="right">Total</th></tr>
          ${g.items.map((i) => `<tr style="border-bottom:1px solid #eee"><td>${i.name}</td><td align="right">${i.quantity}</td><td align="right">${formatCurrency(i.rate)}</td><td align="right">${formatCurrency(i.total)}</td></tr>`).join('')}
          <tr><td><b>Sub Total</b></td><td align="right"><b>${g.quantity}</b></td><td></td><td align="right"><b>${formatCurrency(g.total)}</b></td></tr>
        </table>`).join('')
      body += `<p style="margin-top:16px;font-weight:700">Grand Total: ${totals.quantity} items · ${formatCurrency(totals.total)}</p>`
    } else {
      const rows =
        kind === 'variation' ? variationRows
          : kind === 'employee' ? employeeRows
            : kind === 'group' ? groupRows
              : []
      body = `<table width="100%" cellpadding="6" style="border-collapse:collapse;font-size:12px">
        <tr style="border-bottom:1px solid #ddd"><th align="left">Name</th><th align="right">Qty/Orders</th><th align="right">Total</th></tr>
        ${rows.map((r) => `<tr style="border-bottom:1px solid #eee"><td>${r.label}</td><td align="right">${r.orders ?? r.quantity}</td><td align="right">${formatCurrency(r.total)}</td></tr>`).join('')}
      </table>`
    }
    const html = `<!doctype html><html><head><title>${title}</title></head><body style="font-family:system-ui;padding:24px">
      <h1 style="margin:0 0 4px;font-size:18px">${title}</h1>
      <p style="color:#666;margin:0 0 16px">DiningHub Report</p>${body}
      <script>window.onload=()=>window.print()</script></body></html>`
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
    if (!w) {
      toast.error('Allow pop-ups to print')
      return
    }
    w.document.write(html)
    w.document.close()
  }

  const exportServer = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const result = await reportsApi.export(
        format,
        period === 'custom' ? fromDate : toLocalYmd(range.from),
        period === 'custom' ? toDate : toLocalYmd(range.to),
      )
      const saved = await window.electronAPI?.saveBytes?.(result)
      if (saved?.saved) toast.success(`Saved ${result.filename}`)
      else if (saved && !saved.cancelled) toast.error('Could not save export')
      else if (!window.electronAPI?.saveBytes) {
        downloadTextFile(result.filename, new TextDecoder().decode(result.bytes))
        toast.success('Downloaded')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export')
    }
  }

  const isLoading = ordersQuery.isLoading || menuQuery.isLoading

  return (
    <PageShell isLoading={isLoading && !orders.length}>
      <div className="page-container space-y-4">
          <PageHeader
            title={activeMeta?.label ?? 'Reports'}
            description={`${activeMeta?.description ?? ''} · ${rangeLabel}`}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ordersQuery.refetch()}
                  disabled={ordersQuery.isFetching}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', ordersQuery.isFetching && 'animate-spin')} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={printReport}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="mr-2 h-4 w-4" /> Excel / CSV
                </Button>
                {kind === 'sales' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => exportServer('pdf')}>
                      <FileText className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportServer('xlsx')}>
                      <Download className="mr-2 h-4 w-4" /> XLSX
                    </Button>
                  </>
                )}
              </div>
            }
          />

          <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-3">
            <div>
              <Label className="text-xs">Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as DatePreset)}>
                <SelectTrigger className="mt-1 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([
                    ['today', 'Today'],
                    ['yesterday', 'Yesterday'],
                    ['last7', 'Last 7 days'],
                    ['last30', 'Last 30 days'],
                    ['month', 'This month'],
                    ['custom', 'Custom range'],
                  ] as const).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {period === 'custom' && (
              <>
                <div>
                  <Label className="text-xs">From</Label>
                  <Input type="date" className="mt-1 w-[150px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">To</Label>
                  <Input type="date" className="mt-1 w-[150px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}
            {(kind === 'item' || kind === 'category' || kind === 'variation' || kind === 'order') && (
              <div className="relative min-w-[200px] flex-1">
                <Label className="text-xs">Search</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder={kind === 'order' ? 'Bill no, customer…' : 'Item / category…'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="ml-auto text-right text-xs text-muted-foreground">
              <p>{orders.length} orders loaded</p>
              {(kind === 'item' || kind === 'category') && (
                <p className="font-medium text-foreground">
                  {totals.quantity} sold · {formatCurrency(totals.total)}
                </p>
              )}
            </div>
          </div>

          {kind === 'sales' && (
            <SalesSummaryView
              metrics={metrics}
              byChannel={byChannel}
              byPayment={byPayment}
              apiData={salesApiQuery.data}
            />
          )}

          {kind === 'item' && <GroupedItemReport groups={itemGroups} />}

          {kind === 'category' && (
            <SummaryTable
              headers={['Category', 'Qty', 'Total']}
              rows={categoryRows.map((r) => [r.label, String(r.quantity), formatCurrency(r.total)])}
            />
          )}

          {kind === 'variation' && (
            <SummaryTable
              headers={['Item · Variation', 'Qty', 'Total']}
              rows={variationRows.map((r) => [r.label, String(r.quantity), formatCurrency(r.total)])}
            />
          )}

          {kind === 'employee' && (
            <SummaryTable
              headers={['Employee / Captain', 'Orders', 'Items', 'Total']}
              rows={employeeRows.map((r) => [
                r.label,
                String(r.orders ?? 0),
                String(r.quantity),
                formatCurrency(r.total),
              ])}
              empty="No cashier data on orders yet — totals show as Unassigned"
            />
          )}

          {kind === 'group' && (
            <SummaryTable
              headers={['Order type', 'Orders', 'Items', 'Total']}
              rows={groupRows.map((r) => [
                labelize(r.label),
                String(r.orders ?? 0),
                String(r.quantity),
                formatCurrency(r.total),
              ])}
            />
          )}

          {kind === 'order' && (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No orders in this period
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredOrders.slice(0, 200).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell className="capitalize">{labelize(order.type)}</TableCell>
                      <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                      <TableCell className="capitalize">{labelize(order.paymentMethod || '—')}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(order.total)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDateTime(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </div>
    </PageShell>
  )
}

function SummaryTable({
  headers,
  rows,
  empty = 'No data for this period',
}: {
  headers: string[]
  rows: string[][]
  empty?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            {headers.map((h, i) => (
              <TableHead key={h} className={i > 0 ? 'text-right' : undefined}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={headers.length} className="py-12 text-center text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {row.map((cell, i) => (
                <TableCell key={i} className={cn(i > 0 && 'text-right tabular-nums', i === 0 && 'font-medium')}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SalesSummaryView({
  metrics,
  byChannel,
  byPayment,
  apiData,
}: {
  metrics: ReturnType<typeof aggregateSales>
  byChannel: Array<{ name: string; value: number }>
  byPayment: Array<{ name: string; value: number }>
  apiData?: Record<string, unknown>
}) {
  const apiChannel = apiData?.byChannel as Record<string, number> | undefined
  const pieData = apiChannel
    ? Object.entries(apiChannel).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
        color: CHANNEL_COLORS[name] ?? CHART_COLORS.muted,
      }))
    : byChannel.map((row, i) => ({
        name: labelize(row.name),
        value: row.value,
        color: Object.values(CHANNEL_COLORS)[i % 4] ?? CHART_COLORS.muted,
      }))

  const topProducts = (apiData?.topProducts as { name: string; quantity: number; revenue: number }[]) ?? []
  const revenue = Number(apiData?.totalRevenue ?? metrics.netSales)
  const orderCount = Number(apiData?.orderCount ?? metrics.totalOrders)
  const gst = Number((apiData?.tax as { gst?: number })?.gst ?? 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sales" value={revenue} format="currency" icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard title="Net Sales" value={metrics.netSales} format="currency" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard title="Total Orders" value={orderCount} format="number" icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard title="GST Collected" value={gst || metrics.grossSales * 0} format="currency" icon={<BarChart3 className="h-5 w-5" />} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Top Products</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topProducts.length === 0 && byChannel.length === 0 && (
              <p className="text-sm text-muted-foreground">No sales in this period</p>
            )}
            {topProducts.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span>{p.name} <span className="text-muted-foreground">×{p.quantity}</span></span>
                <span className="font-medium tabular-nums">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
            {!topProducts.length && byPayment.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="capitalize">{labelize(p.name)}</span>
                <span className="font-medium tabular-nums">{formatCurrency(p.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By Channel</CardTitle></CardHeader>
          <CardContent className="h-52">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No channel data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
