import { ChefHat, Minus, Pause, Plus, Printer, Receipt, Save, Smartphone, StickyNote, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency, cn } from '@/lib/utils'
import type { OrderItem } from '@/types'
import type { PosDiscountMode } from '@/store/slices/posSlice'

export type PosQuickPay = 'CASH' | 'CARD' | 'DUE' | 'OTHER' | 'PART'

interface PosCartPanelProps {
  cart: OrderItem[]
  cartWidth: number
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void
  kotSentKeys: string[]
  discountMode: PosDiscountMode
  discountValue: number
  discountAmount: number
  total: number
  actionsDisabled: boolean
  kotDisabled?: boolean
  heldCount: number
  quickPay: PosQuickPay
  loyalty: boolean
  feedbackSms: boolean
  markedPaid: boolean
  onQuantity: (lineKey: string, quantity: number) => void
  onRemove: (lineKey: string) => void
  onEditModifiers?: (item: OrderItem) => void
  onNotes: (lineKey: string, notes: string) => void
  onDiscountMode: (mode: PosDiscountMode, value: number) => void
  onQuickPay: (method: PosQuickPay) => void
  onToggleLoyalty: () => void
  onToggleFeedbackSms: () => void
  onToggleMarkedPaid: () => void
  onSave: () => void
  onSavePrint: () => void
  onSaveEbill: () => void
  onKot: () => void
  onKotPrint: () => void
  onHold: () => void
  onOpenHeld: () => void
}

const PAY_OPTIONS: Array<{ id: PosQuickPay; label: string }> = [
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card' },
  { id: 'DUE', label: 'Due' },
  { id: 'OTHER', label: 'Other' },
  { id: 'PART', label: 'Part' },
]

