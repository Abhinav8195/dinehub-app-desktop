import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PosOrder } from '@/api/types/pos.types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const statusVariant = (s: string) => {
  const map: Record<string, 'success' | 'warning' | 'info' | 'destructive' | 'secondary'> = {
    completed: 'success', preparing: 'warning', ready: 'info', pending: 'secondary', cancelled: 'destructive'
  }
  return map[s] || 'secondary'
}

interface OrderDetailDialogProps {
  order: PosOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Order {order.orderNumber}</DialogTitle>
            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customer?.name || 'Walk-in'}</p>
              {order.customer?.phone && <p className="text-xs text-muted-foreground">{order.customer.phone}</p>}
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{order.type.replace('-', ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Table</p>
              <p className="font-medium">{order.table?.label || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment</p>
              <p className="font-medium capitalize">{order.paymentMethod?.replace('-', ' ') || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Placed at</p>
              <p className="font-medium">{formatDateTime(order.createdAt)}</p>
            </div>
            {order.instructions && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Instructions</p>
                <p className="font-medium">{order.instructions}</p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <p className="text-sm font-semibold mb-2">Items</p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-sm">
                  <div><span>{item.name} × {item.quantity}</span>{item.comboId && <Badge className="ml-2" variant="secondary">Combo</Badge>}
                    {item.modifiers?.map((modifier) => <p key={modifier.id} className="text-xs text-muted-foreground">{modifier.groupName}: {modifier.name} {modifier.price ? `(+${formatCurrency(modifier.price)})` : ''}</p>)}
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(order.gstAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatCurrency(order.sgstAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatCurrency(order.cgstAmount)}</span></div>
            {order.voucherDiscount > 0 && (
              <div className="flex justify-between text-success"><span>Voucher ({order.voucherCode})</span><span>-{formatCurrency(order.voucherDiscount)}</span></div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{formatCurrency(order.total)}</span></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
