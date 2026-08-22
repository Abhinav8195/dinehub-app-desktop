import { useEffect, useRef, useState } from 'react'
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
import { formatCurrency, cn } from '@/lib/utils'
import { calculateTaxBreakdown } from '@/lib/tax'
import { customersApi } from '@/api/customers.api'
import { ordersApi } from '@/api/orders.api'
import { checkOnline } from '@/api/client'
import type { PosOrder, TaxSettings, TableDto, OrderTotalsPreview } from '@/api/types/pos.types'
import { ApiError } from '@/api/types/common'
import type { OrderItem } from '@/types'
import { enqueueSync, isNetworkFailure } from '@/lib/offline'

type PayMethod = 'CASH' | 'CARD' | 'UPI' | 'SPLIT' | 'DUE' | 'OTHER'

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: OrderItem[]
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  tables: TableDto[]
  selectedTableId: string | null
  taxSettings: TaxSettings
  manualDiscount?: number
  initialPayMethod?: PayMethod
  feedbackSms?: boolean
  loyalty?: boolean
  customerSeed?: {
    firstName?: string
    lastName?: string
    phone?: string
    instructions?: string
  }
  onSuccess: (orderNumber: string, total: number, paymentMethod: string, serverOrder?: PosOrder) => void
}

function buildLocalOfflineOrder(params: {
  payload: { type: string; instructions?: string; tableId?: string }
  cart: OrderItem[]
  breakdown: ReturnType<typeof calculateTaxBreakdown>
  paymentMethod: string
  tables: TableDto[]
  selectedTableId: string | null
  firstName: string
  lastName: string
  phone: string
  email: string
}): PosOrder {
  const id = crypto.randomUUID()
  const orderNumber = `OFF-${Date.now().toString().slice(-6)}`
  const now = new Date().toISOString()
  const table = params.tables.find((row) => row.id === params.selectedTableId)
  const name = [params.firstName, params.lastName].filter(Boolean).join(' ').trim()
  return {
    id,
    orderNumber,
    type: params.payload.type,
    status: 'confirmed',
    subtotal: params.breakdown.subtotal,
    gstAmount: params.breakdown.gstAmount,
    sgstAmount: params.breakdown.sgstAmount,
    cgstAmount: params.breakdown.cgstAmount,
    serviceCharge: params.breakdown.serviceCharge,
    discount: params.breakdown.voucherDiscount,
    voucherDiscount: params.breakdown.voucherDiscount,
    total: params.breakdown.total,
    tax: params.breakdown.gstAmount + params.breakdown.sgstAmount + params.breakdown.cgstAmount,
    instructions: params.payload.instructions || null,
    paymentMethod: params.paymentMethod,
    paymentStatus: 'paid',
    tableId: params.selectedTableId,
    table: table
      ? { id: table.id, label: `T-${table.number}`, number: table.number, floor: table.floor }
      : null,
    customer: name || params.phone
      ? {
          id: `local-${id}`,
          name: name || 'Walk-in customer',
          phone: params.phone || '',
          email: params.email || null,
        }
      : null,
    items: params.cart.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      variantId: item.variantId,
      variantName: item.variantName,
      comboId: item.comboId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      notes: item.notes,
      modifiers: (item.modifiers ?? []).map((modifier) => ({
        id: modifier.id,
        groupId: modifier.groupId ?? '',
        groupName: modifier.groupName ?? '',
        name: modifier.name,
        price: modifier.price,
      })),
    })),
    createdAt: now,
    updatedAt: now,
  }
}

