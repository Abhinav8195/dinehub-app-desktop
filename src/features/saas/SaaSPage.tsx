import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, CreditCard, Users, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { tenantsApi } from '@/api/tenants.api'
import { billingApi } from '@/api/phase2.api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { FEATURE_LABELS, isSubscriptionActive, subscriptionDaysLeft, subscriptionExpiryDate } from '@/lib/entitlements'
import type { FeatureKey, TenantSubscription } from '@/api/types/billing.types'
import type { TenantPlan } from '@/api/types/tenants.types'

export default function SaaSPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isSuperAdmin = Boolean(user?.isSuperAdmin)
  const { data: tenantsResult } = useQuery({
    queryKey: ['tenants', 'saas'],
    queryFn: () => tenantsApi.list({ limit: 100 }),
    enabled: isSuperAdmin,
  })
  const { data: subscription } = useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: billingApi.subscription,
  })
  const { data: plans = [] } = useQuery({
    queryKey: ['tenants', 'plans'],
    queryFn: tenantsApi.getPlans,
  })

  const generateInvoice = useMutation({
    mutationFn: () => billingApi.generateInvoice(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'subscription'] })
      toast.success('Invoice generated')
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to generate invoice'),
  })
  const checkout = useMutation({
    mutationFn: (provider: 'razorpay' | 'stripe') => billingApi.checkout(provider),
    onError: (error: Error) => toast.error(error.message || 'Checkout provider unavailable'),
    onSuccess: () => toast.success('Checkout started'),
  })

  const restaurants = tenantsResult?.data ?? []
  const invoices = subscription?.invoices ?? []
  const typedPlans = plans as TenantPlan[]
  const currentPlan = subscription?.plan ?? null
  const planEnds = subscriptionExpiryDate(subscription)
  const daysLeft = subscriptionDaysLeft(subscription)
  const availablePlans = typedPlans.filter((plan) =>
    plan.isActive !== false &&
    (currentPlan?.id ? plan.id !== currentPlan.id : plan.name !== currentPlan?.name)
  )
  const featureLabel = (feature: string) => FEATURE_LABELS[feature as FeatureKey] ?? feature.replaceAll('_', ' ')

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="SaaS Administration" description="Manage restaurants, subscriptions, and billing" actions={
          isSuperAdmin ? <Button><Plus className="h-4 w-4 mr-2" /> Add Restaurant</Button> : undefined
        } />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>
              <div><p className="text-2xl font-bold">{isSuperAdmin ? restaurants.length : 1}</p><p className="text-sm text-muted-foreground">Restaurants</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center"><Users className="h-6 w-6 text-success" /></div>
              <div><p className="text-2xl font-bold">{subscription?.plan?.name ?? '—'}</p><p className="text-sm text-muted-foreground">Current plan</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center"><CreditCard className="h-6 w-6 text-warning" /></div>
              <div><p className="text-2xl font-bold">{formatCurrency(Number(subscription?.amount ?? 0))}</p><p className="text-sm text-muted-foreground">Subscription amount</p></div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="billing">
          <TabsList>
            {isSuperAdmin && <TabsTrigger value="restaurants">Restaurants</TabsTrigger>}
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {isSuperAdmin && (
            <TabsContent value="restaurants" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.map((r) => (
                  <Card key={r.id} className="hover:shadow-elevated transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">{r.name[0]}</div>
                          <div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">{r.slug}</p></div>
                        </div>
                        <Badge variant="success">{r.status}</Badge>
                      </div>
                      <Progress value={75} className="h-1.5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="plans" className="mt-4">
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-base font-semibold">Your plan</h3>
                {currentPlan ? (
                  <Card className="border-primary shadow-elevated">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{currentPlan.name}</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge><Crown className="mr-1 h-3 w-3" /> Current</Badge>
                          <Badge variant={isSubscriptionActive(subscription as TenantSubscription) ? 'success' : 'destructive'}>
                            {subscription?.status ?? 'missing'}
                          </Badge>
                          {daysLeft !== null && (
                            <Badge variant={daysLeft <= 7 ? 'warning' : 'secondary'}>
                              {daysLeft === 0 ? 'Expired' : `${daysLeft} days left`}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription className="mt-2">
                        {planEnds
                          ? `Valid until ${formatDate(planEnds.toISOString())}`
                          : 'No expiry date on file'}
                        {subscription?.billingCycle ? ` · ${subscription.billingCycle}` : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <h4 className="mb-2 text-sm font-semibold">Your features</h4>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        <li className="text-sm">• Unlimited storage</li>
                        <li className="text-sm">• Unlimited API calls</li>
                        {(currentPlan.features ?? []).map((feature) => (
                          <li key={feature} className="text-sm">• {featureLabel(feature)}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : (
                  <Card><CardContent className="p-5 text-sm text-muted-foreground">No active subscription found.</CardContent></Card>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-base font-semibold">Available plans</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {availablePlans.map((plan) => (
                    <Card key={plan.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <CardDescription><span className="text-2xl font-bold text-foreground">{formatCurrency(Number(plan.price))}</span>/{plan.interval}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          <li className="text-sm">• Unlimited storage</li>
                          <li className="text-sm">• Unlimited API calls</li>
                          {plan.features.map((feature) => <li key={feature} className="text-sm">• {featureLabel(feature)}</li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                  {!availablePlans.length && <p className="text-sm text-muted-foreground">No other active plans are available.</p>}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscription</CardTitle>
                <CardDescription>
                  {subscription ? `${subscription.plan?.name ?? 'Plan'} · ${subscription.status ?? 'unknown'}` : 'No active subscription found'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button onClick={() => generateInvoice.mutate()} disabled={generateInvoice.isPending}>Generate Invoice</Button>
                <Button variant="outline" onClick={() => checkout.mutate('razorpay')} disabled={checkout.isPending}>Checkout (Razorpay)</Button>
                <Button variant="outline" onClick={() => checkout.mutate('stripe')} disabled={checkout.isPending}>Checkout (Stripe)</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet</p>}
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{invoice.status}</Badge>
                      <span className="font-semibold">{formatCurrency(Number(invoice.amount))}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}
