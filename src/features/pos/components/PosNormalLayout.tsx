import {
  Armchair, CheckCircle2, Minus, Pause, Plus, Receipt, RotateCcw, Search, Star, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, cn } from '@/lib/utils'
import { resolveMenuImageUrl } from '@/api/menu.api'
import { effectiveVariantPrice } from '@/features/menu/variants'
import { isTableSelectableForNewOrder } from '../lib/tableStatus'
import type { Category } from '@/api/types/menu.types'
import type { MenuItemDto, TableDto } from '@/api/types/pos.types'
import type { Combo } from '@/api/types/catalog.types'
import type { OrderItem } from '@/types'
import type { calculateTaxBreakdown } from '@/lib/tax'

type TaxBreakdown = ReturnType<typeof calculateTaxBreakdown>

interface PosNormalLayoutProps {
  categories: Category[]
  catalogView: 'items' | 'combos' | 'favorites'
  selectedCategory: string | null
  onSelectAll: () => void
  onSelectCategory: (id: string) => void
  onSelectCombos: () => void
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  onOrderTypeChange: (type: 'dine-in' | 'takeaway' | 'delivery') => void
  tables: TableDto[]
  selectedTableId: string | null
  onTableChange: (id: string) => void
  search: string
  onSearchChange: (value: string) => void
  items: MenuItemDto[]
  combos: Combo[]
  canAddItems: boolean
  onAddItem: (item: MenuItemDto) => void
  onAddCombo: (combo: { id: string; name: string; price: number }) => void
  cart: OrderItem[]
  cartWidth: number
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void
  onQuantity: (lineKey: string, quantity: number) => void
  onRemove: (lineKey: string) => void
  onEditModifiers?: (item: OrderItem) => void
  onHold: () => void
  onClearCart: () => void
  heldCount: number
  onOpenHeld: () => void
  breakdown: TaxBreakdown
  onCheckout: () => void
  checkoutDisabled: boolean
}

