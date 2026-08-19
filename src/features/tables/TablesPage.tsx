import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, QrCode, Users, Merge, ArrowRightLeft, Loader2, RefreshCw, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { tablesApi } from '@/api/tables.api'
import { formatApiError } from '@/api/management-utils'
import type { CreateTableRequest, TableDto } from '@/api/types/pos.types'
import { BRAND } from '@/constants/brand'
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils'

const statusColors: Record<string, string> = {
  available: 'bg-success/10 border-success/30 text-success',
  occupied: 'bg-danger/10 border-danger/30 text-danger',
  reserved: 'bg-warning/10 border-warning/30 text-warning',
  cleaning: 'bg-info/10 border-info/30 text-info',
}

const STATUS_OPTIONS = ['available', 'occupied', 'reserved', 'cleaning'] as const

/** Common Indian multi-floor restaurant layout (Ambala-style). */
const STANDARD_FLOORS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Rooftop', 'Basement'] as const

type TableForm = {
  number: string
  floor: string
  capacity: string
  status: typeof STATUS_OPTIONS[number]
}

const defaultForm = (floor: string): TableForm => ({
  number: '',
  floor,
  capacity: '4',
  status: 'available',
})

export default function TablesPage() {
  const queryClient = useQueryClient()
  const [floor, setFloor] = useState('Ground Floor')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableDto | null>(null)
  const [form, setForm] = useState<TableForm>(() => defaultForm('Ground Floor'))
  const [mergeSourceId, setMergeSourceId] = useState('')
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [transferSourceId, setTransferSourceId] = useState('')
  const [transferTargetId, setTransferTargetId] = useState('')

  const { data: tables = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.list(),
    refetchInterval: 10_000,
  })

  const floors = useMemo(() => {
    const fromTables = tables.map((t) => t.floor).filter(Boolean)
    return [...new Set([...STANDARD_FLOORS, ...fromTables])]
  }, [tables])

  const floorTables = useMemo(
    () => tables.filter((t) => t.floor === floor),
    [tables, floor]
  )

  const statusCounts = useMemo(() => ({
    available: tables.filter((t) => t.status === 'available').length,
    occupied: tables.filter((t) => t.status === 'occupied').length,
    reserved: tables.filter((t) => t.status === 'reserved').length,
    cleaning: tables.filter((t) => t.status === 'cleaning').length,
  }), [tables])

  const occupiedTables = useMemo(() => tables.filter((t) => t.currentOrder || t.status === 'occupied'), [tables])
  const availableTargets = useMemo(() => tables.filter((t) => t.status === 'available' || !t.currentOrder), [tables])

  const createMutation = useMutation({
    mutationFn: () =>
      tablesApi.create({
        number: Number(form.number),
        floor: form.floor.trim(),
        capacity: Number(form.capacity),
        status: form.status.toUpperCase() as CreateTableRequest['status'],
      }),
    onSuccess: (table) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setFloor(table.floor)
      setDialogOpen(false)
      toast.success(`Table T${table.number} added to ${table.floor}`)
    },
    onError: (err) => toast.error(formatApiError(err, 'Could not add table')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tablesApi.updateStatus(id, status.toUpperCase()),
    onSuccess: (table) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setSelectedTable(table)
      toast.success(`Table T${table.number} is now ${table.status}`)
    },
    onError: (err) => toast.error(formatApiError(err, 'Could not update table status')),
  })
  const transferMutation = useMutation({
    mutationFn: ({ id, targetTableId }: { id: string; targetTableId: string }) => tablesApi.transfer(id, { targetTableId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setTransferOpen(false)
      toast.success('Order moved to the selected table')
    },
    onError: (err) => toast.error(formatApiError(err, 'Could not transfer table')),
  })
  const mergeMutation = useMutation({
    mutationFn: (body: { sourceTableIds: string[]; targetTableId: string }) => tablesApi.merge(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setMergeOpen(false)
      toast.success('Tables merged successfully')
    },
    onError: (err) => toast.error(formatApiError(err, 'Could not merge tables')),
  })

  const openAddDialog = () => {
    const nextNumber =
      tables.filter((t) => t.floor === floor).reduce((max, t) => Math.max(max, t.number), 0) + 1
    setForm({ number: String(nextNumber), floor, capacity: '4', status: 'available' })
    setDialogOpen(true)
  }

  const handleAddTable = () => {
    const number = Number(form.number)
    const capacity = Number(form.capacity)
    if (!form.floor.trim()) { toast.error('Please select a floor'); return }
    if (!Number.isInteger(number) || number < 1) { toast.error('Enter a valid table number'); return }
    if (!Number.isInteger(capacity) || capacity < 1) { toast.error('Capacity must be at least 1'); return }
    createMutation.mutate()
  }

  const openTableDetail = (table: TableDto) => {
    setSelectedTable(table)
    setDetailOpen(true)
  }

  const handleStatusChange = (status: string) => {
    if (!selectedTable) return
    statusMutation.mutate({ id: selectedTable.id, status })
  }

  const handleQrClick = (table: TableDto, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${BRAND.urls?.menu || 'https://menu.dinehub.app'}/table/${table.number}`
    navigator.clipboard?.writeText(url).catch(() => {})
    toast.success(`QR link copied for Table T${table.number}`)
  }

  const openMerge = () => {
    setMergeSourceId(selectedTable?.id || occupiedTables[0]?.id || '')
    setMergeTargetId('')
    setMergeOpen(true)
  }

  const openTransfer = () => {
    setTransferSourceId(selectedTable?.id || occupiedTables[0]?.id || '')
    setTransferTargetId('')
    setTransferOpen(true)
  }

  useEffect(() => {
    if (floors.length > 0 && !floors.includes(floor)) {
      setFloor(floors[0])
    }
  }, [floors, floor])

  const tableLabel = (table: TableDto) => `T${table.number} · ${table.floor}${table.currentOrder ? ` · ${table.currentOrder.orderNumber}` : ''}`

  return (
    <PageShell>
      <div className="page-container">
        <PageHeader
          title="Table Management"
          description="Multi-floor plan — Ground for kitchen area, upper floors for seating / hall"
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} /> Refresh
              </Button>
              <Button type="button" variant="outline" onClick={openMerge} disabled={mergeMutation.isPending || tables.length < 2}>
                <Merge className="h-4 w-4 mr-2" /> Merge
              </Button>
              <Button type="button" variant="outline" onClick={openTransfer} disabled={transferMutation.isPending || occupiedTables.length === 0}>
                <ArrowRightLeft className="h-4 w-4 mr-2" /> Transfer
              </Button>
              <Button type="button" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" /> Add Table
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['available', 'occupied', 'reserved', 'cleaning'] as const).map((status) => (
            <Card key={status}>
              <CardContent className="p-4 flex items-center justify-between">
                <span className="text-sm capitalize text-muted-foreground">{status}</span>
                <span className="text-2xl font-bold">{statusCounts[status]}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading tables...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <p>Could not load tables. Check your connection and try again.</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <>
            <Tabs value={floor} onValueChange={setFloor}>
              <TabsList className="flex h-auto flex-wrap">
                {floors.map((f) => (
                  <TabsTrigger key={f} value={f}>{f}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Floor Plan — {floor}</span>
                  {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[400px] p-4 rounded-2xl bg-muted/30">
                  {floorTables.map((table) => (
                    <motion.button
                      key={table.id}
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => openTableDetail(table)}
                      className={cn(
                        'relative flex flex-col items-center justify-center rounded-2xl border-2 p-6 transition-all cursor-pointer',
                        statusColors[table.status] || statusColors.available
                      )}
                    >
                      <span className="text-2xl font-bold">T{table.number}</span>
                      <div className="flex items-center gap-1 mt-2 text-xs">
                        <Users className="h-3 w-3" /> {table.capacity}
                      </div>
                      <Badge variant="outline" className="mt-2 text-[10px] capitalize">{table.status}</Badge>
                      {table.currentOrder && (
                        <div className="mt-2 text-[10px] text-center opacity-80">
                          <Receipt className="h-3 w-3 mx-auto mb-0.5" />
                          {table.currentOrder.orderNumber}
                        </div>
                      )}
                      <span
                        role="button"
                        tabIndex={0}
                        className="absolute top-2 right-2 p-1 rounded-lg hover:bg-black/10"
                        onClick={(e) => handleQrClick(table, e)}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </span>
                    </motion.button>
                  ))}

                  {floorTables.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <p className="text-sm">No tables on {floor} yet</p>
                      <Button type="button" variant="outline" className="mt-4" onClick={openAddDialog}>
                        <Plus className="h-4 w-4 mr-2" /> Add First Table
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Table</DialogTitle>
              <DialogDescription>Choose the floor where this table sits (Ground / 1st / 2nd / Hall).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Table Number</Label>
                <Input type="number" min={1} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Floor</Label>
                <Select value={form.floor} onValueChange={(value) => setForm({ ...form, floor: value })}>
                  <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
                  <SelectContent>
                    {floors.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-2"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="Or type a custom floor name"
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TableForm['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleAddTable} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Table'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge tables</DialogTitle>
              <DialogDescription>Move guests/orders from a source table onto a target table.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>From (source)</Label>
                <Select value={mergeSourceId} onValueChange={setMergeSourceId}>
                  <SelectTrigger><SelectValue placeholder="Select source table" /></SelectTrigger>
                  <SelectContent>
                    {tables.map((t) => <SelectItem key={t.id} value={t.id}>{tableLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To (target)</Label>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger><SelectValue placeholder="Select target table" /></SelectTrigger>
                  <SelectContent>
                    {tables.filter((t) => t.id !== mergeSourceId).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{tableLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMergeOpen(false)}>Cancel</Button>
              <Button
                disabled={!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId || mergeMutation.isPending}
                onClick={() => mergeMutation.mutate({ sourceTableIds: [mergeSourceId], targetTableId: mergeTargetId })}
              >
                {mergeMutation.isPending ? 'Merging…' : 'Merge tables'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer order</DialogTitle>
              <DialogDescription>Move the active order from one table to another (for example Ground → 1st Floor).</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>From table (with order)</Label>
                <Select value={transferSourceId} onValueChange={setTransferSourceId}>
                  <SelectTrigger><SelectValue placeholder="Select occupied table" /></SelectTrigger>
                  <SelectContent>
                    {occupiedTables.map((t) => <SelectItem key={t.id} value={t.id}>{tableLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To table</Label>
                <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                  <SelectTrigger><SelectValue placeholder="Select destination table" /></SelectTrigger>
                  <SelectContent>
                    {(availableTargets.length ? availableTargets : tables)
                      .filter((t) => t.id !== transferSourceId)
                      .map((t) => <SelectItem key={t.id} value={t.id}>{tableLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button
                disabled={!transferSourceId || !transferTargetId || transferSourceId === transferTargetId || transferMutation.isPending}
                onClick={() => transferMutation.mutate({ id: transferSourceId, targetTableId: transferTargetId })}
              >
                {transferMutation.isPending ? 'Transferring…' : 'Transfer order'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Table T{selectedTable?.number} — {selectedTable?.floor}</DialogTitle>
            </DialogHeader>
            {selectedTable && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize text-sm">{selectedTable.status}</Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {selectedTable.capacity} seats
                  </span>
                </div>

                {selectedTable.currentOrder ? (
                  <div className="rounded-xl border p-4 space-y-2 bg-muted/30">
                    <p className="text-sm font-semibold">Active Order</p>
                    <div className="flex justify-between text-sm">
                      <span>{selectedTable.currentOrder.orderNumber}</span>
                      <Badge variant="warning" className="capitalize">{selectedTable.currentOrder.status}</Badge>
                    </div>
                    <p className="text-sm">{selectedTable.currentOrder.customerName}</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedTable.currentOrder.total)}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(selectedTable.currentOrder.createdAt)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active order on this table</p>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setDetailOpen(false); openTransfer() }}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Transfer
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => { setDetailOpen(false); openMerge() }}>
                    <Merge className="h-3.5 w-3.5 mr-1" /> Merge
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Change Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant={selectedTable.status === s ? 'default' : 'outline'}
                        size="sm"
                        className="capitalize"
                        disabled={
                          statusMutation.isPending ||
                          (selectedTable.currentOrder != null && s !== 'occupied')
                        }
                        onClick={() => handleStatusChange(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                  {selectedTable.currentOrder && (
                    <p className="text-xs text-muted-foreground">
                      Mark the order Completed in Orders after payment to free this table and record sales.
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageShell>
  )
}
