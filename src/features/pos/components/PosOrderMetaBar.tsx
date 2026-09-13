import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PosOrderMeta } from '@/store/slices/posSlice'
import type { TableDto } from '@/api/types/pos.types'
import { isTableSelectableForNewOrder, normalizeTableStatus } from '../lib/tableStatus'

type OrderType = 'dine-in' | 'takeaway' | 'delivery'

interface PosOrderMetaBarProps {
  orderType: OrderType
  onOrderTypeChange: (type: OrderType) => void
  meta: PosOrderMeta
  onMetaChange: (patch: Partial<PosOrderMeta>) => void
  tables: TableDto[]
  selectedTableId: string | null
  onTableChange: (tableId: string | null) => void
  floors: string[]
  activeOrderNumber?: string | null
}

const ORDER_TYPES: Array<{ id: OrderType; label: string }> = [
  { id: 'dine-in', label: 'Dine In' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'takeaway', label: 'Pick Up' },
]

export function PosOrderMetaBar({
  orderType,
  onOrderTypeChange,
  meta,
  onMetaChange,
  tables,
  selectedTableId,
  onTableChange,
  floors,
  activeOrderNumber,
}: PosOrderMetaBarProps) {
  // Always keep the currently selected table in the list so Radix Select can change value.
  // Floor filter is soft — if it would hide every row, fall back to all tables.
  const tableOptions = useMemo(() => {
    const forFloor = meta.selectedFloor
      ? tables.filter((table) => table.floor === meta.selectedFloor || table.id === selectedTableId)
      : tables
    const list = (forFloor.length ? forFloor : tables)
      .filter((table) => isTableSelectableForNewOrder(table, selectedTableId))
    // Ensure selected id is present even if status is cleaning/stale
    if (selectedTableId && !list.some((t) => t.id === selectedTableId)) {
      const selected = tables.find((t) => t.id === selectedTableId)
      if (selected) list.unshift(selected)
    }
    return list
  }, [tables, meta.selectedFloor, selectedTableId])

  const tableLabel = (table: TableDto) => {
    const status = normalizeTableStatus(table.status)
    const occ = table.currentOrder || status === 'occupied'
    const parts = [
      `T-${table.number}`,
      table.floor,
      `${table.capacity}p`,
      occ ? (table.currentOrder?.orderNumber || 'OCC') : 'AVAI',
    ]
    return parts.filter(Boolean).join(' · ')
  }

  return (
    <div className="shrink-0 space-y-1.5 border-b bg-white px-2 py-1.5">
      <div className="flex flex-wrap gap-1">
        {ORDER_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onOrderTypeChange(type.id)}
            className={cn(
              'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
              orderType === type.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {orderType === 'dine-in' && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <Field label="Floor">
            <Select
              value={meta.selectedFloor || '__all__'}
              onValueChange={(value) => onMetaChange({ selectedFloor: value === '__all__' ? null : value })}
            >
              <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="All floors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All floors</SelectItem>
                {floors.map((floor) => <SelectItem key={floor} value={floor}>{floor}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Table">
            <Select
              value={selectedTableId || undefined}
              onValueChange={(value) => {
                if (!value || value === selectedTableId) return
                onTableChange(value)
              }}
            >
              <SelectTrigger className={cn('h-7 text-[11px]', !selectedTableId && 'border-primary')}>
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {tableOptions.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    {tableLabel(table)}
                  </SelectItem>
                ))}
                {!tableOptions.length && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No tables on this floor</div>
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Guests">
            <Input
              type="number"
              min={1}
              max={99}
              className="h-7 text-[11px]"
              value={meta.guestCount}
              onChange={(e) => onMetaChange({ guestCount: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <Field label="Customer">
            <Input
              className="h-7 text-[11px]"
              placeholder="Name"
              value={meta.customerName}
              onChange={(e) => onMetaChange({ customerName: e.target.value })}
            />
          </Field>
          <Field label="Waiter">
            <Input
              className="h-7 text-[11px]"
              placeholder="Server"
              value={meta.waiterName}
              onChange={(e) => onMetaChange({ waiterName: e.target.value })}
            />
          </Field>
          {activeOrderNumber && (
            <Field label="Running bill">
              <div className="flex h-7 items-center rounded-md border border-primary/30 bg-primary/10 px-2 text-[11px] font-semibold text-primary">
                {activeOrderNumber}
              </div>
            </Field>
          )}
        </div>
      )}

      {orderType === 'delivery' && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <Field label="Customer">
            <Input className="h-7 text-[11px]" value={meta.customerName} onChange={(e) => onMetaChange({ customerName: e.target.value })} placeholder="Name" />
          </Field>
          <Field label="Phone">
            <Input className="h-7 text-[11px]" value={meta.customerPhone} onChange={(e) => onMetaChange({ customerPhone: e.target.value })} placeholder="+91…" />
          </Field>
          <Field label="Address" className="col-span-2">
            <Input className="h-7 text-[11px]" value={meta.deliveryAddress} onChange={(e) => onMetaChange({ deliveryAddress: e.target.value })} placeholder="Delivery address" />
          </Field>
          <Field label="Instructions">
            <Input className="h-7 text-[11px]" value={meta.deliveryNotes} onChange={(e) => onMetaChange({ deliveryNotes: e.target.value })} placeholder="Gate / landmark" />
          </Field>
        </div>
      )}

      {orderType === 'takeaway' && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Field label="Customer">
            <Input className="h-7 text-[11px]" value={meta.customerName} onChange={(e) => onMetaChange({ customerName: e.target.value })} placeholder="Name" />
          </Field>
          <Field label="Phone">
            <Input className="h-7 text-[11px]" value={meta.customerPhone} onChange={(e) => onMetaChange({ customerPhone: e.target.value })} placeholder="Required at pay" />
          </Field>
          <Field label="Pickup time">
            <Input className="h-7 text-[11px]" value={meta.pickupTime} onChange={(e) => onMetaChange({ pickupTime: e.target.value })} placeholder="e.g. 7:30 PM" />
          </Field>
          <Field label="Status">
            <div className="flex h-7 items-center rounded-md border bg-muted/40 px-2 text-xs text-muted-foreground">Open draft</div>
          </Field>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
