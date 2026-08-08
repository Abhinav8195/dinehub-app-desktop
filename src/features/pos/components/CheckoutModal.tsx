import { useRef, useState } from 'react'
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
import type { PosOrder, TaxSettings, TableDto, OrderTotalsPreview } from '@/api/types/pos.types'
import { ApiError } from '@/api/types/common'
import type { OrderItem } from '@/types'

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: OrderItem[]
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  tables: TableDto[]
  selectedTableId: string | null
  taxSettings: TaxSettings
  onSuccess: (orderNumber: string, total: number, paymentMethod: string, serverOrder?: PosOrder) => void
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
  const [serverTotals, setServerTotals] = useState<OrderTotalsPreview | null>(null)
  const [validatingVoucher, setValidatingVoucher] = useState(false)
  const [tableId, setTableId] = useState(selectedTableId || '')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const breakdown = serverTotals ?? calculateTaxBreakdown(subtotal, taxSettings)

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase()
    if (!code) {
      toast.error('Enter a voucher code')
      return
    }
    setValidatingVoucher(true)
    try {
      const preview = await ordersApi.previewTotals(subtotal, code)
      if (preview.voucherDiscount <= 0) {
        setAppliedVoucher('')
        setServerTotals(null)
        toast.error('This voucher is not valid for the current order')
        return
      }
      setAppliedVoucher(code)
      setServerTotals(preview)
      toast.success(`Voucher ${code} applied`)
    } catch (error) {
      setAppliedVoucher('')
      setServerTotals(null)
      toast.error(error instanceof Error ? error.message : 'Unable to validate voucher')
    } finally {
      setValidatingVoucher(false)
    }
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
    if (submittingRef.current) return
    if (orderType === 'dine-in' && !tableId) {
      toast.error('Please select a table for dine-in')
      return
    }
    const normalizedPhone = phone.replace(/[\s()-]/g, '')
    if (normalizedPhone && !/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      toast.error('Enter a valid phone number or leave it blank')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    try {
      const payload = {
        type: orderType === 'dine-in' ? 'DINE_IN' : orderType === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY',
        items: cart.map((item) => ({
          ...(item.menuItemId ? {
            menuItemId: item.menuItemId,
            variantId: item.variantId,
            modifierOptionIds: item.modifiers?.map((modifier) => modifier.id) ?? [],
          } : item.comboId ? {
            comboId: item.comboId,
          } : {
            name: item.name,
            unitPrice: item.price,
          }),
          quantity: item.quantity,
          notes: item.notes,
        })),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        instructions: instructions.trim() || undefined,
        tableId: orderType === 'dine-in' ? tableId : undefined,
        voucherCode: appliedVoucher || undefined,
        paymentMethod,
      }
      if (!navigator.onLine) throw new Error('Order creation requires a connection. Your cart has been preserved.')
      const order = await ordersApi.create(payload)

      onSuccess(order.orderNumber, order.total, paymentMethod, order)
      onOpenChange(false)
      resetForm()
    } catch (err: unknown) {
      const message = err instanceof ApiError && err.errors
        ? `${err.message}: ${Array.isArray(err.errors) ? err.errors.join(', ') : Object.values(err.errors).flat().join(', ')}`
        : err instanceof Error ? err.message : 'Failed to place order'
      toast.error(message)
    } finally {
      submittingRef.current = false
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
    setServerTotals(null)
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
              <Label>First Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Walk-in customer" />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
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
                <Input value={voucherCode} onChange={(e) => {
                  setVoucherCode(e.target.value)
                  if (appliedVoucher) {
                    setAppliedVoucher('')
                    setServerTotals(null)
                  }
                }} placeholder="Enter voucher code" />
                <Button type="button" variant="destructive" disabled={validatingVoucher} onClick={handleApplyVoucher}>
                  {validatingVoucher ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
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
