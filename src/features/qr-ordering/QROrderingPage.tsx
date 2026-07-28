import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeCanvas } from 'qrcode.react'
import {
  BellRing,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { tablesApi } from '@/api/tables.api'
import {
  qrOrderingApi,
  waiterRequestsApi,
  type QrCodeRecord,
  type WaiterRequest,
} from '@/api/qr-ordering.api'

const waiterLabels: Record<WaiterRequest['type'], string> = {
  WAITER: 'Call waiter',
  WATER: 'Water',
  BILL: 'Bill requested',
  CLEAN_TABLE: 'Clean table',
  ASSISTANCE: 'Assistance',
  OTHER: 'Other request',
}

export default function QROrderingPage() {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')
  const [tableId, setTableId] = useState('')
  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null)

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.list(),
  })
  const { data: codes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: qrOrderingApi.list,
  })
  const { data: waiterResult, isLoading: waiterLoading } = useQuery({
    queryKey: ['waiter-requests'],
    queryFn: () => waiterRequestsApi.list(),
    refetchInterval: 15_000,
  })
  const waiterRequests = waiterResult?.data ?? []

  const refreshQr = () => queryClient.invalidateQueries({ queryKey: ['qr-codes'] })
  const refreshWaiters = () => queryClient.invalidateQueries({ queryKey: ['waiter-requests'] })

  const createQr = useMutation({
    mutationFn: () => qrOrderingApi.create({ tableId, label: label.trim() || undefined }),
    onSuccess: async (record) => {
      setLabel('')
      setTableId('')
      await refreshQr()
      toast.success('Secure QR code generated')
      await showPreview(record)
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to generate QR code'),
  })
  const updateQr = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      qrOrderingApi.update(id, { isActive }),
    onSuccess: () => {
      refreshQr()
      toast.success('QR status updated')
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to update QR code'),
  })
  const regenerateQr = useMutation({
    mutationFn: qrOrderingApi.regenerate,
    onSuccess: async (record) => {
      await refreshQr()
      toast.success('QR token regenerated; the old QR is now invalid')
      await showPreview(record)
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to regenerate QR code'),
  })
  const deleteQr = useMutation({
    mutationFn: qrOrderingApi.remove,
    onSuccess: () => {
      refreshQr()
      toast.success('QR code deleted')
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to delete QR code'),
  })
  const waiterAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'acknowledge' | 'complete' | 'cancel' }) =>
      waiterRequestsApi[action](id),
    onSuccess: () => {
      refreshWaiters()
      toast.success('Waiter request updated')
    },
    onError: (error: Error) => toast.error(error.message || 'Unable to update waiter request'),
  })

  const stats = useMemo(() => ({
    total: codes.length,
    active: codes.filter((code) => code.isActive).length,
    scans: codes.reduce((total, code) => total + code.scanCount, 0),
    orders: codes.reduce((total, code) => total + code.orderCount, 0),
    pending: waiterRequests.filter((request) => request.status === 'PENDING').length,
  }), [codes, waiterRequests])

  function showPreview(record: QrCodeRecord) {
    setPreview({
      title: record.label || `Table ${record.table?.number ?? ''}`,
      url: record.publicUrl,
    })
  }

  function downloadQr(record: QrCodeRecord) {
    try {
      const canvas = document.getElementById(`qr-download-${record.id}`)
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Unable to create QR image')
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `dinehub-table-${record.table?.number ?? record.id}.png`
      link.click()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download QR')
    }
  }

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="QR Ordering"
          description="Secure customer ordering and real-time table assistance"
          actions={<Badge variant="success">{stats.active} active QR codes</Badge>}
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            ['QR codes', stats.total],
            ['Active', stats.active],
            ['Scans', stats.scans],
            ['Orders', stats.orders],
            ['Pending calls', stats.pending],
          ].map(([title, value]) => (
            <Card key={title}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="codes">
          <TabsList>
            <TabsTrigger value="codes">QR codes</TabsTrigger>
            <TabsTrigger value="waiter">
              Waiter calls
              {stats.pending > 0 && <Badge className="ml-2">{stats.pending}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="codes" className="mt-4 space-y-5">
            <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Generate QR code</CardTitle>
                  <CardDescription>The backend creates a secure, revocable table token.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Table</Label>
                    <Select value={tableId} onValueChange={setTableId}>
                      <SelectTrigger><SelectValue placeholder="Select a table" /></SelectTrigger>
                      <SelectContent>
                        {tables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            Table {table.number} · {table.floor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Patio table 4" />
                  </div>
                  <Button className="w-full" disabled={!tableId || createQr.isPending} onClick={() => createQr.mutate()}>
                    {createQr.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                    Generate secure QR
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Issued QR codes</CardTitle>
                  <CardDescription>Regenerating immediately invalidates the previous customer link.</CardDescription>
                </CardHeader>
                <CardContent>
                  {codesLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                  ) : !codes.length ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">No QR codes generated yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {codes.map((record) => (
                        <div key={record.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
                          <QRCodeCanvas
                            id={`qr-download-${record.id}`}
                            value={record.publicUrl}
                            size={1024}
                            level="H"
                            marginSize={4}
                            className="hidden"
                          />
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                            <QrCode className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{record.label || `Table ${record.table?.number ?? 'QR'}`}</p>
                              <Badge variant={record.isActive ? 'success' : 'secondary'}>{record.isActive ? 'Active' : 'Inactive'}</Badge>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {record.table ? `${record.table.floor} · Table ${record.table.number}` : 'No table'} · {record.scanCount} scans · {record.orderCount} orders
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => showPreview(record)} title="Preview"><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => downloadQr(record)} title="Download"><Download className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => regenerateQr.mutate(record.id)} title="Regenerate"><RefreshCw className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => updateQr.mutate({ id: record.id, isActive: !record.isActive })}>
                              {record.isActive ? 'Disable' : 'Enable'}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteQr.mutate(record.id)} title="Delete"><Trash2 className="h-4 w-4 text-danger" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="waiter" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-5 w-5" /> Live waiter calls</CardTitle>
                <CardDescription>Requests are persisted by the backend and refreshed after reconnecting.</CardDescription>
              </CardHeader>
              <CardContent>
                {waiterLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : !waiterRequests.length ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No waiter requests.</p>
                ) : (
                  <div className="space-y-3">
                    {waiterRequests.map((request) => {
                      const table = tables.find((item) => item.id === request.tableId)
                      return (
                        <div key={request.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10">
                            <BellRing className="h-5 w-5 text-warning" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{waiterLabels[request.type]}</p>
                              <Badge variant={request.status === 'PENDING' ? 'destructive' : request.status === 'ACKNOWLEDGED' ? 'secondary' : 'success'}>
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-sm">Table {table?.number ?? request.tableId}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.message || 'No message'} · {new Date(request.requestedAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {request.status === 'PENDING' && (
                              <Button size="sm" onClick={() => waiterAction.mutate({ id: request.id, action: 'acknowledge' })}>
                                Acknowledge
                              </Button>
                            )}
                            {request.status === 'ACKNOWLEDGED' && (
                              <Button size="sm" onClick={() => waiterAction.mutate({ id: request.id, action: 'complete' })}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
                              </Button>
                            )}
                            {(request.status === 'PENDING' || request.status === 'ACKNOWLEDGED') && (
                              <Button variant="outline" size="sm" onClick={() => waiterAction.mutate({ id: request.id, action: 'cancel' })}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{preview?.title}</DialogTitle>
              <DialogDescription className="break-all">{preview?.url}</DialogDescription>
            </DialogHeader>
            {preview && (
              <>
                <QRCodeCanvas
                  value={preview.url}
                  size={288}
                  level="H"
                  marginSize={4}
                  title="Table QR code"
                  className="mx-auto rounded-xl bg-white p-3"
                />
                <Button
                  className="w-full"
                  onClick={() => window.electronAPI.openExternal(preview.url)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open customer ordering page
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}
