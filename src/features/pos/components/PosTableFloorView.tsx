import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Merge, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { tablesApi } from '@/api/tables.api'
import { formatApiError } from '@/api/management-utils'
import { cn, formatCurrency } from '@/lib/utils'
import type { TableDto } from '@/api/types/pos.types'
import {
  floorsFromTables,
  TABLE_STATUS_LEGEND,
  TABLE_STATUS_STYLES,
  normalizeTableStatus,
  tableDisplayLabel,
} from '../lib/tableStatus'

interface PosTableFloorViewProps {
  tables: TableDto[]
  selectedTableId: string | null
  selectedFloor: string | null
  onFloorChange: (floor: string | null) => void
  onSelectTable: (table: TableDto) => void
  onStartOrder: (table: TableDto) => void
  onRefresh?: () => void
}

export function PosTableFloorView({
  tables,
  selectedTableId,
  selectedFloor,
  onFloorChange,
  onSelectTable,
  onStartOrder,
  onRefresh,
}: PosTableFloorViewProps) {
  const queryClient = useQueryClient()
  const [mergeOpen, setMergeOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [mergeSourceId, setMergeSourceId] = useState('')
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [transferSourceId, setTransferSourceId] = useState('')
  const [transferTargetId, setTransferTargetId] = useState('')
  const [activeTable, setActiveTable] = useState<TableDto | null>(null)

  const floorsWithTables = useMemo(() => {
    return floorsFromTables(tables).map((name) => ({
      name,
      tables: tables.filter((t) => t.floor === name),
    }))
  }, [tables])

  const mergeMutation = useMutation({
    mutationFn: () => tablesApi.merge(mergeSourceId, mergeTargetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success('Tables merged')
      setMergeOpen(false)
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  const transferMutation = useMutation({
    mutationFn: () => tablesApi.transfer(transferSourceId, transferTargetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success('Order transferred')
      setTransferOpen(false)
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tablesApi.updateStatus(id, status),
    onSuccess: (_table, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast.success(
        variables.status === 'AVAILABLE'
          ? 'Table cleared — now available for new guests'
          : 'Table updated',
      )
      setActiveTable(null)
    },
    onError: (error) => toast.error(formatApiError(error)),
  })

  const occupied = tables.filter((t) => t.currentOrder || normalizeTableStatus(t.status) === 'occupied')
  const available = tables.filter((t) => normalizeTableStatus(t.status) === 'available')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card px-3 py-2">
        <p className="text-sm font-bold">Table View</p>
        <div className="ml-auto flex flex-wrap gap-1">
          <Button type="button" size="sm" className="h-8 text-xs" onClick={() => {
            onFloorChange(null)
            toast.message('Switch to Delivery from order types on New Order')
          }}>
            Delivery
          </Button>
          <Button type="button" size="sm" className="h-8 text-xs" onClick={() => toast.message('Use Pick Up on New Order screen')}>
            Pick Up
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setMergeOpen(true)}>
            <Merge className="mr-1 h-3.5 w-3.5" /> Merge
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="mr-1 h-3.5 w-3.5" /> Transfer
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onRefresh}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b px-3 py-2 text-[10px]">
        <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => {
          const first = available[0]
          if (first) onStartOrder(first)
          else toast.error('No available table')
        }}>
          <Plus className="mr-1 h-3 w-3" /> Open first table
        </Button>
        {TABLE_STATUS_LEGEND.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-sm', item.className)} />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {floorsWithTables.map((section) => (
          <section key={section.name}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">{section.name}</h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {section.tables.map((table) => {
                const isOccupied = Boolean(table.currentOrder) || normalizeTableStatus(table.status) === 'occupied'
                const status = isOccupied ? 'occupied' : normalizeTableStatus(table.status)
                const selected = table.id === selectedTableId
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => {
                      onSelectTable(table)
                      onFloorChange(section.name)
                      setActiveTable(table)
                    }}
                    className={cn(
                      'flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed p-1 transition-all',
                      TABLE_STATUS_STYLES[status] || TABLE_STATUS_STYLES.available,
                      selected && 'ring-2 ring-primary ring-offset-1',
                    )}
                  >
                    <span className="text-base font-bold leading-none">{table.number}</span>
                    <span className="mt-1 text-[9px] uppercase opacity-80">{status.slice(0, 4)}</span>
                    {table.currentOrder && (
                      <span className="mt-0.5 max-w-full truncate text-[9px] font-medium">
                        {formatCurrency(table.currentOrder.total)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
        {!floorsWithTables.length && (
          <p className="py-12 text-center text-sm text-muted-foreground">No tables configured</p>
        )}
      </div>

      <Dialog open={Boolean(activeTable)} onOpenChange={(open) => { if (!open) setActiveTable(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{activeTable ? tableDisplayLabel(activeTable) : 'Table'}</DialogTitle>
          </DialogHeader>
          {activeTable && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Floor</span>
                <span>{activeTable.floor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="capitalize">{normalizeTableStatus(activeTable.status)}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Capacity</span>
                <span>{activeTable.capacity} guests</span>
              </div>
              {activeTable.currentOrder && (
                <div className="rounded-lg border bg-muted/30 p-2 text-xs">
                  <p className="font-semibold">{activeTable.currentOrder.orderNumber}</p>
                  <p>{activeTable.currentOrder.customerName || 'Guest'} · {formatCurrency(activeTable.currentOrder.total)}</p>
                  <p className="capitalize text-muted-foreground">{activeTable.currentOrder.status}</p>
                  <Button
                    type="button"
                    className="mt-2 w-full"
                    onClick={() => { onStartOrder(activeTable); setActiveTable(null) }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add items / KOT
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {normalizeTableStatus(activeTable.status) === 'available' && !activeTable.currentOrder && (
                  <Button type="button" onClick={() => { onStartOrder(activeTable); setActiveTable(null) }}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> New order
                  </Button>
                )}
                {normalizeTableStatus(activeTable.status) === 'occupied' && !activeTable.currentOrder && (
                  <Button type="button" onClick={() => { onStartOrder(activeTable); setActiveTable(null) }}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Open table
                  </Button>
                )}
                {normalizeTableStatus(activeTable.status) === 'cleaning' ? (
                  <Button
                    type="button"
                    className="col-span-2"
                    onClick={() => statusMutation.mutate({ id: activeTable.id, status: 'AVAILABLE' })}
                    disabled={statusMutation.isPending}
                  >
                    Clear table
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => statusMutation.mutate({ id: activeTable.id, status: 'AVAILABLE' })}>
                    Clear table
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => statusMutation.mutate({ id: activeTable.id, status: 'RESERVED' })}>
                  Reserve
                </Button>
                {normalizeTableStatus(activeTable.status) !== 'cleaning' && (
                  <Button type="button" variant="outline" onClick={() => statusMutation.mutate({ id: activeTable.id, status: 'CLEANING' })}>
                    Cleaning
                  </Button>
                )}
              </div>
              {normalizeTableStatus(activeTable.status) === 'cleaning' && (
                <p className="text-xs text-muted-foreground">
                  Order finished — clear this table after the guest leaves (usually 5–20 min).
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Merge tables</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Select value={mergeSourceId} onValueChange={setMergeSourceId}>
              <SelectTrigger><SelectValue placeholder="Source (occupied)" /></SelectTrigger>
              <SelectContent>{occupied.map((t) => <SelectItem key={t.id} value={t.id}>{tableDisplayLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger><SelectValue placeholder="Target" /></SelectTrigger>
              <SelectContent>{available.map((t) => <SelectItem key={t.id} value={t.id}>{tableDisplayLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" disabled={!mergeSourceId || !mergeTargetId || mergeMutation.isPending} onClick={() => mergeMutation.mutate()}>
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer order</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Select value={transferSourceId} onValueChange={setTransferSourceId}>
              <SelectTrigger><SelectValue placeholder="From table" /></SelectTrigger>
              <SelectContent>{occupied.map((t) => <SelectItem key={t.id} value={t.id}>{tableDisplayLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={transferTargetId} onValueChange={setTransferTargetId}>
              <SelectTrigger><SelectValue placeholder="To table" /></SelectTrigger>
              <SelectContent>{available.map((t) => <SelectItem key={t.id} value={t.id}>{tableDisplayLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" disabled={!transferSourceId || !transferTargetId || transferMutation.isPending} onClick={() => transferMutation.mutate()}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
