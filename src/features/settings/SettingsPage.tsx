import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, Printer, CreditCard, Globe, Receipt, Building, RefreshCw, RotateCcw, Clock } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { BRAND } from '@/constants/brand'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { buildReceiptHtml } from '@/lib/print/receipt'
import { settingsApi } from '@/api/settings.api'
import { dashboardApi } from '@/api/dashboard.api'
import { useTaxSettings, useInvalidateTaxSettings } from '@/hooks/useTaxSettings'
import { printersApi } from '@/api/phase1.api'
import { useAuth } from '@/hooks/useAuth'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

export default function SettingsPage() {
  const { data: taxSettings } = useTaxSettings()
  const invalidateTax = useInvalidateTaxSettings()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const selectedRestaurantId = useSelector((state: RootState) => state.app.selectedRestaurantId)
  const tenantId = user?.isSuperAdmin || user?.userType === 'SUPER_ADMIN'
    ? selectedRestaurantId
    : user?.tenantId
  const { data: restaurant } = useQuery({ queryKey: ['settings', 'restaurant'], queryFn: settingsApi.getRestaurant })
  const { data: printers = [] } = useQuery({ queryKey: ['printers'], queryFn: printersApi.list })
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', 'stats', 'settings-activity', tenantId],
    queryFn: () => dashboardApi.getStats(tenantId),
    enabled: Boolean(tenantId),
  })
  const activitiesHaveTenantIds = dashboard?.activities.some((activity) => activity.tenantId || activity.restaurantId) ?? false
  const restaurantActivities = (dashboard?.activities ?? []).filter((activity) =>
    !activitiesHaveTenantIds || activity.tenantId === tenantId || activity.restaurantId === tenantId
  )

  const [gstPercent, setGstPercent] = useState('5')
  const [sgstPercent, setSgstPercent] = useState('2.5')
  const [cgstPercent, setCgstPercent] = useState('2.5')
  const [igstPercent, setIgstPercent] = useState('0')
  const [taxMode, setTaxMode] = useState<'intra' | 'inter'>('intra')
  const [serviceChargePercent, setServiceChargePercent] = useState('0')
  const [taxInclusive, setTaxInclusive] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<Awaited<ReturnType<typeof window.electronAPI.updates.getStatus>> | null>(null)
  const [restaurantForm, setRestaurantForm] = useState({
    name: '', legalName: '', address: '', phone: '', gstin: '', fssaiNumber: '', defaultLanguage: 'en',
    razorpayEnabled: false, stripeEnabled: false, squareEnabled: false, paypalEnabled: false,
    razorpayKeyId: '', stripePublishableKey: '', kotEnabled: true,
  })

  useEffect(() => {
    if (taxSettings) {
      const cgst = Number(taxSettings.cgstPercent) || 0
      const sgst = Number(taxSettings.sgstPercent) || 0
      const gst = Number(taxSettings.gstPercent) || 0
      setSgstPercent(String(taxSettings.sgstPercent))
      setCgstPercent(String(taxSettings.cgstPercent))
      if (cgst === 0 && sgst === 0 && gst > 0) {
        // Inter-state: gstPercent stores IGST
        setTaxMode('inter')
        setIgstPercent(String(gst))
        setGstPercent(String(gst))
      } else {
        // Intra-state: CGST + SGST halves; gstPercent must stay 0 in tax math
        setTaxMode('intra')
        setIgstPercent('0')
        setGstPercent(String(cgst + sgst || gst || 5))
      }
      setServiceChargePercent(String(taxSettings.serviceChargePercent))
      setTaxInclusive(taxSettings.taxInclusive)
    }
  }, [taxSettings])

  const applyGstSlab = (slab: number, mode: 'intra' | 'inter' = taxMode) => {
    setGstPercent(String(slab))
    if (mode === 'inter') {
      setIgstPercent(String(slab))
      setCgstPercent('0')
      setSgstPercent('0')
    } else {
      const half = slab / 2
      setIgstPercent('0')
      setCgstPercent(String(half))
      setSgstPercent(String(half))
    }
  }
  useEffect(() => {
    if (!restaurant) return
    setRestaurantForm({
      name: String(restaurant.name ?? ''),
      legalName: String(restaurant.legalName ?? ''),
      address: String(restaurant.address ?? ''),
      phone: String(restaurant.phone ?? ''),
      gstin: String(restaurant.gstin ?? ''),
      fssaiNumber: String(restaurant.fssaiNumber ?? ''),
      defaultLanguage: String(restaurant.defaultLanguage ?? 'en'),
      razorpayEnabled: Boolean(restaurant.razorpayEnabled),
      stripeEnabled: Boolean(restaurant.stripeEnabled),
      squareEnabled: Boolean(restaurant.squareEnabled),
      paypalEnabled: Boolean(restaurant.paypalEnabled),
      razorpayKeyId: String(restaurant.razorpayKeyId ?? ''),
      stripePublishableKey: String(restaurant.stripePublishableKey ?? ''),
      kotEnabled: restaurant.kotEnabled !== false,
    })
  }, [restaurant])
  useEffect(() => {
    window.electronAPI.updates.getStatus().then(setUpdateStatus).catch(() => {})
    return window.electronAPI.updates.onStatus(setUpdateStatus)
  }, [])

  const checkForUpdates = async () => {
    const next = await window.electronAPI.updates.check()
    setUpdateStatus(next)
    if (next.state === 'not-available') toast.success('DineHub is up to date')
    if (next.state === 'error') toast.error(next.message || 'Unable to check for updates')
  }

  const saveTaxMutation = useMutation({
    mutationFn: () => {
      const slab = parseFloat(gstPercent) || 0
      const half = slab / 2
      // Tax engine sums gst + cgst + sgst. Intra = CGST+SGST only; Inter = IGST in gstPercent.
      if (taxMode === 'inter') {
        return settingsApi.updateTax({
          gstPercent: parseFloat(igstPercent) || slab,
          sgstPercent: 0,
          cgstPercent: 0,
          serviceChargePercent: parseFloat(serviceChargePercent) || 0,
          taxInclusive,
        })
      }
      return settingsApi.updateTax({
        gstPercent: 0,
        sgstPercent: parseFloat(sgstPercent) || half,
        cgstPercent: parseFloat(cgstPercent) || half,
        serviceChargePercent: parseFloat(serviceChargePercent) || 0,
        taxInclusive,
      })
    },
    onSuccess: () => {
      invalidateTax()
      toast.success('Tax settings saved — POS will use new rates')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save tax settings'),
  })
  const saveRestaurantMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => settingsApi.updateRestaurant(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings', 'restaurant'], (current: Record<string, unknown> | undefined) => ({ ...current, ...saved }))
      toast.success('Restaurant settings saved')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save restaurant settings'),
  })

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="Settings" description="Configure restaurant, printers, taxes, and integrations" />

        <Tabs defaultValue="restaurant">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="restaurant"><Building className="h-3.5 w-3.5 mr-1" /> Restaurant</TabsTrigger>
            <TabsTrigger value="printer"><Printer className="h-3.5 w-3.5 mr-1" /> Printers</TabsTrigger>
            <TabsTrigger value="tax">Taxes</TabsTrigger>
            <TabsTrigger value="payment"><CreditCard className="h-3.5 w-3.5 mr-1" /> Payment</TabsTrigger>
            <TabsTrigger value="receipt"><Receipt className="h-3.5 w-3.5 mr-1" /> Receipt</TabsTrigger>
            <TabsTrigger value="language"><Globe className="h-3.5 w-3.5 mr-1" /> Language</TabsTrigger>
            <TabsTrigger value="activity"><Clock className="h-3.5 w-3.5 mr-1" /> Activity</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="restaurant" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Restaurant Details</CardTitle>
                <CardDescription>Basic information about your restaurant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Restaurant Name</Label><Input value={restaurantForm.name} onChange={(event) => setRestaurantForm({ ...restaurantForm, name: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Legal Name</Label><Input value={restaurantForm.legalName} onChange={(event) => setRestaurantForm({ ...restaurantForm, legalName: event.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Full Address</Label><Input value={restaurantForm.address} onChange={(event) => setRestaurantForm({ ...restaurantForm, address: event.target.value })} placeholder="Street, city, state and PIN code" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>GSTIN</Label><Input value={restaurantForm.gstin} onChange={(event) => setRestaurantForm({ ...restaurantForm, gstin: event.target.value.toUpperCase() })} /></div>
                  <div className="space-y-2"><Label>Phone Number</Label><Input value={restaurantForm.phone} onChange={(event) => setRestaurantForm({ ...restaurantForm, phone: event.target.value })} placeholder="+91 98765 43210" /></div>
                  <div className="space-y-2"><Label>FSSAI</Label><Input value={restaurantForm.fssaiNumber} onChange={(event) => setRestaurantForm({ ...restaurantForm, fssaiNumber: event.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Default Language</Label>
                    <Select value="en" onValueChange={() => undefined} disabled>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Only English is available until additional languages are ready.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div><Label htmlFor="kot-enabled">Enable KOT / Kitchen</Label><p className="mt-1 text-xs text-muted-foreground">Show kitchen screens and send orders to the KOT workflow.</p></div>
                  <Switch id="kot-enabled" checked={restaurantForm.kotEnabled} onCheckedChange={(kotEnabled) => setRestaurantForm({ ...restaurantForm, kotEnabled })} />
                </div>
                <Button onClick={() => saveRestaurantMutation.mutate({
                  name: restaurantForm.name.trim(), legalName: restaurantForm.legalName.trim() || undefined,
                  address: restaurantForm.address.trim() || undefined, phone: restaurantForm.phone.trim() || undefined,
                  gstin: restaurantForm.gstin.trim() || undefined, fssaiNumber: restaurantForm.fssaiNumber.trim() || undefined,
                  defaultLanguage: 'en', kotEnabled: restaurantForm.kotEnabled,
                })} disabled={saveRestaurantMutation.isPending}><Save className="h-4 w-4 mr-2" /> Save Restaurant</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="printer" className="mt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Receipt Printer</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                {(printers as Array<{ id: string; name: string; type?: string; isActive?: boolean }>).map((printer) => (
                  <div key={printer.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{printer.name}</p>
                      <p className="text-sm text-muted-foreground">{printer.type ?? 'Printer'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printersApi.test(printer.id).then(() => toast.success('Printer configuration validated')).catch((error: Error) => toast.error(error.message || 'Printer test failed'))}
                      >
                        Test
                      </Button>
                      <Switch checked={printer.isActive ?? true} onCheckedChange={(isActive) => printersApi.update(printer.id, { isActive }).then(() => queryClient.invalidateQueries({ queryKey: ['printers'] }))} />
                    </div>
                  </div>
                ))}
                {printers.length > 0 && <Separator />}
                <Separator />
                <div className="flex items-center justify-between"><div><p className="font-medium">Auto Print Receipt</p></div><Switch defaultChecked /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tax Configuration (GST)</CardTitle>
                <CardDescription>
                  Indian GST slabs: 5%, 12%, 18%, 28%. Restaurants commonly use 5% or 18%.
                  Intra-state splits GST into CGST + SGST (half each). Inter-state uses IGST.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="space-y-2">
                  <Label>GST slab</Label>
                  <div className="flex flex-wrap gap-2">
                    {[5, 12, 18, 28].map((slab) => (
                      <Button
                        key={slab}
                        type="button"
                        size="sm"
                        variant={Number(gstPercent) === slab ? 'default' : 'outline'}
                        onClick={() => applyGstSlab(slab)}
                      >
                        {slab}%
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Supply type</Label>
                  <Select
                    value={taxMode}
                    onValueChange={(mode: 'intra' | 'inter') => {
                      setTaxMode(mode)
                      applyGstSlab(Number(gstPercent) || 5, mode)
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intra">Intra-state (CGST + SGST)</SelectItem>
                      <SelectItem value="inter">Inter-state (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GST total / slab (%)</Label>
                    <Input type="number" step="0.1" value={gstPercent} onChange={(e) => {
                      const next = e.target.value
                      setGstPercent(next)
                      const slab = Number(next)
                      if (Number.isFinite(slab) && slab >= 0) applyGstSlab(slab)
                    }} />
                    <p className="text-[11px] text-muted-foreground">
                      Saved as CGST+SGST (intra) or IGST (inter). Rates are not double-counted.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>IGST (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={igstPercent}
                      disabled={taxMode === 'intra'}
                      onChange={(e) => {
                        const next = e.target.value
                        setIgstPercent(next)
                        setGstPercent(next)
                        setCgstPercent('0')
                        setSgstPercent('0')
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CGST (%)</Label>
                    <Input type="number" step="0.1" value={cgstPercent} disabled={taxMode === 'inter'} onChange={(e) => setCgstPercent(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SGST (%)</Label>
                    <Input type="number" step="0.1" value={sgstPercent} disabled={taxMode === 'inter'} onChange={(e) => setSgstPercent(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Charge (%)</Label>
                    <Input type="number" step="0.1" value={serviceChargePercent} onChange={(e) => setServiceChargePercent(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Example: choose 12% intra-state → CGST 6% + SGST 6%. Choose 12% inter-state → IGST 12%.
                </p>
                <div className="flex items-center justify-between">
                  <Label>Tax Inclusive Pricing</Label>
                  <Switch checked={taxInclusive} onCheckedChange={setTaxInclusive} />
                </div>
                <Button onClick={() => saveTaxMutation.mutate()} disabled={saveTaxMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveTaxMutation.isPending ? 'Saving...' : 'Save Tax Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="mt-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Payment Gateway</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                {(['Stripe', 'Square', 'PayPal', 'Razorpay'] as const).map((gw) => {
                  const key = `${gw.toLowerCase()}Enabled` as 'stripeEnabled' | 'squareEnabled' | 'paypalEnabled' | 'razorpayEnabled'
                  return <div key={gw} className="flex items-center justify-between p-3 rounded-xl border">
                    <p className="font-medium">{gw}</p>
                    <Switch checked={restaurantForm[key]} onCheckedChange={(enabled) => setRestaurantForm({ ...restaurantForm, [key]: enabled })} />
                  </div>
                })}
                <Button onClick={() => saveRestaurantMutation.mutate({
                  razorpayEnabled: restaurantForm.razorpayEnabled, stripeEnabled: restaurantForm.stripeEnabled,
                  squareEnabled: restaurantForm.squareEnabled, paypalEnabled: restaurantForm.paypalEnabled,
                  razorpayKeyId: restaurantForm.razorpayKeyId || undefined, stripePublishableKey: restaurantForm.stripePublishableKey || undefined,
                })} disabled={saveRestaurantMutation.isPending}><Save className="h-4 w-4 mr-2" /> Save Payment Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="receipt" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receipt Template</CardTitle>
                <CardDescription>{BRAND.name} branded thermal receipt header</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="rounded-2xl border bg-brand-light/50 p-6 text-center">
                  <BrandLogo size="md" orientation="vertical" className="mx-auto" />
                  <p className="mt-4 text-sm text-muted-foreground">Receipts and invoices use the {BRAND.name} logo and brand colors.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const html = buildReceiptHtml({
                      orderNumber: '#1042',
                      invoiceNumber: '1042',
                      restaurant: { name: restaurantForm.name || 'DineHub Restaurant', gstin: restaurantForm.gstin, address: restaurantForm.address, phone: restaurantForm.phone },
                      customerName: 'Walk-in',
                      table: 'T-05',
                      orderType: 'Dine In',
                      cashierName: 'Cashier',
                      items: [{ name: 'Grilled Salmon', qty: 2, price: 24.5 }],
                      subtotal: 49,
                      taxes: [{ name: 'CGST', rate: 2.5, amount: 2.09 }, { name: 'SGST', rate: 2.5, amount: 2.08 }],
                      total: 53.17,
                      paymentMethod: 'Card',
                      footerText: 'Thanks for visit'
                    })
                    const w = window.open('', '_blank', 'width=360,height=640')
                    w?.document.write(html)
                    w?.document.close()
                  }}
                >
                  <Receipt className="h-4 w-4 mr-2" /> Preview Sample Receipt
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="language" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Language & region</CardTitle>
                <CardDescription>Only languages that are fully available are listed here.</CardDescription>
              </CardHeader>
              <CardContent className="max-w-lg space-y-4">
                <div className="space-y-2">
                  <Label>Available languages</Label>
                  <Select value="en" disabled>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (United States)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                  <p><span className="font-medium">Active language:</span> English</p>
                  <p><span className="font-medium">Locale:</span> en-US</p>
                  <p><span className="font-medium">Date format:</span> DD MMM YYYY</p>
                  <p><span className="font-medium">Number / currency format:</span> follows restaurant country settings</p>
                  <p className="text-muted-foreground">
                    Hindi and other Indian languages are not enabled yet. When a language pack is ready, it will appear in this list automatically.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Activity Timeline</CardTitle>
                  <CardDescription>Recent restaurant activity for admin review</CardDescription>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="max-h-[420px] space-y-4 overflow-y-auto pr-2">
                  {restaurantActivities.map((activity, i, arr) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
                        {i < arr.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm">{activity.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!restaurantActivities.length && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About {BRAND.name}</CardTitle>
                <CardDescription>Application information</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center py-6">
                <BrandLogo size="lg" orientation="vertical" />
                <p className="mt-4 text-sm text-muted-foreground max-w-md">{BRAND.tagline}</p>
                <p className="mt-2 text-xs text-muted-foreground">Version {BRAND.version}</p>
                <Separator className="my-6 max-w-md" />
                <div className="w-full max-w-md rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-4 text-left">
                    <div>
                      <p className="text-sm font-medium">Automatic updates</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {updateStatus?.state === 'checking' && 'Checking for a new version…'}
                        {updateStatus?.state === 'available' && `Version ${updateStatus.version} found. Download starting…`}
                        {updateStatus?.state === 'downloading' && `Downloading version ${updateStatus.version ?? ''} — ${updateStatus.progress ?? 0}%`}
                        {updateStatus?.state === 'downloaded' && `Version ${updateStatus.version} is ready to install.`}
                        {updateStatus?.state === 'not-available' && 'You are using the latest version.'}
                        {updateStatus?.state === 'error' && (updateStatus.message || 'Update check failed.')}
                        {(!updateStatus || updateStatus.state === 'idle') && 'Enabled — DineHub checks whenever the app opens.'}
                      </p>
                    </div>
                    {updateStatus?.state === 'downloaded' ? (
                      <Button type="button" size="sm" onClick={() => window.electronAPI.updates.install()}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Restart & Install
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateStatus?.state === 'checking' || updateStatus?.state === 'downloading'}
                        onClick={() => void checkForUpdates()}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${updateStatus?.state === 'checking' ? 'animate-spin' : ''}`} />
                        Check for updates
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}
