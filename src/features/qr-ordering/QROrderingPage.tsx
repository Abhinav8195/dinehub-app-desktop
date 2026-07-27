import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QrCode, Download, Eye, Smartphone, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BRAND } from '@/constants/brand'
import { tablesApi } from '@/api/tables.api'
import { qrApi } from '@/api/phase1.api'
import { toast } from 'sonner'

export default function QROrderingPage() {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')
  const [tableId, setTableId] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.list(),
    refetchInterval: 15_000,
  })
  const { data: codes = [] } = useQuery({ queryKey: ['qr'], queryFn: qrApi.list })
  const { data: stats } = useQuery({ queryKey: ['qr', 'stats'], queryFn: qrApi.stats })
  const createQr = useMutation({
    mutationFn: () => qrApi.create({ label, tableIds: tableId ? [tableId] : undefined }),
    onSuccess: (result) => { const first = (result as Array<{ qrDataUrl?: string }>)[0]; setPreview(first?.qrDataUrl ?? null); queryClient.invalidateQueries({ queryKey: ['qr'] }); setLabel(''); toast.success('QR code generated') },
    onError: (error: Error) => toast.error(error.message || 'Failed to generate QR code'),
  })
  const downloadQr = async (id: string) => {
    try {
      const qr = await qrApi.download(id) as { qrDataUrl?: string }
      if (!qr.qrDataUrl) return
      const link = document.createElement('a')
      link.href = qr.qrDataUrl
      link.download = `dinehub-qr-${id}.png`
      link.click()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to download QR') }
  }
  const previewQr = async (id: string) => {
    try { setPreview((await qrApi.download(id) as { qrDataUrl?: string }).qrDataUrl ?? null) } catch { toast.error('Failed to load QR preview') }
  }
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
                <Label>Label</Label>
                <Input placeholder="e.g. Patio menu" value={label} onChange={(event) => setLabel(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Table</Label>
                <Select value={tableId} onValueChange={setTableId}><SelectTrigger><SelectValue placeholder="Optional table" /></SelectTrigger><SelectContent>{(tables as Array<{ id: string; number?: number }>).map((table) => <SelectItem key={table.id} value={table.id}>Table {table.number ?? table.id}</SelectItem>)}</SelectContent></Select>
              </div>
              <Button className="w-full" onClick={() => createQr.mutate()} disabled={createQr.isPending}><QrCode className="h-4 w-4 mr-2" /> Generate QR</Button>
              <div className="flex items-center justify-center p-8 rounded-2xl bg-brand-light/40">
                <div className="h-40 w-40 rounded-xl bg-white flex flex-col items-center justify-center border-2 border-dashed border-border p-4">
                  {preview ? <img src={preview} alt="Generated QR code" className="h-full w-full object-contain" /> : <QrCode className="h-20 w-20 text-foreground" />}
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
                {(codes as Array<{ id: string; label?: string; table?: { number?: number; floor?: string; status?: string } }>).map((code) => (
                  <div key={code.id} className="flex flex-col items-center p-4 rounded-2xl border bg-card hover:shadow-elevated transition-all">
                    <div className="h-24 w-24 rounded-xl bg-muted flex items-center justify-center mb-3">
                      <QrCode className="h-16 w-16" />
                    </div>
                    <p className="font-semibold">{code.label || `Table ${code.table?.number ?? 'QR'}`}</p>
                    <p className="text-xs text-muted-foreground capitalize">{code.table?.floor ?? 'General'} · {code.table?.status ?? 'active'}</p>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => previewQr(code.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadQr(code.id)}><Download className="h-3.5 w-3.5" /></Button>
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
            { title: 'QR Codes', value: String((stats as { total?: number } | undefined)?.total ?? 0), desc: 'Generated codes' },
            { title: 'Scans', value: String((stats as { scans?: number } | undefined)?.scans ?? 0), desc: 'QR menu views' },
            { title: 'Orders', value: String((stats as { orders?: number } | undefined)?.orders ?? 0), desc: 'QR orders' }
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