export function PosCartPanel({
  cart,
  cartWidth,
  onResizeStart,
  kotSentKeys,
  discountMode,
  discountValue,
  discountAmount,
  total,
  actionsDisabled,
  kotDisabled,
  heldCount,
  quickPay,
  loyalty,
  feedbackSms,
  markedPaid,
  onQuantity,
  onRemove,
  onEditModifiers,
  onNotes,
  onDiscountMode,
  onQuickPay,
  onToggleLoyalty,
  onToggleFeedbackSms,
  onToggleMarkedPaid,
  onSave,
  onSavePrint,
  onSaveEbill,
  onKot,
  onKotPrint,
  onHold,
  onOpenHeld,
}: PosCartPanelProps) {
  return (
    <aside
      className="relative flex min-h-0 shrink-0 flex-col border-l bg-white text-[11px]"
      style={{ width: cartWidth }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        onPointerDown={onResizeStart}
        className="absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none hover:bg-primary/40"
      >
        <span className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border" />
      </div>

      <div className="flex items-center justify-between border-b px-2.5 py-1.5">
        <h2 className="text-xs font-semibold">Current order</h2>
        <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">{cart.reduce((n, i) => n + i.quantity, 0)} items</Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-3 py-6 text-center">
            <Receipt className="mb-1.5 h-6 w-6 text-muted-foreground" />
            <p className="text-xs font-medium">No item selected</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Tap menu items to add</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_80px_48px] gap-1 border-b px-1 pb-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Items</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
            </div>
            {cart.map((item) => {
              const sent = kotSentKeys.includes(item.lineKey)
              return (
                <div key={item.lineKey} className={cn('rounded-md border p-1.5', sent && 'border-success/40 bg-success/5')}>
                  <div className="grid grid-cols-[1fr_80px_48px] items-start gap-1">
                    <div className="min-w-0">
                      <div className="flex items-start gap-1">
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 text-danger hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
                          title={sent ? 'Already on KOT — cannot remove here' : 'Remove'}
                          disabled={sent}
                          onClick={() => onRemove(item.lineKey)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium leading-tight">{item.name}</p>
                          {item.variantName && <p className="text-[9px] font-medium text-primary">{item.variantName}</p>}
                          {item.comboId && <Badge variant="secondary" className="h-3.5 px-1 text-[8px]">Combo</Badge>}
                          {item.modifiers?.map((mod) => (
                            <p key={mod.id} className="text-[9px] text-muted-foreground">{mod.groupName}: {mod.name}</p>
                          ))}
                          {sent && <p className="text-[8px] font-semibold text-success">KOT sent</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        disabled={sent}
                        onClick={() => onQuantity(item.lineKey, Math.max(1, item.quantity - 1))}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        inputMode="numeric"
                        value={item.quantity}
                        disabled={sent}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '') return
                          const next = Math.min(999, Math.max(1, Number(raw) || 1))
                          onQuantity(item.lineKey, next)
                        }}
                        onBlur={(e) => {
                          if (!e.target.value || Number(e.target.value) < 1) onQuantity(item.lineKey, 1)
                        }}
                        className="h-6 w-9 px-0.5 text-center text-[11px] font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-60"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        disabled={sent}
                        onClick={() => onQuantity(item.lineKey, Math.min(999, item.quantity + 1))}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                    <p className="pt-0.5 text-right text-[11px] font-semibold leading-none">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <StickyNote className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                    <Input
                      value={item.notes || ''}
                      onChange={(e) => onNotes(item.lineKey, e.target.value)}
                      placeholder="Kitchen note"
                      className="h-6 text-[10px]"
                    />
                  </div>
                  {(item.variantId || (item.modifiers && item.modifiers.length > 0)) && onEditModifiers && (
                    <button type="button" className="mt-0.5 text-[9px] text-primary hover:underline" onClick={() => onEditModifiers(item)}>
                      Edit options
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-1.5 border-t bg-white p-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="sm" variant={discountMode === 'percent' ? 'default' : 'outline'} className="h-5 px-1.5 text-[9px]"
            onClick={() => onDiscountMode('percent', discountMode === 'percent' ? discountValue : 10)}>
            % Disc
          </Button>
          <Button type="button" size="sm" variant={discountMode === 'fixed' ? 'default' : 'outline'} className="h-5 px-1.5 text-[9px]"
            onClick={() => onDiscountMode('fixed', discountMode === 'fixed' ? discountValue : 50)}>
            ₹ Disc
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-5 px-1.5 text-[9px]"
            onClick={() => onDiscountMode('none', 0)}>
            Clear
          </Button>
          {discountMode !== 'none' && (
            <Input
              type="number"
              className="h-5 w-12 text-[10px]"
              value={discountValue}
              min={0}
              onChange={(e) => onDiscountMode(discountMode, Number(e.target.value) || 0)}
            />
          )}
          {discountAmount > 0 && (
            <span className="ml-auto self-center text-[9px] font-medium text-success">-{formatCurrency(discountAmount)}</span>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md bg-foreground px-2.5 py-1.5">
          <span className="text-[11px] font-bold text-background">Total</span>
          <span className="text-lg font-bold tabular-nums text-primary">{formatCurrency(total)}</span>
        </div>
        <p className="text-[8px] text-muted-foreground">Tax in payment overview</p>

        <div className="flex flex-wrap gap-0.5 rounded-md bg-muted/50 p-1">
          {PAY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onQuickPay(opt.id)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-semibold',
                quickPay === opt.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2.5 rounded-md bg-muted/30 px-1.5 py-1 text-[9px] font-medium">
          <label className="flex cursor-pointer items-center gap-1">
            <input type="checkbox" className="h-3 w-3 accent-primary" checked={markedPaid} onChange={onToggleMarkedPaid} />
            It&apos;s Paid
          </label>
          <label className="flex cursor-pointer items-center gap-1">
            <input type="checkbox" className="h-3 w-3 accent-primary" checked={loyalty} onChange={onToggleLoyalty} />
            Loyalty
          </label>
          <label className="flex cursor-pointer items-center gap-1">
            <input type="checkbox" className="h-3 w-3 accent-primary" checked={feedbackSms} onChange={onToggleFeedbackSms} />
            Feedback SMS
          </label>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <ActionBtn label="Save" shortcut="⌃S" icon={<Save className="h-3 w-3" />} disabled={actionsDisabled} onClick={onSave} tone="primary" />
          <ActionBtn label="Save & Print" shortcut="⌃P" icon={<Printer className="h-3 w-3" />} disabled={actionsDisabled} onClick={onSavePrint} tone="primary" />
          <ActionBtn label="Save & eBill" icon={<Smartphone className="h-3 w-3" />} disabled={actionsDisabled} onClick={onSaveEbill} tone="primary" />
          <ActionBtn label="KOT" shortcut="⌃K" icon={<ChefHat className="h-3 w-3" />} disabled={kotDisabled ?? actionsDisabled} onClick={onKot} tone="muted" />
          <ActionBtn label="KOT & Print" icon={<ChefHat className="h-3 w-3" />} disabled={kotDisabled ?? actionsDisabled} onClick={onKotPrint} tone="muted" />
          <ActionBtn label="Hold" icon={<Pause className="h-3 w-3" />} disabled={actionsDisabled && !heldCount} onClick={onHold} tone="muted" />
        </div>

        {heldCount > 0 && (
          <Button type="button" size="sm" variant="secondary" className="h-7 w-full text-[10px]" onClick={onOpenHeld}>
            Held orders ({heldCount})
          </Button>
        )}
      </div>
    </aside>
  )
}

function ActionBtn({
  label,
  shortcut,
  icon,
  disabled,
  onClick,
  tone,
}: {
  label: string
  shortcut?: string
  icon: React.ReactNode
  disabled?: boolean
  onClick: () => void
  tone: 'primary' | 'muted'
}) {
  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-auto min-h-9 flex-col gap-0 px-0.5 py-1 text-[9px] leading-tight',
        tone === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-foreground text-background hover:bg-foreground/90',
      )}
    >
      {icon}
      <span className="text-center font-semibold">{label}</span>
      {shortcut && <span className="text-[7px] opacity-70">{shortcut}</span>}
    </Button>
  )
}
