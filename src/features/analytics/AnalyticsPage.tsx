import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { CHART_COLORS } from '@/constants/brand'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { analyticsApi } from '@/api/phase2.api'
import { formatCurrency } from '@/lib/utils'

type AnalyticsPayload = {
  revenue?: number
  orders?: number
  customers?: number
  averageOrderValue?: number
  topItems?: Array<{ name: string; quantity: number; revenue: number }>
  hourlyHeatmap?: Array<{ hour: number; orders: number; revenue: number }>
  profit?: { netProfitBeforeUntrackedCogs?: number; expenses?: number; note?: string }
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.get() as Promise<AnalyticsPayload>,
  })

  const topItems = useMemo(
    () => (data?.topItems ?? []).map((item) => ({ name: item.name, sales: item.revenue, quantity: item.quantity })),
    [data?.topItems],
  )
  const hourly = data?.hourlyHeatmap ?? []
  const maxOrders = Math.max(1, ...hourly.map((bucket) => bucket.orders))

  return (
    <PageShell isLoading={isLoading}>
      <div className="page-container">
        <PageHeader title="Analytics" description="Revenue, customers, top items, and busy-hour heatmap from live orders" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Revenue" value={Number(data?.revenue ?? 0)} format="currency" icon={<DollarSign className="h-5 w-5" />} />
          <StatCard title="Customers" value={Number(data?.customers ?? 0)} format="number" icon={<Users className="h-5 w-5" />} />
          <StatCard title="Orders" value={Number(data?.orders ?? 0)} format="number" icon={<ShoppingBag className="h-5 w-5" />} />
          <StatCard title="Avg Order Value" value={Number(data?.averageOrderValue ?? 0)} format="currency" icon={<TrendingUp className="h-5 w-5" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Top Products</CardTitle></CardHeader>
            <CardContent>
              {topItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No sales in this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" /><YAxis dataKey="name" type="category" width={100} /><Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="sales" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Profit Snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Net profit (before untracked COGS)</span><span className="font-semibold">{formatCurrency(Number(data?.profit?.netProfitBeforeUntrackedCogs ?? 0))}</span></div>
              <div className="flex justify-between"><span>Expenses</span><span className="font-semibold text-danger">-{formatCurrency(Number(data?.profit?.expenses ?? 0))}</span></div>
              {data?.profit?.note && <p className="text-xs text-muted-foreground">{data.profit.note}</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Busy Hours Heatmap</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
              {hourly.map((bucket) => {
                const intensity = bucket.orders / maxOrders
                return (
                  <div
                    key={bucket.hour}
                    className="rounded-lg h-14 flex flex-col items-center justify-center text-[10px]"
                    style={{ backgroundColor: `rgba(37, 99, 235, ${0.12 + intensity * 0.88})`, color: intensity > 0.55 ? 'white' : undefined }}
                    title={`${bucket.hour}:00 · ${bucket.orders} orders · ${formatCurrency(bucket.revenue)}`}
                  >
                    <span className="font-medium">{bucket.hour}:00</span>
                    <span>{bucket.orders}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
