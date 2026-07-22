import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QrCode, Download, Eye, Smartphone, Loader2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BRAND } from '@/constants/brand'
import { tablesApi } from '@/api/tables.api'

export default function QROrderingPage() {
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.list(),
    refetchInterval: 15_000,
  })

  const [genUrl, setGenUrl] = useState(`${BRAND.urls.menu}/table/5`)
  const [genTable, setGenTable] = useState('Table 5')
  const [activeQrUrl, setActiveQrUrl] = useState<string | null>(null)
  
  const [previewTable, setPreviewTable] = useState<{ id: string, number: string, url: string } | null>(null)

  const handleGenerate = () => {
    setActiveQrUrl(genUrl)
  }

  const downloadQRCode = (canvasId: string, fileName: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (!canvas) return
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
    const downloadLink = document.createElement("a")
    downloadLink.href = pngUrl
    downloadLink.download = `${fileName}.png`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  const exportAll = () => {
    tables.forEach(table => {
      downloadQRCode(`qr-table-${table.id}`, `Table-${table.number}-QR`)
    })
  }

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader title="QR Ordering" description={`${BRAND.name} contactless table ordering`} actions={
          <Button onClick={exportAll}><Download className="h-4 w-4 mr-2" /> Export All QR</Button>
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
                <Input placeholder="e.g. Table 5" value={genTable} onChange={e => setGenTable(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Menu URL</Label>
                <Input value={genUrl} onChange={e => setGenUrl(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleGenerate}>
                <QrCode className="h-4 w-4 mr-2" /> Generate QR
              </Button>
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-brand-light/40 gap-4">
                <div className="rounded-xl bg-white flex flex-col items-center justify-center border-2 border-dashed border-border p-4 min-h-[196px] min-w-[196px]">
                  {activeQrUrl ? (
                    <QRCodeCanvas 
                      id="qr-generator-canvas"
                      value={activeQrUrl} 
                      size={160} 
                      level="H" 
                      includeMargin 
                      imageSettings={{ src: BRAND.logo, excavate: true, height: 40, width: 40 }} 
                    />
                  ) : (
                    <div className="text-center text-muted-foreground flex flex-col items-center">
                      <QrCode className="h-10 w-10 mb-2 opacity-20" />
                      <span className="text-xs">Click Generate to preview</span>
                    </div>
                  )}
                </div>
                {activeQrUrl && (
                  <Button variant="outline" size="sm" onClick={() => downloadQRCode('qr-generator-canvas', `${genTable}-QR`)}>
                    <Download className="h-3.5 w-3.5 mr-2" /> Download Image
                  </Button>
                )}
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
                {tables.map((table) => {
                  const tableUrl = `${BRAND.urls.menu}/table/${table.id}`
                  const canvasId = `qr-table-${table.id}`
                  return (
                    <div key={table.id} className="flex flex-col items-center p-4 rounded-2xl border bg-card hover:shadow-elevated transition-all">
                      <div className="rounded-xl bg-white flex items-center justify-center mb-3 p-2">
                         <QRCodeCanvas 
                          id={canvasId}
                          value={tableUrl} 
                          size={100} 
                          level="H" 
                          includeMargin={false} 
                        />
                      </div>
                      <p className="font-semibold">Table {table.number}</p>
                      <p className="text-xs text-muted-foreground capitalize">{table.floor} · {table.status}</p>
                      <div className="flex gap-1 mt-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewTable({ id: table.id, number: table.number, url: tableUrl })}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadQRCode(canvasId, `Table-${table.number}-QR`)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
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

        <Dialog open={!!previewTable} onOpenChange={(open) => !open && setPreviewTable(null)}>
          <DialogContent className="sm:max-w-md flex flex-col items-center">
            <DialogHeader>
              <DialogTitle>Table {previewTable?.number} QR Code</DialogTitle>
              <DialogDescription className="text-center">{previewTable?.url}</DialogDescription>
            </DialogHeader>
            <div className="my-6 p-4 bg-white rounded-xl">
              {previewTable && (
                <QRCodeCanvas 
                  id="preview-canvas"
                  value={previewTable.url} 
                  size={240} 
                  level="H" 
                  includeMargin 
                  imageSettings={{ src: BRAND.logo, excavate: true, height: 50, width: 50 }} 
                />
              )}
            </div>
            <Button className="w-full" onClick={() => downloadQRCode('preview-canvas', `Table-${previewTable?.number}-QR`)}>
              <Download className="mr-2 h-4 w-4" /> Download QR
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}
