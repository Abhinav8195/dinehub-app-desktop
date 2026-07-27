import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, BarChart3, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_COLORS } from '@/constants/brand'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { reportsApi } from '@/api/reports.api'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

type Period = 'daily' | 'weekly' | 'monthly'

const CHANNEL_COLORS: Record<string, string> = {
  DINE_IN: CHART_COLORS.primary,
  TAKEAWAY: CHART_COLORS.success,
  DELIVERY: '#FFB300',
  ONLINE: CHART_COLORS.muted,
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('weekly')

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'sales', period],
    queryFn: () => reportsApi.sales(period),
  })

  const byChannel = data?.byChannel as Record<string, number> | undefined
  const pieData = byChannel
    ? Object.entries(byChannel).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
        color: CHANNEL_COLORS[name] ?? CHART_COLORS.muted,
      }))
    : []

  const topProducts = (data?.topProducts as { name: string; quantity: number; revenue: number }[]) ?? []

  const exportReport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const result = await reportsApi.export(format)
      const url = URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export report')
    }
  }

  return (
    <PageShell isLoading={isLoading}>
      <div className="page-container space-y-6">
        <PageHeader
          title="Reports"
          description="Sales, profit, tax, and channel analytics from live order data"
          actions={
            <>
              <Button variant="outline" onClick={() => exportReport('csv')}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportReport('pdf')}>
                <FileText className="h-4 w-4 mr-2" /> Export PDF
              </Button>
              <Button variant="outline" onClick={() => exportReport('xlsx')}>
                <Download className="h-4 w-4 mr-2" /> Export Excel
              </Button>
            </>
          }
        />

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Sales"
            value={Number(data?.totalRevenue ?? 0)}
            format="currency"
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatCard
            title="Net Profit (est.)"
            value={Number(data?.totalRevenue ?? 0) * 0.34}
            format="currency"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="Total Orders"
            value={Number(data?.orderCount ?? 0)}
            format="number"
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatCard
            title="GST Collected"
            value={Number((data?.tax as { gst?: number })?.gst ?? 0)}
            format="currency"
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Top Products</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {topProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">No sales in this period</p>
              )}
              {topProducts.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} sold</p>
                  </div>
                  <span className="font-semibold">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Sales by Channel</CardTitle></CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No channel data</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Tax Breakdown</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-muted-foreground">GST</p>
              <p className="text-xl font-bold">{formatCurrency(Number((data?.tax as { gst?: number })?.gst ?? 0))}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-muted-foreground">SGST</p>
              <p className="text-xl font-bold">{formatCurrency(Number((data?.tax as { sgst?: number })?.sgst ?? 0))}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-muted-foreground">CGST</p>
              <p className="text-xl font-bold">{formatCurrency(Number((data?.tax as { cgst?: number })?.cgst ?? 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
