import { useQuery } from '@tanstack/react-query'
import { QrCode, Download, Eye, Smartphone, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BRAND } from '@/constants/brand'
import { tablesApi } from '@/api/tables.api'

export default function QROrderingPage() {
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.list(),
    refetchInterval: 15_000,
  })
  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="QR Ordering" description={`${BRAND.name} contactless table ordering`} actions={
          <Button><Download className="h-4 w-4 mr-2" /> Export All QR</Button>
        } />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">QR Generator</CardTitle>
              <CardDescription>Configure and generate table QR codes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Table Number</Label>
                <Input placeholder="e.g. Table 5" defaultValue="Table 5" />
              </div>
              <div className="space-y-2">
                <Label>Menu URL</Label>
                <Input defaultValue={`${BRAND.urls.menu}/table/5`} />
              </div>
              <Button className="w-full"><QrCode className="h-4 w-4 mr-2" /> Generate QR</Button>
              <div className="flex items-center justify-center p-8 rounded-2xl bg-brand-light/40">
                <div className="h-40 w-40 rounded-xl bg-white flex flex-col items-center justify-center border-2 border-dashed border-border p-4">
                  <img src={BRAND.logo} alt={BRAND.name} className="h-10 object-contain mb-2" />
                  <QrCode className="h-20 w-20 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Table QR Codes</CardTitle>
              <CardDescription>Active QR codes for all tables</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map((table) => (
                  <div key={table.id} className="flex flex-col items-center p-4 rounded-2xl border bg-card hover:shadow-elevated transition-all">
                    <div className="h-24 w-24 rounded-xl bg-muted flex items-center justify-center mb-3">
                      <QrCode className="h-16 w-16" />
                    </div>
                    <p className="font-semibold">Table {table.number}</p>
                    <p className="text-xs text-muted-foreground capitalize">{table.floor} · {table.status}</p>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Live Orders', value: '8', desc: 'Active QR orders' },
            { title: 'Call Waiter', value: '3', desc: 'Pending requests' },
            { title: 'Feedback', value: '4.8', desc: 'Average rating' }
          ].map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">{stat.desc}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
