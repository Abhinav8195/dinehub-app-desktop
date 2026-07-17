import { Building2, Plus, CreditCard, Users, Crown } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RESTAURANTS } from '@/constants/navigation'
import { formatCurrency } from '@/lib/utils'

const PLANS = [
  { name: 'Starter', price: 49, features: ['1 Branch', '5 Users', 'Basic POS'], current: false },
  { name: 'Professional', price: 99, features: ['5 Branches', '25 Users', 'Full ERP', 'Analytics'], current: true },
  { name: 'Enterprise', price: 249, features: ['Unlimited', 'Custom', 'API Access', 'Priority Support'], current: false }
]

export default function SaaSPage() {
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="SaaS Administration" description="Manage restaurants, subscriptions, and billing" actions={
          <Button><Plus className="h-4 w-4 mr-2" /> Add Restaurant</Button>
        } />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>
              <div><p className="text-2xl font-bold">{RESTAURANTS.length}</p><p className="text-sm text-muted-foreground">Restaurants</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center"><Users className="h-6 w-6 text-success" /></div>
              <div><p className="text-2xl font-bold">48</p><p className="text-sm text-muted-foreground">Active Users</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center"><CreditCard className="h-6 w-6 text-warning" /></div>
              <div><p className="text-2xl font-bold">{formatCurrency(297)}</p><p className="text-sm text-muted-foreground">Monthly Revenue</p></div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="restaurants">
          <TabsList>
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RESTAURANTS.map((r) => (
            <Card key={r.id} className="hover:shadow-elevated transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">{r.name[0]}</div>
                    <div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">{r.branches} branches</p></div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
                <Progress value={75} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-2">Professional Plan</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <Card key={plan.name} className={plan.current ? 'border-primary shadow-elevated' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.current && <Badge><Crown className="h-3 w-3 mr-1" /> Current</Badge>}
                </div>
                <CardDescription><span className="text-2xl font-bold text-foreground">{formatCurrency(plan.price)}</span>/month</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((f) => <li key={f} className="text-sm flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" />{f}</li>)}
                </ul>
                {!plan.current && <Button variant="outline" className="w-full mt-4">Upgrade</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
