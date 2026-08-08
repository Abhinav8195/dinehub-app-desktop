import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Star, Minus, Plus, Trash2, Pause, RotateCcw, Receipt, Armchair, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  addToCart, removeFromCart, updateQuantity, clearCart, replaceCartItem,
  setOrderType, holdOrder, resumeOrder, setSelectedTable
} from '@/store/slices/posSlice'
import { addOrder } from '@/store/slices/ordersSlice'
import { formatCurrency, cn } from '@/lib/utils'
import { calculateTaxBreakdown, DEFAULT_TAX_SETTINGS } from '@/lib/tax'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { BRAND } from '@/constants/brand'
import { buildReceiptHtml } from '@/lib/print/receipt'
import { menuApi, resolveMenuImageUrl } from '@/api/menu.api'
import { combosApi } from '@/api/catalog.api'
import { tablesApi } from '@/api/tables.api'
import { useTaxSettings } from '@/hooks/useTaxSettings'
import { CheckoutModal } from './components/CheckoutModal'
import { ModifierSelectionDialog } from './components/ModifierSelectionDialog'
import type { RootState } from '@/store'
import type { MenuItemDto } from '@/api/types/pos.types'
import type { PosOrder } from '@/api/types/pos.types'
import type { OrderItem } from '@/types'
import { settingsApi } from '@/api/settings.api'
import { effectiveVariantPrice } from '@/features/menu/variants'

