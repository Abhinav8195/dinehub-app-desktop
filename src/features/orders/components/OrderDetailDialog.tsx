import { AlertTriangle, Check, Circle, MapPin, ReceiptText, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PosOrder } from '@/api/types/pos.types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PermissionGuard } from '@/guards/PermissionGuard'
import { labelize, normalize, validTransitions } from '../order-utils'
import { OrderStatusBadge } from './OrderStatusBadge'

interface Props {
  order: PosOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange?: (id: string, status: string) => void
  statusUpdating?: boolean
}

export function OrderDetailDialog({ order, open, onOpenChange, onStatusChange, statusUpdating }: Props) {
  if (!order) return null
  const transitions = validTransitions(order.status)
  const requestTransition = (next: string) => {
    if (!onStatusChange || !transitions.includes(next)) return
    if (['cancelled', 'refunded'].includes(next) && !window.confirm(`${labelize(next)} order ${order.orderNumber}? This action affects fulfillment or payment records.`)) return
    if (next === 'completed') {
      const unpaid = normalize(order.paymentStatus || '') !== 'paid' && !order.paymentMethod
      const tableNote = order.table
        ? `This will free table ${order.table.label || order.table.number} and record the sale.`
        : 'This will mark the order complete and record the sale.'
      const paymentNote = unpaid
        ? '\n\nPayment still looks pending. Complete only after you have collected payment.'
        : '\n\n(Mark complete on receiving payment.)'
      if (!window.confirm(`Mark order ${order.orderNumber} completed?\n\n${tableNote}${paymentNote}`)) return
    }
    onStatusChange(order.id, next)
  }
  const history = order.statusHistory?.length ? order.statusHistory : [{ status: order.status, createdAt: order.updatedAt || order.createdAt }]
  const discount = Number(order.discount || 0) + Number(order.voucherDiscount || 0)

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
      <DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-3 pr-8"><div><DialogTitle>Order {order.orderNumber}</DialogTitle><DialogDescription className="mt-1">Placed {formatDateTime(order.createdAt)}</DialogDescription></div><OrderStatusBadge status={order.status} /></div>
      </DialogHeader>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <section className="rounded-xl border p-4" aria-labelledby="customer-heading"><h3 id="customer-heading" className="mb-3 flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4" /> Customer & fulfillment</h3><div className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Customer" value={order.customer?.name || 'Walk-in customer'} />
            <Info label="Phone" value={order.customer?.phone || 'Not provided'} />
            <Info label="Email" value={order.customer?.email || 'Not provided'} />
            <Info label="Order type" value={labelize(order.type)} />
            {normalize(order.type) === 'dine-in' && <Info label="Table" value={order.table ? `${order.table.label}${order.table.floor ? ` · ${order.table.floor}` : ''}` : 'Not assigned'} />}
            {normalize(order.type) === 'delivery' && <Info label="Delivery address" value={order.deliveryAddress || 'Not provided'} />}
            {order.branch?.name && <Info label="Branch" value={order.branch.name} />}
          </div>{order.instructions && <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm"><p className="font-medium">Order notes</p><p className="mt-1 text-muted-foreground">{order.instructions}</p></div>}</section>

          <section aria-labelledby="items-heading"><h3 id="items-heading" className="mb-3 flex items-center gap-2 font-semibold"><ReceiptText className="h-4 w-4" /> Ordered items</h3><div className="space-y-3">{order.items.map((item) => <div key={item.id} className="flex gap-3 rounded-xl border p-3">
            {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">No image</div>}
            <div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><div><p className="font-medium">{item.quantity}× {item.name}</p>{item.variantName && <p className="text-xs text-muted-foreground">Size / variant: {item.variantName}</p>}</div><p className="font-semibold">{formatCurrency(item.total)}</p></div>
              <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
              {item.modifiers?.map((modifier) => <p key={modifier.id} className="text-xs text-muted-foreground">{modifier.groupName}: {modifier.name}{modifier.price ? ` (+${formatCurrency(modifier.price)})` : ''}</p>)}
              {item.notes && <p className="mt-2 rounded bg-warning/10 px-2 py-1 text-xs"><span className="font-medium">Note:</span> {item.notes}</p>}
              {item.comboId && <Badge variant="secondary" className="mt-2">Combo item</Badge>}
            </div>
          </div>)}</div></section>

          <section className="rounded-xl border p-4" aria-labelledby="timeline-heading"><h3 id="timeline-heading" className="mb-4 font-semibold">Order-status timeline</h3><ol className="space-y-3">{history.map((event, index) => <li key={`${event.status}-${event.createdAt}-${index}`} className="flex gap-3"><div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">{index === history.length - 1 ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}</div><div><p className="text-sm font-medium">{labelize(event.status)}</p><p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}{event.note ? ` · ${event.note}` : ''}</p></div></li>)}</ol></section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border p-4"><h3 className="mb-3 font-semibold">Payment summary</h3><div className="mb-3 flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span><OrderStatusBadge status={order.paymentStatus || (order.paymentMethod ? 'paid' : 'pending')} kind="payment" /></div><Info label="Method" value={labelize(order.paymentMethod)} />{order.transactionId && <div className="mt-2"><Info label="Transaction ID" value={order.transactionId} /></div>}{Number(order.refundAmount) > 0 && <div className="mt-2"><Info label="Refunded" value={formatCurrency(Number(order.refundAmount))} /></div>}<Separator className="my-4" /><div className="space-y-2 text-sm">
            <Money label="Subtotal" value={order.subtotal} /><Money label="Tax" value={order.tax || order.gstAmount + order.sgstAmount + order.cgstAmount} />{discount > 0 && <Money label="Discount" value={-discount} />}{order.serviceCharge > 0 && <Money label="Extra charges" value={order.serviceCharge} />}<Separator /><div className="flex justify-between text-base font-bold"><span>Grand total</span><span>{formatCurrency(order.total)}</span></div>
          </div></section>

          <PermissionGuard permission="orders.update">
            <section className="rounded-xl border p-4">
              <h3 className="font-semibold">Update status</h3>
              {transitions.length ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">Only valid next steps are enabled.</p>
                  <div className="mt-3 grid gap-2">
                    {transitions.map((status) => (
                      <Button
                        key={status}
                        variant={status === 'cancelled' || status === 'refunded' ? 'destructive' : status === 'completed' ? 'default' : 'outline'}
                        disabled={statusUpdating}
                        onClick={() => requestTransition(status)}
                      >
                        {(status === 'cancelled' || status === 'refunded') && <AlertTriangle className="mr-2 h-4 w-4" />}
                        {status === 'completed' ? 'Mark completed (on payment)' : labelize(status)}
                      </Button>
                    ))}
                  </div>
                  {transitions.includes('completed') && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Mark completed after payment — frees the table and records sales.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No further status changes are available.</p>
              )}
            </section>
          </PermissionGuard>
          {(order.deliveryAddress || order.table) && <div className="flex gap-2 rounded-xl bg-muted/60 p-3 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{order.deliveryAddress || order.table?.label}</span></div>}
        </aside>
      </div>
    </DialogContent>
  </Dialog>
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="break-words font-medium">{value}</p></div> }
function Money({ label, value }: { label: string; value: number }) { return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value < 0 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value)}</span></div> }