export function PosNormalLayout({
  categories,
  catalogView,
  selectedCategory,
  onSelectAll,
  onSelectCategory,
  onSelectCombos,
  orderType,
  onOrderTypeChange,
  tables,
  selectedTableId,
  onTableChange,
  search,
  onSearchChange,
  items,
  combos,
  canAddItems,
  onAddItem,
  onAddCombo,
  cart,
  cartWidth,
  onResizeStart,
  onQuantity,
  onRemove,
  onEditModifiers,
  onHold,
  onClearCart,
  heldCount,
  onOpenHeld,
  breakdown,
  onCheckout,
  checkoutDisabled,
}: PosNormalLayoutProps) {
  const selectableTables = tables.filter(
    (table) => isTableSelectableForNewOrder(table, selectedTableId),
  )

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
      {/* Categories */}
      <div className="flex w-24 shrink-0 flex-col border-r bg-card xl:w-28">
        <div className="shrink-0 border-b p-2.5 xl:p-3">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </p>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto py-1">
          <button
            type="button"
            onClick={onSelectAll}
            className={cn(
              'flex w-full flex-col items-center gap-1 px-1 py-3 text-[10px] font-medium transition-colors',
              catalogView === 'items' && !selectedCategory ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
            )}
          >
            <span className="text-xl">🍽️</span>
            <span>All</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'flex w-full flex-col items-center gap-1 px-1 py-3 text-[10px] font-medium transition-colors',
                catalogView === 'items' && selectedCategory === cat.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
              )}
            >
              <span className="text-xl">{cat.icon || '🍽️'}</span>
              <span className="text-center leading-tight">{cat.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onSelectCombos}
            className={cn(
              'flex w-full flex-col items-center gap-1 px-1 py-3 text-[10px] font-medium transition-colors',
              catalogView === 'combos' ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
            )}
          >
            <span className="text-xl">🍱</span>
            <span>Combos</span>
          </button>
        </div>
      </div>

      {/* Products */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-card p-3 xl:p-4">
          <div>
            <h1 className="text-xl font-bold">{catalogView === 'combos' ? 'Combos' : 'Products Menu'}</h1>
            <p className="text-xs text-muted-foreground">Select items to add to order</p>
          </div>
          <Tabs
            value={orderType === 'delivery' ? 'takeaway' : orderType}
            onValueChange={(value) => onOrderTypeChange(value as 'dine-in' | 'takeaway')}
          >
            <TabsList>
              <TabsTrigger value="dine-in">Dine In</TabsTrigger>
              <TabsTrigger value="takeaway">Takeaway</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {orderType === 'dine-in' && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 xl:px-4 xl:py-3',
              selectedTableId ? 'bg-success/10' : 'bg-primary/10',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  selectedTableId ? 'bg-success text-white' : 'bg-primary text-primary-foreground',
                )}
              >
                {selectedTableId ? <CheckCircle2 className="h-5 w-5" /> : <Armchair className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedTableId ? 'success' : 'warning'}>Step 1</Badge>
                  <p className="font-semibold">{selectedTableId ? 'Table selected' : 'Choose a table first'}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {selectedTableId
                    ? 'You can now add items to this dine-in order.'
                    : 'Dine-in items stay locked until a table is selected.'}
                </p>
              </div>
            </div>
            <Select value={selectedTableId || undefined} onValueChange={onTableChange}>
              <SelectTrigger
                className={cn(
                  'h-10 w-[150px] shrink-0 bg-card font-semibold shadow-sm xl:h-11 xl:w-[210px]',
                  !selectedTableId && 'border-primary ring-2 ring-primary/20',
                )}
              >
                <SelectValue placeholder="Select table" />
              </SelectTrigger>
              <SelectContent>
                {selectableTables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    Table {table.number} · {table.floor} · {table.capacity} seats
                    {table.currentOrder ? ` · ${table.currentOrder.orderNumber}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="shrink-0 border-b p-3 xl:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 xl:p-4">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 xl:gap-3">
            {catalogView === 'combos'
              ? combos.map((combo) => (
                  <div
                    key={combo.id}
                    className="relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/30 hover:shadow-elevated"
                  >
                    <div className="relative flex h-24 items-center justify-center overflow-hidden bg-muted/50 text-4xl">
                      <span>🍱</span>
                      {combo.imageUrl && (
                        <img
                          src={resolveMenuImageUrl(combo.imageUrl) ?? ''}
                          alt={combo.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(event) => { event.currentTarget.style.display = 'none' }}
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="text-sm font-semibold">{combo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {combo.items.map((entry) => `${entry.quantity}× ${entry.menuItem?.name ?? 'item'}`).join(', ')}
                      </p>
                      <p className="mt-2 text-base font-bold text-primary">{formatCurrency(combo.price)}</p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-auto w-full"
                        disabled={!canAddItems}
                        onClick={() => {
                          if (!canAddItems) {
                            toast.error('Please select a table before adding items')
                            return
                          }
                          onAddCombo(combo)
                        }}
                      >
                        Add Combo
                      </Button>
                    </div>
                  </div>
                ))
              : items.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:border-primary/30 hover:shadow-elevated"
                  >
                    {item.popular && (
                      <Badge className="absolute right-2 top-2 z-10 text-[10px]" variant="warning">
                        <Star className="mr-0.5 h-2.5 w-2.5" /> Popular
                      </Badge>
                    )}
                    <div className="relative flex h-16 items-center justify-center overflow-hidden bg-muted/50 text-3xl xl:h-24 xl:text-4xl">
                      <span aria-hidden>
                        {categories.find((c) => c.id === item.categoryId)?.icon
                          || categories.find((c) => c.name === item.category)?.icon
                          || '🍽️'}
                      </span>
                      {item.imageUrl && (
                        <img
                          src={resolveMenuImageUrl(item.imageUrl) ?? ''}
                          alt={item.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => { event.currentTarget.style.display = 'none' }}
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-2 xl:p-3">
                      <p className="text-sm font-semibold leading-tight">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
                      <p className="mt-2 text-base font-bold text-primary">
                        {item.hasVariants && item.variants?.some((variant) => variant.isAvailable)
                          ? `Starting from ${formatCurrency(Math.min(...item.variants.filter((variant) => variant.isAvailable).map(effectiveVariantPrice)))}`
                          : formatCurrency(item.price)}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full"
                        disabled={!canAddItems}
                        onClick={() => onAddItem(item)}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Cart */}
      <div className="relative flex min-h-0 shrink-0 flex-col border-l bg-card" style={{ width: cartWidth }}>
        <div
          role="separator"
          aria-label="Resize ordered items panel"
          aria-orientation="vertical"
          title="Drag to resize order panel"
          onPointerDown={onResizeStart}
          className="absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none transition-colors hover:bg-primary/50 active:bg-primary"
        >
          <span className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border" />
        </div>

        <div className="shrink-0 border-b p-4">
          <h2 className="font-semibold">Ordered Items</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <Receipt className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No items yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add products from the menu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.lineKey} className="rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.variantName && <p className="text-[11px] font-medium text-primary">{item.variantName}</p>}
                      {item.comboId && <Badge variant="secondary" className="text-[9px]">Combo</Badge>}
                      {item.modifiers?.map((modifier) => (
                        <p key={modifier.id} className="text-[11px] text-muted-foreground">
                          {modifier.groupName}: {modifier.name}
                        </p>
                      ))}
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onQuantity(item.lineKey, Math.max(1, item.quantity - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onQuantity(item.lineKey, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-danger hover:underline"
                      onClick={() => onRemove(item.lineKey)}
                    >
                      Remove
                    </button>
                  </div>
                  {(item.variantId || (item.modifiers && item.modifiers.length > 0)) && onEditModifiers && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-primary hover:underline"
                      onClick={() => onEditModifiers(item)}
                    >
                      Edit options
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t p-3">
          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onHold} disabled={!cart.length}>
              <Pause className="mr-1 h-3 w-3" /> Hold
            </Button>
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClearCart} disabled={!cart.length}>
              <Trash2 className="mr-1 h-3 w-3" /> Clear
            </Button>
          </div>
          {heldCount > 0 && (
            <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onOpenHeld}>
              <RotateCcw className="mr-1 h-3 w-3" /> Resume Held ({heldCount})
            </Button>
          )}
        </div>

        <div className="shrink-0 space-y-1 border-t p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(breakdown.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST</span>
            <span>{formatCurrency(breakdown.gstAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">SGST</span>
            <span>{formatCurrency(breakdown.sgstAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">CGST</span>
            <span>{formatCurrency(breakdown.cgstAmount)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(breakdown.total)}</span>
          </div>
        </div>

        <div className="shrink-0 border-t p-4">
          <Button
            type="button"
            size="lg"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            disabled={checkoutDisabled}
            onClick={onCheckout}
          >
            Order Now
          </Button>
        </div>
      </div>
    </div>
  )
}