export default function POSPage() {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { cart, orderType, heldOrders, selectedTableId } = useSelector((s: RootState) => s.pos)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [catalogView, setCatalogView] = useState<'items' | 'combos'>('items')
  const [modifierItem, setModifierItem] = useState<MenuItemDto | null>(null)
  const [editingLine, setEditingLine] = useState<OrderItem | null>(null)

  const { data: taxSettings } = useTaxSettings()
  const { data: restaurant } = useQuery({ queryKey: ['settings', 'restaurant'], queryFn: settingsApi.getRestaurant })

  const { data: categories = [] } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => menuApi.listCategories(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items', selectedCategory],
    queryFn: () => menuApi.listItems(selectedCategory || undefined),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.list(),
    enabled: orderType === 'dine-in',
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  const { data: combos = [] } = useQuery({
    queryKey: ['combos', 'pos'],
    queryFn: () => combosApi.list(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const filteredItems = menuItems.filter((item) => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
    return matchSearch && item.available
  })

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const breakdown = calculateTaxBreakdown(subtotal, taxSettings ?? DEFAULT_TAX_SETTINGS)

  const handleAddItem = (item: MenuItemDto) => {
    if (orderType === 'dine-in' && !selectedTableId) {
      toast.error('Please select a table before adding items')
      return
    }
    if (item.hasVariants || item.modifierGroups?.some((group) => group.isActive)) {
      setEditingLine(null)
      setModifierItem(item)
      return
    }
    dispatch(addToCart({ id: item.id, lineKey: `menu:${item.id}:`, menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }))
    toast.success(`Added ${item.name}`)
  }
  const handleModifierConfirm = (line: OrderItem) => {
    if (editingLine) dispatch(replaceCartItem({ oldLineKey: editingLine.lineKey, item: line }))
    else dispatch(addToCart(line))
    toast.success(editingLine ? 'Item updated' : `Added ${line.name}`)
    setEditingLine(null)
  }
  const editModifiers = (line: OrderItem) => {
    const item = menuItems.find((entry) => entry.id === line.menuItemId)
    if (!item) return
    setEditingLine(line)
    setModifierItem(item)
  }

  const handleOrderSuccess = (orderNumber: string, total: number, paymentMethod: string, serverOrder?: PosOrder) => {
    toast.success(`Order ${orderNumber} placed — ${formatCurrency(total)}`)
    const finalSubtotal = serverOrder?.subtotal ?? subtotal
    const finalTax = serverOrder
      ? serverOrder.gstAmount + serverOrder.sgstAmount + serverOrder.cgstAmount
      : breakdown.gstAmount + breakdown.sgstAmount + breakdown.cgstAmount

    dispatch(addOrder({
      id: serverOrder?.id ?? orderNumber,
      orderNumber,
      type: orderType,
      status: 'pending',
      items: [...cart],
      subtotal: finalSubtotal,
      tax: finalTax,
      discount: serverOrder?.discount ?? 0,
      total,
      tableId: selectedTableId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    if (window.electronAPI?.printReceipt) {
      const html = buildReceiptHtml({
        orderNumber,
        invoiceNumber: (serverOrder as (PosOrder & { invoiceNumber?: string }) | undefined)?.invoiceNumber,
        restaurant: {
          name: String(restaurant?.name || BRAND.name),
          logoUrl: typeof restaurant?.logoUrl === 'string' ? restaurant.logoUrl : undefined,
          showLogo: restaurant?.receiptLogoEnabled !== false,
          address: typeof restaurant?.address === 'string' ? restaurant.address : undefined,
          phone: typeof restaurant?.phone === 'string' ? restaurant.phone : undefined,
          gstin: typeof restaurant?.gstin === 'string' ? restaurant.gstin : undefined,
        },
        customerName: serverOrder?.customer?.name,
        table: serverOrder?.table?.label,
        orderType: orderType === 'dine-in' ? 'Dine In' : 'Takeaway',
        items: cart.map((i) => ({ name: `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`, qty: i.quantity, price: i.price })),
        subtotal: finalSubtotal,
        taxes: serverOrder ? [
          { name: 'GST', rate: taxSettings?.gstPercent, amount: serverOrder.gstAmount },
          { name: 'SGST', rate: taxSettings?.sgstPercent, amount: serverOrder.sgstAmount },
          { name: 'CGST', rate: taxSettings?.cgstPercent, amount: serverOrder.cgstAmount },
        ].filter((tax) => tax.amount > 0) : [{ name: 'Tax', amount: finalTax }],
        discount: serverOrder?.discount,
        total,
        paymentMethod,
        footerText: typeof restaurant?.receiptFooter === 'string' ? restaurant.receiptFooter : undefined,
        date: serverOrder?.createdAt,
      })
      window.electronAPI.printReceipt(html).catch(() => {})
    }

    dispatch(clearCart())
    dispatch(setSelectedTable(null))
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['tables'] })
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background">
      {/* Left - Category Sidebar */}
      <div className="w-[76px] xl:w-[104px] flex flex-col border-r bg-card shrink-0">
        <div className="p-3 border-b flex flex-col items-center gap-1">
          <BrandLogo size="xs" showText={false} />
          <p className="text-[10px] font-bold text-center leading-tight">{BRAND.name}</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <button
            type="button"
            onClick={() => { setCatalogView('items'); setSelectedCategory(null) }}
            className={cn(
              'w-full flex flex-col items-center gap-1 py-3 px-1 text-[10px] font-medium transition-colors',
              catalogView === 'items' && !selectedCategory ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            )}
          >
            <span className="text-xl">🍽️</span>
            <span>All</span>
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => { setCatalogView('items'); setSelectedCategory(cat.id) }}
              className={cn(
                'w-full flex flex-col items-center gap-1 py-3 px-1 text-[10px] font-medium transition-colors',
                catalogView === 'items' && selectedCategory === cat.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
            >
              <span className="text-xl">{cat.icon || '🍽️'}</span>
              <span className="text-center leading-tight">{cat.name}</span>
            </button>
          ))}
          <button type="button" onClick={() => setCatalogView('combos')} className={cn('w-full flex flex-col items-center gap-1 py-3 px-1 text-[10px] font-medium transition-colors', catalogView === 'combos' ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
            <span className="text-xl">🍱</span><span>Combos</span>
          </button>
        </div>
      </div>

      {/* Center - Products */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex items-center justify-between p-4 border-b bg-card shrink-0 gap-3">
          <div>
            <h1 className="text-xl font-bold">{catalogView === 'combos' ? 'Combos' : 'Products Menu'}</h1>
            <p className="text-xs text-muted-foreground">Select items to add to order</p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={orderType} onValueChange={(v) => { dispatch(setOrderType(v as typeof orderType)); dispatch(setSelectedTable(null)) }}>
              <TabsList><TabsTrigger value="dine-in">Dine In</TabsTrigger><TabsTrigger value="takeaway">Takeaway</TabsTrigger></TabsList>
            </Tabs>
          </div>
        </div>

        {orderType === 'dine-in' && <div className={cn('flex items-center justify-between gap-4 border-b px-4 py-3', selectedTableId ? 'bg-success/10' : 'bg-primary/10')}>
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', selectedTableId ? 'bg-success text-white' : 'bg-primary text-primary-foreground')}>
              {selectedTableId ? <CheckCircle2 className="h-5 w-5" /> : <Armchair className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><Badge variant={selectedTableId ? 'success' : 'warning'}>Step 1</Badge><p className="font-semibold">{selectedTableId ? 'Table selected' : 'Choose a table first'}</p></div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{selectedTableId ? 'You can now add items to this dine-in order.' : 'Dine-in items stay locked until a table is selected.'}</p>
            </div>
          </div>
          <Select value={selectedTableId || ''} onValueChange={(value) => dispatch(setSelectedTable(value))}>
            <SelectTrigger className={cn('h-11 w-[210px] shrink-0 bg-card font-semibold shadow-sm', !selectedTableId && 'border-primary ring-2 ring-primary/20')}><SelectValue placeholder="Select table" /></SelectTrigger>
            <SelectContent>{tables.filter((table) => table.status === 'available' || table.id === selectedTableId).map((table) => <SelectItem key={table.id} value={table.id}>Table {table.number} · {table.floor} · {table.capacity} seats</SelectItem>)}</SelectContent>
          </Select>
        </div>}

        <div className="p-4 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 xl:p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5 xl:gap-3">
            {catalogView === 'items' ? filteredItems.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col rounded-2xl border bg-card overflow-hidden hover:shadow-elevated hover:border-primary/30 transition-all"
              >
                {item.popular && (
                  <Badge className="absolute top-2 right-2 text-[10px] z-10" variant="warning">
                    <Star className="h-2.5 w-2.5 mr-0.5" /> Popular
                  </Badge>
                )}
                <div className="relative flex h-16 xl:h-24 items-center justify-center overflow-hidden bg-muted/50 text-3xl xl:text-4xl">
                  <span aria-hidden>
                    {categories.find((c) => c.id === item.categoryId)?.icon || categories.find((c) => c.name === item.category)?.icon || '🍽️'}
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
                <div className="p-2 xl:p-3 flex-1 flex flex-col">
                  <p className="text-sm font-semibold leading-tight">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                  <p className="text-base font-bold text-primary mt-2">{item.hasVariants && item.variants?.some((variant) => variant.isAvailable) ? `Starting from ${formatCurrency(Math.min(...item.variants.filter((variant) => variant.isAvailable).map(effectiveVariantPrice)))}` : formatCurrency(item.price)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {orderType === 'dine-in' && <Badge variant="outline" className="text-[9px]">Dine in</Badge>}
                    {orderType === 'takeaway' && <Badge variant="outline" className="text-[9px]">Pick Up</Badge>}
                  </div>
                  <Button type="button" size="sm" className="mt-3 w-full" disabled={orderType === 'dine-in' && !selectedTableId} onClick={() => handleAddItem(item)}>
                    Add to Cart
                  </Button>
                </div>
              </div>
            )) : combos.filter((combo) => !search || combo.name.toLowerCase().includes(search.toLowerCase())).map((combo) => (
              <div key={combo.id} className="relative flex flex-col rounded-2xl border bg-card overflow-hidden hover:shadow-elevated hover:border-primary/30 transition-all">
                <div className="relative flex h-24 items-center justify-center overflow-hidden bg-muted/50 text-4xl">
                  <span>🍱</span>
                  {combo.imageUrl && <img src={resolveMenuImageUrl(combo.imageUrl) ?? ''} alt={combo.name} className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
                </div>
                <div className="p-3 flex-1 flex flex-col"><p className="text-sm font-semibold">{combo.name}</p><p className="text-xs text-muted-foreground">{combo.items.map((entry) => `${entry.quantity}× ${entry.menuItem?.name ?? 'item'}`).join(', ')}</p><p className="text-base font-bold text-primary mt-2">{formatCurrency(combo.price)}</p>
                  <Button type="button" size="sm" className="mt-auto w-full" disabled={orderType === 'dine-in' && !selectedTableId} onClick={() => { if (orderType === 'dine-in' && !selectedTableId) { toast.error('Please select a table before adding items'); return }; dispatch(addToCart({ id: combo.id, lineKey: `combo:${combo.id}`, comboId: combo.id, name: combo.name, price: combo.price, quantity: 1 })); toast.success(`Added ${combo.name}`) }}>Add Combo</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Cart */}
      <div className="w-[286px] xl:w-[340px] flex flex-col bg-card shrink-0 min-h-0 border-l">
        <div className="p-4 border-b shrink-0">
          <h2 className="font-semibold">Ordered Items</h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No items yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add products from the menu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.lineKey} className="p-3 rounded-xl border bg-muted/30">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.variantName && <p className="text-[11px] font-medium text-primary">{item.variantName}</p>}
                      {item.comboId && <Badge variant="secondary" className="text-[9px]">Combo</Badge>}
                      {item.modifiers?.map((modifier) => <p key={modifier.id} className="text-[11px] text-muted-foreground">{modifier.groupName}: {modifier.name}</p>)}
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => dispatch(updateQuantity({ id: item.lineKey, quantity: Math.max(1, item.quantity - 1) }))}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button type="button" variant="outline" size="icon" className="h-7 w-7"
                        onClick={() => dispatch(updateQuantity({ id: item.lineKey, quantity: item.quantity + 1 }))}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <button type="button" className="text-xs text-danger hover:underline"
                      onClick={() => dispatch(removeFromCart(item.lineKey))}>
                      Remove
                    </button>
                  </div>
                  {(item.variantId || (item.modifiers && item.modifiers.length > 0)) && <button type="button" className="mt-2 text-xs text-primary hover:underline" onClick={() => editModifiers(item)}>Edit options</button>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" size="sm" className="text-xs"
              onClick={() => { dispatch(holdOrder()); toast.success('Order held') }}>
              <Pause className="h-3 w-3 mr-1" /> Hold
            </Button>
            <Button type="button" variant="outline" size="sm" className="text-xs"
              onClick={() => { dispatch(clearCart()); toast.success('Cart cleared') }}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
          {heldOrders.length > 0 && (
            <Button type="button" variant="secondary" size="sm" className="w-full"
              onClick={() => { dispatch(resumeOrder(heldOrders[0].id)); toast.success('Order resumed') }}>
              <RotateCcw className="h-3 w-3 mr-1" /> Resume Held ({heldOrders.length})
            </Button>
          )}
        </div>

        <div className="p-4 border-t space-y-1 shrink-0">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(breakdown.subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST</span><span>{formatCurrency(breakdown.gstAmount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">SGST</span><span>{formatCurrency(breakdown.sgstAmount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">CGST</span><span>{formatCurrency(breakdown.cgstAmount)}</span></div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(breakdown.total)}</span></div>
        </div>

        <div className="p-4 border-t shrink-0">
          <Button type="button" size="lg" className="w-full bg-foreground text-background hover:bg-foreground/90"
            disabled={cart.length === 0}
            onClick={() => setCheckoutOpen(true)}>
            Order Now
          </Button>
        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        orderType={orderType}
        tables={tables}
        selectedTableId={selectedTableId}
        taxSettings={taxSettings ?? DEFAULT_TAX_SETTINGS}
        onSuccess={handleOrderSuccess}
      />
      <ModifierSelectionDialog
        item={modifierItem}
        editingLine={editingLine}
        open={Boolean(modifierItem)}
        onOpenChange={(open) => { if (!open) { setModifierItem(null); setEditingLine(null) } }}
        onConfirm={handleModifierConfirm}
      />
    </div>
  )
}
