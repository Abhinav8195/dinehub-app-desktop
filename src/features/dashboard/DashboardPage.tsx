import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign, ShoppingBag, Users, TrendingUp, ChefHat,
  ArrowRight, Utensils, Package
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { Link } from 'react-router-dom'
import { CHART_COLORS } from '@/constants/brand'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { StatCard } from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { dashboardApi } from '@/api/dashboard.api'
import { APP_BASE } from '@/constants/navigation'
import { formatCurrency } from '@/lib/utils'
import { PermissionGuard } from '@/guards/PermissionGuard'
import { FeatureGate } from '@/guards/FeatureGate'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { useAuth } from '@/hooks/useAuth'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function DashboardPage() {
  const featureAccess = useFeatureAccess()
  const { user } = useAuth()
  const selectedRestaurantId = useSelector((state: RootState) => state.app.selectedRestaurantId)
  const tenantId = user?.isSuperAdmin || user?.userType === 'SUPER_ADMIN'
    ? selectedRestaurantId
    : user?.tenantId
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['dashboard', 'stats', tenantId],
    queryFn: () => dashboardApi.getStats(tenantId),
    refetchInterval: 30_000,
    enabled: Boolean(tenantId) && !featureAccess.isLoading && featureAccess.hasFeature('DASHBOARD'),
  })

  const stats = data?.stats
  const tables = data?.tables

  if (!featureAccess.isLoading && !featureAccess.hasFeature('DASHBOARD')) {
    return (
      <PageShell>
        <div className="page-container">
          <PageHeader title="DineHub" description="Choose an available module from the sidebar." />
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Dashboard analytics are not included in your current plan.
            </CardContent>
          </Card>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell isLoading={isLoading || featureAccess.isLoading}>
      <div className="page-container">
        <PageHeader
          title="Dashboard"
          description="Welcome back! Here's what's happening at your restaurant today."
          actions={
            <>
              {isFetching && !isLoading && (
                <Badge variant="secondary" className="mr-2">Refreshing…</Badge>
              )}
              <PermissionGuard permission="reports.view" feature="REPORTS">
                <Button variant="outline" asChild><Link to={`${APP_BASE}/reports`}>View Reports</Link></Button>
              </PermissionGuard>
              <PermissionGuard permission="pos.access" feature="POS">
                <Button asChild><Link to={`${APP_BASE}/pos`}>Open POS</Link></Button>
              </PermissionGuard>
            </>
          }
        />

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Today's Revenue" value={stats?.revenue.value ?? 0} change={stats?.revenue.change} format="currency" icon={<DollarSign className="h-5 w-5" />} />
            <FeatureGate feature="ORDERS"><StatCard title="Orders" value={stats?.orders.value ?? 0} change={stats?.orders.change} format="number" icon={<ShoppingBag className="h-5 w-5" />} /></FeatureGate>
            <FeatureGate feature="CUSTOMERS"><StatCard title="Customers" value={stats?.customers.value ?? 0} change={stats?.customers.change} format="number" icon={<Users className="h-5 w-5" />} /></FeatureGate>
            <StatCard title="Avg Order" value={stats?.avgOrder.value ?? 0} change={stats?.avgOrder.change} format="currency" icon={<TrendingUp className="h-5 w-5" />} />
            <StatCard title="Profit" value={stats?.profit.value ?? 0} change={stats?.profit.change} format="currency" icon={<DollarSign className="h-5 w-5" />} />
            <FeatureGate feature="ACCOUNTING"><StatCard title="Expense" value={stats?.expense.value ?? 0} change={stats?.expense.change} format="currency" icon={<Package className="h-5 w-5" />} /></FeatureGate>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Revenue Overview</CardTitle>
                <Badge variant="secondary">This Week</Badge>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data?.revenueChart ?? []}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <FeatureGate feature="MENU_MANAGEMENT"><Card>
              <CardHeader>
                <CardTitle className="text-base">Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(data?.topProducts ?? []).map((product) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{product.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(product.revenue)}</span>
                  </div>
                ))}
                {!data?.topProducts?.length && (
                  <p className="text-sm text-muted-foreground">No sales today yet</p>
                )}
              </CardContent>
            </Card></FeatureGate>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureGate feature="TABLE_MANAGEMENT"><Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-primary" /> Table Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold">{tables?.occupied ?? 0}/{tables?.total ?? 0}</span>
                  <Badge variant="success">{tables?.available ?? 0} available</Badge>
                </div>
                <Progress value={tables?.total ? (tables.occupied / tables.total) * 100 : 0} className="h-2" />
                <Button variant="link" className="px-0 mt-2" asChild>
                  <Link to={`${APP_BASE}/tables`}>Manage Tables <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card></FeatureGate>

            <FeatureGate feature="KOT_KITCHEN"><Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-warning" /> Kitchen Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{data?.kitchenQueue ?? 0}</div>
                <p className="text-xs text-muted-foreground mb-3">Pending + preparing</p>
                <Button variant="link" className="px-0" asChild>
                  <Link to={`${APP_BASE}/kitchen`}>Open Kitchen <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card></FeatureGate>

            <FeatureGate feature="RESERVATIONS"><Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-danger" /> Reserved Tables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{tables?.reserved ?? 0}</div>
                <p className="text-xs text-muted-foreground">Currently reserved</p>
              </CardContent>
            </Card></FeatureGate>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FeatureGate feature="ORDERS"><Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <Button variant="ghost" size="sm" asChild><Link to={`${APP_BASE}/orders`}>View All</Link></Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.recentOrders ?? []).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {order.orderNumber.replace('#', '').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{order.orderNumber} · {order.customer}</p>
                          <p className="text-xs text-muted-foreground capitalize">{order.type} · {order.itemCount} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(order.total)}</p>
                        <Badge variant={order.status === 'completed' ? 'success' : order.status === 'preparing' ? 'warning' : 'info'} className="text-[10px]">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {!data?.recentOrders?.length && (
                    <p className="text-sm text-muted-foreground text-center py-6">No orders yet today</p>
                  )}
                </div>
              </CardContent>
            </Card></FeatureGate>
          </motion.div>

          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.revenueChart ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="orders" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </PageShell>
  )
}
