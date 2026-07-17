import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, Printer, CreditCard, Globe, Receipt, Building } from 'lucide-react'
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
import { useTaxSettings, useInvalidateTaxSettings } from '@/hooks/useTaxSettings'

export default function SettingsPage() {
  const { data: taxSettings } = useTaxSettings()
  const invalidateTax = useInvalidateTaxSettings()

  const [gstPercent, setGstPercent] = useState('5')
  const [sgstPercent, setSgstPercent] = useState('2.5')
  const [cgstPercent, setCgstPercent] = useState('2.5')
  const [serviceChargePercent, setServiceChargePercent] = useState('0')
  const [taxInclusive, setTaxInclusive] = useState(false)

  useEffect(() => {
    if (taxSettings) {
      setGstPercent(String(taxSettings.gstPercent))
      setSgstPercent(String(taxSettings.sgstPercent))
      setCgstPercent(String(taxSettings.cgstPercent))
      setServiceChargePercent(String(taxSettings.serviceChargePercent))
      setTaxInclusive(taxSettings.taxInclusive)
    }
  }, [taxSettings])

  const saveTaxMutation = useMutation({
    mutationFn: () => settingsApi.updateTax({
      gstPercent: parseFloat(gstPercent) || 0,
      sgstPercent: parseFloat(sgstPercent) || 0,
      cgstPercent: parseFloat(cgstPercent) || 0,
      serviceChargePercent: parseFloat(serviceChargePercent) || 0,
      taxInclusive,
    }),
    onSuccess: () => {
      invalidateTax()
      toast.success('Tax settings saved — POS will use new rates')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save tax settings'),
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
                  <div className="space-y-2"><Label>Restaurant Name</Label><Input defaultValue="DineHub Downtown" /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input defaultValue="+91 98765 43210" /></div>
                </div>
                <div className="space-y-2"><Label>Address</Label><Input defaultValue="123 Main Street, Mumbai" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Currency</Label>
                    <Select defaultValue="inr"><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="usd">USD ($)</SelectItem><SelectItem value="eur">EUR (€)</SelectItem><SelectItem value="inr">INR (₹)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Timezone</Label>
                    <Select defaultValue="ist"><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="ist">India Standard Time</SelectItem><SelectItem value="est">Eastern Time</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="printer" className="mt-6 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Receipt Printer</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between"><div><p className="font-medium">Thermal Printer</p><p className="text-sm text-muted-foreground">EPSON TM-T88VI</p></div><Switch defaultChecked /></div>
                <Separator />
                <div className="flex items-center justify-between"><div><p className="font-medium">Kitchen Printer</p><p className="text-sm text-muted-foreground">Star TSP143III</p></div><Switch defaultChecked /></div>
                <Separator />
                <div className="flex items-center justify-between"><div><p className="font-medium">Auto Print Receipt</p></div><Switch defaultChecked /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tax Configuration</CardTitle>
                <CardDescription>Set GST, SGST, CGST rates — applied dynamically on POS checkout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GST (%)</Label>
                    <Input type="number" step="0.1" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SGST (%)</Label>
                    <Input type="number" step="0.1" value={sgstPercent} onChange={(e) => setSgstPercent(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>CGST (%)</Label>
                    <Input type="number" step="0.1" value={cgstPercent} onChange={(e) => setCgstPercent(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Charge (%)</Label>
                    <Input type="number" step="0.1" value={serviceChargePercent} onChange={(e) => setServiceChargePercent(e.target.value)} />
                  </div>
                </div>
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
                {['Stripe', 'Square', 'PayPal', 'Razorpay'].map((gw) => (
                  <div key={gw} className="flex items-center justify-between p-3 rounded-xl border">
                    <p className="font-medium">{gw}</p>
                    <Switch defaultChecked={gw === 'Razorpay'} />
                  </div>
                ))}
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
                      table: 'T-05',
                      items: [{ name: 'Grilled Salmon', qty: 2, price: 24.5 }],
                      subtotal: 49,
                      tax: 4.17,
                      total: 53.17,
                      paymentMethod: 'Card'
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}