export function CheckoutModal({
  open,
  onOpenChange,
  cart,
  orderType,
  tables,
  selectedTableId,
  taxSettings,
  manualDiscount = 0,
  initialPayMethod = 'CASH',
  feedbackSms = false,
  loyalty = false,
  customerSeed,
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
  const [submitting, setSubmitting] = useState(false)
  const [payMethod, setPayMethod] = useState<PayMethod>(initialPayMethod)
  const [splitCash, setSplitCash] = useState('')
  const [splitUpi, setSplitUpi] = useState('')
  const [splitCard, setSplitCard] = useState('')
  const [cashTendered, setCashTendered] = useState('')
  const submittingRef = useRef(false)

  useEffect(() => {
    if (!open) return
    if (initialPayMethod === 'OTHER') setPayMethod('UPI')
    else if (initialPayMethod === 'PART' || initialPayMethod === 'SPLIT') setPayMethod('SPLIT')
    else setPayMethod(initialPayMethod)
  }, [open, initialPayMethod])

  useEffect(() => {
    if (!open || !customerSeed) return
    if (customerSeed.firstName) setFirstName(customerSeed.firstName)
    if (customerSeed.lastName) setLastName(customerSeed.lastName)
    if (customerSeed.phone) setPhone(customerSeed.phone)
    if (customerSeed.instructions) setInstructions(customerSeed.instructions)
  }, [open, customerSeed])

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const baseBreakdown = serverTotals ?? calculateTaxBreakdown(cartSubtotal, taxSettings)
  const voucherDiscount = baseBreakdown.voucherDiscount ?? 0
  const totalBeforeManual = Math.max(0, baseBreakdown.total - (serverTotals ? 0 : 0))
  // Manual discount is client-side until backend supports it; apply on top of preview total.
  const total = Math.max(0, totalBeforeManual - manualDiscount)
  const selectedTable = tables.find((table) => table.id === selectedTableId)

  const splitParts = {
    cash: Number(splitCash) || 0,
    upi: Number(splitUpi) || 0,
    card: Number(splitCard) || 0,
  }
  const splitPaid = splitParts.cash + splitParts.upi + splitParts.card
  const splitRemaining = Math.round((total - splitPaid) * 100) / 100
  const tendered = Number(cashTendered) || 0
  const change = payMethod === 'CASH' && tendered > total ? tendered - total : 0

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase()
    if (!code) {
      toast.error('Enter a voucher code')
      return
    }
    setValidatingVoucher(true)
    try {
      const preview = await ordersApi.previewTotals(cartSubtotal, code)
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

  const resolvePaymentMethod = (): PayMethod | 'omit' | null => {
    if (payMethod === 'DUE') return 'omit'
    if (payMethod !== 'SPLIT') return payMethod
    if (Math.abs(splitRemaining) > 0.05) {
      toast.error(`Split must equal total. Remaining ${formatCurrency(splitRemaining)}`)
      return null
    }
    return 'SPLIT'
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    if (orderType === 'dine-in' && !selectedTableId) {
      toast.error('Please select a table before checkout')
      return
    }
    if ((orderType === 'takeaway' || orderType === 'delivery') && !phone.trim()) {
      toast.error('Phone number is required for pick up / delivery')
      return
    }
    const resolved = resolvePaymentMethod()
    if (!resolved) return

    const normalizedPhone = phone.replace(/[\s()-]/g, '')
    if (normalizedPhone && !/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      toast.error('Enter a valid phone number or leave it blank')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    try {
      const online = navigator.onLine && await checkOnline().catch(() => false)
      if (online) {
        try {
          const stock = await ordersApi.previewStock(
            cart
              .filter((item) => item.menuItemId)
              .map((item) => ({
                menuItemId: item.menuItemId,
                variantId: item.variantId,
                quantity: item.quantity,
              })),
          )
          if (stock && !stock.ok && stock.shortages?.length) {
            const detail = stock.shortages
              .slice(0, 3)
              .map((s) => `${s.name} (need ${s.required} ${s.unit}, have ${s.available})`)
              .join('; ')
            const proceed = window.confirm(
              `Low / short stock for this cart:\n${detail}\n\nPlace order anyway?`,
            )
            if (!proceed) return
          }
        } catch {
          // best-effort
        }
      }

      const splitNote = resolved === 'SPLIT'
        ? `Split: Cash ${splitParts.cash} · UPI ${splitParts.upi} · Card ${splitParts.card}`
        : ''
      const dueNote = resolved === 'omit' ? 'Payment: DUE' : ''
      const extraNotes = [
        instructions.trim(),
        splitNote,
        dueNote,
        manualDiscount > 0 ? `Manual discount: ${manualDiscount}` : '',
        loyalty ? 'Loyalty applied' : '',
        feedbackSms ? 'Send feedback SMS' : '',
      ].filter(Boolean).join(' · ') || undefined

      const apiPaymentMethod =
        resolved === 'omit' || resolved === 'DUE'
          ? undefined
          : resolved === 'OTHER'
            ? 'UPI' as const
            : resolved

      const displayMethod = resolved === 'omit' || resolved === 'DUE' ? 'DUE' : resolved

      const payload = {
        type: orderType === 'dine-in' ? 'DINE_IN' as const : orderType === 'takeaway' ? 'TAKEAWAY' as const : 'DELIVERY' as const,
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
        instructions: extraNotes,
        tableId: orderType === 'dine-in' ? selectedTableId || undefined : undefined,
        voucherCode: appliedVoucher || undefined,
        paymentMethod: apiPaymentMethod,
      }

      const adjustedBreakdown = {
        ...baseBreakdown,
        voucherDiscount: voucherDiscount + manualDiscount,
        total,
      }

      const saveOffline = async () => {
        await enqueueSync({
          method: 'POST',
          url: '/orders',
          body: payload,
          resource: 'orders',
          operation: 'create',
        })
        const localOrder = buildLocalOfflineOrder({
          payload,
          cart,
          breakdown: adjustedBreakdown,
          paymentMethod: displayMethod,
          tables,
          selectedTableId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
        })
        onSuccess(localOrder.orderNumber, localOrder.total, displayMethod, localOrder)
        onOpenChange(false)
        resetForm()
      }

      if (!online) {
        await saveOffline()
        return
      }

      try {
        const order = await ordersApi.create(payload)
        onSuccess(order.orderNumber, Math.max(0, order.total - manualDiscount), displayMethod, {
          ...order,
          discount: (order.discount ?? 0) + manualDiscount,
          total: Math.max(0, order.total - manualDiscount),
        })
        onOpenChange(false)
        resetForm()
      } catch (createError) {
        if (!isNetworkFailure(createError)) throw createError
        await saveOffline()
      }
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
    setPayMethod('CASH')
    setSplitCash('')
    setSplitUpi('')
    setSplitCard('')
    setCashTendered('')
  }

  const methods: Array<{ id: PayMethod; label: string }> = [
    { id: 'CASH', label: 'Cash' },
    { id: 'CARD', label: 'Card' },
    { id: 'UPI', label: 'UPI' },
    { id: 'DUE', label: 'Due' },
    { id: 'SPLIT', label: 'Split' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment overview</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Walk-in" />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone {(orderType === 'takeaway' || orderType === 'delivery') && <span className="text-danger">*</span>}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={handlePhoneLookup} placeholder="+91…" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {orderType === 'dine-in' && (
              <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm font-medium">
                {selectedTable
                  ? `Table ${selectedTable.number} — ${selectedTable.floor}`
                  : 'No table'}
              </div>
            )}
            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Coupon / voucher</Label>
              <div className="flex gap-2">
                <Input value={voucherCode} onChange={(e) => {
                  setVoucherCode(e.target.value)
                  if (appliedVoucher) {
                    setAppliedVoucher('')
                    setServerTotals(null)
                  }
                }} placeholder="Code" />
                <Button type="button" variant="secondary" disabled={validatingVoucher} onClick={handleApplyVoucher}>
                  {validatingVoucher ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bill overview</p>
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(baseBreakdown.subtotal)}</span></div>
              {voucherDiscount > 0 && (
                <div className="flex justify-between text-sm text-success"><span>Voucher</span><span>-{formatCurrency(voucherDiscount)}</span></div>
              )}
              {manualDiscount > 0 && (
                <div className="flex justify-between text-sm text-success"><span>Manual discount</span><span>-{formatCurrency(manualDiscount)}</span></div>
              )}
              {baseBreakdown.gstAmount > 0 && <div className="flex justify-between text-sm"><span>GST</span><span>{formatCurrency(baseBreakdown.gstAmount)}</span></div>}
              {baseBreakdown.cgstAmount > 0 && <div className="flex justify-between text-sm"><span>CGST</span><span>{formatCurrency(baseBreakdown.cgstAmount)}</span></div>}
              {baseBreakdown.sgstAmount > 0 && <div className="flex justify-between text-sm"><span>SGST</span><span>{formatCurrency(baseBreakdown.sgstAmount)}</span></div>}
              <Separator />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {methods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPayMethod(method.id)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-xs font-semibold',
                      payMethod === method.id ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                    )}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {payMethod === 'CASH' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Cash tendered</Label>
                  <Input value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} type="number" min={0} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Change</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold">
                    {formatCurrency(change)}
                  </div>
                </div>
              </div>
            )}

            {payMethod === 'SPLIT' && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-[10px]">Cash</Label><Input value={splitCash} onChange={(e) => setSplitCash(e.target.value)} type="number" /></div>
                  <div><Label className="text-[10px]">UPI</Label><Input value={splitUpi} onChange={(e) => setSplitUpi(e.target.value)} type="number" /></div>
                  <div><Label className="text-[10px]">Card</Label><Input value={splitCard} onChange={(e) => setSplitCard(e.target.value)} type="number" /></div>
                </div>
                <p className={cn('text-xs', Math.abs(splitRemaining) < 0.05 ? 'text-success' : 'text-danger')}>
                  Paid {formatCurrency(splitPaid)} · Remaining {formatCurrency(splitRemaining)}
                </p>
              </div>
            )}

            <Button type="button" size="lg" className="w-full" disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Collect {formatCurrency(total)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
