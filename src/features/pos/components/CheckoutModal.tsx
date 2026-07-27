import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { calculateTaxBreakdown } from '@/lib/tax'
import { customersApi } from '@/api/customers.api'
import { ordersApi } from '@/api/orders.api'
import { enqueueSync } from '@/lib/offline'
import type { TaxSettings, TableDto } from '@/api/types/pos.types'
import type { OrderItem } from '@/types'

const VOUCHERS: Record<string, number> = {
  WELCOME10: 10,
  SAVE50: 50,
  FLAT100: 100,
}

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: OrderItem[]
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  tables: TableDto[]
  selectedTableId: string | null
  taxSettings: TaxSettings
  onSuccess: (orderNumber: string, total: number, paymentMethod: string) => void
}

export function CheckoutModal({
  open,
  onOpenChange,
  cart,
  orderType,
  tables,
  selectedTableId,
  taxSettings,
  onSuccess,
}: CheckoutModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [instructions, setInstructions] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState('')
  const [tableId, setTableId] = useState(selectedTableId || '')
  const [submitting, setSubmitting] = useState(false)

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const voucherDiscount = appliedVoucher ? (VOUCHERS[appliedVoucher] || 0) : 0
  const breakdown = calculateTaxBreakdown(subtotal, taxSettings, voucherDiscount)

  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase()
    if (!code) {
      toast.error('Enter a voucher code')
      return
    }
    if (!VOUCHERS[code]) {
      toast.error('Invalid voucher code')
      return
    }
    setAppliedVoucher(code)
    toast.success(`Voucher ${code} applied`)
  }

  const handlePhoneLookup = async () => {
    if (!phone.trim()) return
    try {
      const customer = await customersApi.findByPhone(phone.trim())
      if (customer) {
        setFirstName(customer.firstName)
        setLastName(customer.lastName)
        setEmail(customer.email || '')
        toast.success(`Welcome back, ${customer.firstName}!`)
      }
    } catch {
      // new customer
    }
  }

  const handleSubmit = async (paymentMethod: 'CASH' | 'CARD') => {
    if (orderType === 'dine-in' && !tableId) {
      toast.error('Please select a table for dine-in')
      return
    }
    if (orderType === 'takeaway' && !phone.trim()) {
      toast.error('Phone is required for takeaway')
      return
    }
    if (!firstName.trim()) {
      toast.error('First name is required')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        type: orderType === 'dine-in' ? 'DINE_IN' : orderType === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY',
        items: cart.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        instructions: instructions.trim() || undefined,
        tableId: orderType === 'dine-in' ? tableId : undefined,
        voucherCode: appliedVoucher || undefined,
        paymentMethod,
      }
      if (!navigator.onLine) {
        await enqueueSync({
          method: 'POST',
          url: '/orders',
          resource: 'orders',
          operation: 'create',
          body: payload,
        })
        onSuccess(`OFFLINE-${Date.now()}`, breakdown.total, paymentMethod)
        toast.success('Order queued for sync when connection returns')
        onOpenChange(false)
        resetForm()
        return
      }
      const order = await ordersApi.create(payload)

      onSuccess(order.orderNumber, order.total, paymentMethod)
      onOpenChange(false)
      resetForm()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to place order'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setInstructions('')
    setVoucherCode('')
    setAppliedVoucher('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Order Details</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            </div>
            <div className="space-y-2">
              <Label>Phone {orderType === 'takeaway' ? '*' : ''}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handlePhoneLookup}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            {orderType === 'dine-in' && (
              <div className="space-y-2">
                <Label>Table *</Label>
                <Select value={tableId} onValueChange={setTableId}>
                  <SelectTrigger><SelectValue placeholder="Select table" /></SelectTrigger>
                  <SelectContent>
                    {tables.filter((t) => t.status === 'available' || t.id === tableId).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        Table {t.number} — {t.floor} ({t.capacity} seats) {t.status !== 'available' ? `(${t.status})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Instruction</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Special requests..." rows={3} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Voucher Code</Label>
              <div className="flex gap-2">
                <Input value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} placeholder="WELCOME10, SAVE50, FLAT100" />
                <Button type="button" variant="destructive" onClick={handleApplyVoucher}>Apply</Button>
              </div>
            </div>

            <div className="rounded-xl border p-4 space-y-2 bg-muted/30">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(breakdown.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span>GST ({taxSettings.gstPercent}%)</span><span>{formatCurrency(breakdown.gstAmount)}</span></div>
              <div className="flex justify-between text-sm"><span>SGST ({taxSettings.sgstPercent}%)</span><span>{formatCurrency(breakdown.sgstAmount)}</span></div>
              <div className="flex justify-between text-sm"><span>CGST ({taxSettings.cgstPercent}%)</span><span>{formatCurrency(breakdown.cgstAmount)}</span></div>
              {breakdown.serviceCharge > 0 && (
                <div className="flex justify-between text-sm"><span>Service Charge</span><span>{formatCurrency(breakdown.serviceCharge)}</span></div>
              )}
              {breakdown.voucherDiscount > 0 && (
                <div className="flex justify-between text-sm text-success"><span>Voucher Discount</span><span>-{formatCurrency(breakdown.voucherDiscount)}</span></div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total Amount</span><span className="text-primary">{formatCurrency(breakdown.total)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" size="lg" variant="outline" disabled={submitting} onClick={() => handleSubmit('CASH')}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cash'}
              </Button>
              <Button type="button" size="lg" disabled={submitting} onClick={() => handleSubmit('CARD')}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Order Now'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
