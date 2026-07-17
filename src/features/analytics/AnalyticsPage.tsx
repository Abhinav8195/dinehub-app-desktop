import React from 'react'
import { TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { CHART_COLORS } from '@/constants/brand'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { REVENUE_CHART_DATA, TOP_PRODUCTS, DASHBOARD_STATS } from '@/constants/mock-data'

const FORECAST = [
  { month: 'Jul', actual: 78000, forecast: 82000 },
  { month: 'Aug', actual: null, forecast: 85000 },
  { month: 'Sep', actual: null, forecast: 88000 },
  { month: 'Oct', actual: null, forecast: 92000 }
]

const HEATMAP_HOURS = ['10am', '12pm', '2pm', '4pm', '6pm', '8pm', '10pm']
const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AnalyticsPage() {
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Analytics" description="Deep insights, forecasts, and business intelligence" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Revenue Growth" value={12.5} change={12.5} format="number" icon={<DollarSign className="h-5 w-5" />} />
          <StatCard title="Customer Growth" value={15.3} change={15.3} format="number" icon={<Users className="h-5 w-5" />} />
          <StatCard title="Order Volume" value={DASHBOARD_STATS.orders.value} change={8.2} format="number" icon={<ShoppingBag className="h-5 w-5" />} />
          <StatCard title="Forecast (Next Month)" value={85000} format="currency" icon={<TrendingUp className="h-5 w-5" />} />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={REVENUE_CHART_DATA}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" /><YAxis /><Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Top Products Performance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={TOP_PRODUCTS} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" /><YAxis dataKey="name" type="category" width={100} /><Tooltip />
                  <Bar dataKey="sales" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Forecast</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={FORECAST}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip />
                <Area type="monotone" dataKey="forecast" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.1} strokeDasharray="5 5" />
                <Area type="monotone" dataKey="actual" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Busy Hours Heatmap</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${HEATMAP_HOURS.length}, 1fr)` }}>
                <div />
                {HEATMAP_HOURS.map((h) => <div key={h} className="text-xs text-center text-muted-foreground p-1">{h}</div>)}
                {HEATMAP_DAYS.map((day) => (
                  <React.Fragment key={day}>
                    <div className="text-xs font-medium p-2">{day}</div>
                    {HEATMAP_HOURS.map((hour, hi) => {
                      const intensity = 0.2 + (hi * 0.1) + (HEATMAP_DAYS.indexOf(day) * 0.05)
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="rounded-lg h-10"
                          style={{ backgroundColor: `rgba(37, 99, 235, ${Math.min(intensity, 1)})` }}
                          title={`${day} ${hour}`}
                        />
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
