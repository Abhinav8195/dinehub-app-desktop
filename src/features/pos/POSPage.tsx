import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addToCart, removeFromCart, updateQuantity, updateItemNotes, clearCart, replaceCartItem,
  setOrderType, holdOrder, resumeOrder, discardHeldOrder, setSelectedTable,
  setViewMode, setPosMeta, setManualDiscount, markKotSent, startNewOrder,
} from '@/store/slices/posSlice'
import { addOrder } from '@/store/slices/ordersSlice'
import { formatCurrency } from '@/lib/utils'
import { calculateTaxBreakdown, DEFAULT_TAX_SETTINGS } from '@/lib/tax'
import { BRAND } from '@/constants/brand'
import { buildReceiptHtml } from '@/lib/print/receipt'
import { menuApi } from '@/api/menu.api'
import { combosApi } from '@/api/catalog.api'
import { tablesApi } from '@/api/tables.api'
import { settingsApi } from '@/api/settings.api'
import { useTaxSettings } from '@/hooks/useTaxSettings'
import { useAuth } from '@/hooks/useAuth'
import { withOfflineCache } from '@/lib/offline'
import { APP_BASE } from '@/constants/navigation'
import { CheckoutModal } from './components/CheckoutModal'
import { ModifierSelectionDialog } from './components/ModifierSelectionDialog'
import { PosHeader } from './components/PosHeader'
import { PosOrderMetaBar } from './components/PosOrderMetaBar'
import { PosCategoryRail } from './components/PosCategoryRail'
import { PosProductArea } from './components/PosProductArea'
import { PosCartPanel, type PosQuickPay } from './components/PosCartPanel'
import { PosTableFloorView } from './components/PosTableFloorView'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RootState } from '@/store'
import type { MenuItemDto, PosOrder, TableDto } from '@/api/types/pos.types'
import type { OrderItem } from '@/types'
import { findByShortCode, matchesMenuSearch } from './lib/menuSearch'
import { buildKotHtml } from './lib/kot'
import { STANDARD_FLOORS, tableDisplayLabel } from './lib/tableStatus'
import { usePosShortcuts } from './hooks/usePosShortcuts'

const CART_WIDTH_KEY = 'dinehub:pos-cart-width'
const MIN_CART_WIDTH = 280
const MAX_CART_WIDTH = 440

const getInitialCartWidth = () => {
  if (typeof window === 'undefined') return 320
  const stored = Number(window.localStorage.getItem(CART_WIDTH_KEY))
  return Number.isFinite(stored) ? Math.min(MAX_CART_WIDTH, Math.max(MIN_CART_WIDTH, stored)) : 320
}

export default function POSPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuth()
  const {
    cart, orderType, heldOrders, selectedTableId, viewMode, meta,
    discount, discountMode, discountValue, kotSentKeys,
  } = useSelector((s: RootState) => s.pos)
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount)

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [catalogView, setCatalogView] = useState<'items' | 'combos' | 'favorites'>('items')
  const [search, setSearch] = useState('')
  const [shortCode, setShortCode] = useState('')
  const [billSearch, setBillSearch] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPrint, setCheckoutPrint] = useState(true)
  const [checkoutEbill, setCheckoutEbill] = useState(false)
  const [quickPay, setQuickPay] = useState<PosQuickPay>('CASH')
  const [loyalty, setLoyalty] = useState(false)
  const [feedbackSms, setFeedbackSms] = useState(false)
  const [markedPaid, setMarkedPaid] = useState(true)
  const [holdPickerOpen, setHoldPickerOpen] = useState(false)
  const [holdFilter, setHoldFilter] = useState('')
  const [modifierItem, setModifierItem] = useState<MenuItemDto | null>(null)
  const [editingLine, setEditingLine] = useState<OrderItem | null>(null)
  const [cartWidth, setCartWidth] = useState(getInitialCartWidth)
  const cartWidthRef = useRef(cartWidth)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const shortCodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => { cartWidthRef.current = cartWidth }, [cartWidth])

  const startCartResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = cartWidthRef.current
    const resize = (moveEvent: PointerEvent) => {
      setCartWidth(Math.min(MAX_CART_WIDTH, Math.max(MIN_CART_WIDTH, startWidth + startX - moveEvent.clientX)))
    }
    const stop = () => {
      window.removeEventListener('pointermove', resize)
      window.removeEventListener('pointerup', stop)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.localStorage.setItem(CART_WIDTH_KEY, String(Math.round(cartWidthRef.current)))
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', resize)
    window.addEventListener('pointerup', stop)
  }

  const { data: taxSettings } = useTaxSettings()
  const { data: restaurant } = useQuery({ queryKey: ['settings', 'restaurant'], queryFn: settingsApi.getRestaurant })

  const { data: categories = [] } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => withOfflineCache('menu-categories', () => menuApi.listCategories()),
    staleTime: 60_000,
  })

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items', selectedCategory],
    queryFn: () => withOfflineCache(
      `menu-items:${selectedCategory || 'all'}`,
      () => menuApi.listItems(selectedCategory || undefined),
    ),
    staleTime: 60_000,
  })

  const { data: allMenuItems = [] } = useQuery({
    queryKey: ['menu-items', 'all-for-search'],
    queryFn: () => withOfflineCache('menu-items:all', () => menuApi.listItems()),
    staleTime: 60_000,
  })

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => withOfflineCache('tables', () => tablesApi.list()),
    staleTime: 15_000,
    refetchInterval: viewMode === 'tables' ? 10_000 : false,
  })

  // Auto-select first available table for dine-in (Petpooja-style fast start)
  useEffect(() => {
    if (orderType !== 'dine-in' || selectedTableId) return
    const first = tables.find((table) => String(table.status).toLowerCase() === 'available')
    if (!first) return
    dispatch(setSelectedTable(first.id))
    dispatch(setPosMeta({ selectedFloor: first.floor }))
  }, [dispatch, orderType, selectedTableId, tables])

  const { data: combos = [] } = useQuery({
    queryKey: ['combos', 'pos'],
    queryFn: () => withOfflineCache('combos', () => combosApi.list()),
    staleTime: 60_000,
  })

  const floors = useMemo(() => {
    const fromTables = tables.map((t) => t.floor).filter(Boolean)
    return [...new Set([...STANDARD_FLOORS, ...fromTables])]
  }, [tables])

  const filteredItems = useMemo(() => {
    let list = catalogView === 'favorites'
      ? allMenuItems.filter((item) => item.popular && item.available)
      : menuItems.filter((item) => item.available)
    if (search.trim()) list = list.filter((item) => matchesMenuSearch(item, search))
    return list
  }, [allMenuItems, catalogView, menuItems, search])

  const filteredCombos = useMemo(
    () => combos.filter((combo) => !search || combo.name.toLowerCase().includes(search.toLowerCase())),
    [combos, search],
  )

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const displayBreakdown = calculateTaxBreakdown(cartSubtotal, taxSettings ?? DEFAULT_TAX_SETTINGS)
  const displayTotal = Math.max(0, displayBreakdown.total - discount)

  const canAddItems = orderType !== 'dine-in' || Boolean(selectedTableId)
  const actionsDisabled = cart.length === 0 || (orderType === 'dine-in' && !selectedTableId)

  const handleAddItem = (item: MenuItemDto) => {
    if (!canAddItems) {
      toast.error('Select a table first for dine-in')
      dispatch(setViewMode('tables'))
      return
    }
    if (item.hasVariants || item.modifierGroups?.some((group) => group.isActive)) {
      setEditingLine(null)
      setModifierItem(item)
      return
    }
    dispatch(addToCart({
      id: item.id,
      lineKey: `menu:${item.id}:`,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
    }))
  }

  const handleAddCombo = (combo: { id: string; name: string; price: number }) => {
    if (!canAddItems) {
      toast.error('Select a table first for dine-in')
      return
    }
    dispatch(addToCart({
      id: combo.id,
      lineKey: `combo:${combo.id}`,
      comboId: combo.id,
      name: combo.name,
      price: combo.price,
      quantity: 1,
    }))
  }

  const handleShortCodeSubmit = () => {
    const pool = allMenuItems.length ? allMenuItems : menuItems
    const match = findByShortCode(pool, shortCode)
    if (!match) {
      toast.error(`No item for code ${shortCode || '—'}`)
      return
    }
    handleAddItem(match)
    setShortCode('')
    shortCodeRef.current?.focus()
  }

  const handleModifierConfirm = (line: OrderItem) => {
    if (editingLine) dispatch(replaceCartItem({ oldLineKey: editingLine.lineKey, item: line }))
    else dispatch(addToCart(line))
    setEditingLine(null)
  }

  const editModifiers = (line: OrderItem) => {
    const item = [...menuItems, ...allMenuItems].find((entry) => entry.id === line.menuItemId)
    if (!item) return
    setEditingLine(line)
    setModifierItem(item)
  }

  const openCheckout = (opts: { print: boolean; ebill?: boolean; forceSplit?: boolean }) => {
    if (actionsDisabled) {
      toast.error(orderType === 'dine-in' && !selectedTableId ? 'Select a table first' : 'Add items first')
      return
    }
    if (opts.forceSplit) setQuickPay('PART')
    setCheckoutPrint(opts.print)
    setCheckoutEbill(Boolean(opts.ebill))
    setCheckoutOpen(true)
  }

  const sendKot = async (alsoPrint: boolean) => {
    if (actionsDisabled) {
      toast.error('Add items and select table before KOT')
      return
    }
    const pending = cart.filter((line) => !kotSentKeys.includes(line.lineKey))
    if (!pending.length) {
      toast.message('No new items to send — already on KOT')
      return
    }
    const table = tables.find((row) => row.id === selectedTableId)
    const html = buildKotHtml({
      orderLabel: `Draft · ${pending.reduce((n, i) => n + i.quantity, 0)} new items`,
      tableLabel: table ? tableDisplayLabel(table) : undefined,
      orderType: orderType === 'dine-in' ? 'Dine In' : orderType === 'delivery' ? 'Delivery' : 'Pick Up',
      guestCount: meta.guestCount,
      waiterName: meta.waiterName || undefined,
      items: pending,
      restaurantName: String(restaurant?.name || BRAND.name),
    })

    if (alsoPrint || window.electronAPI?.print?.kitchen) {
      try {
        if (window.electronAPI?.print?.kitchen) await window.electronAPI.print.kitchen(html)
        else if (window.electronAPI?.printReceipt) await window.electronAPI.printReceipt(html)
        else {
          const win = window.open('', '_blank', 'width=400,height=600')
          if (win) {
            win.document.write(html)
            win.document.close()
            win.focus()
            win.print()
          }
        }
      } catch {
        toast.error('KOT print failed — items still marked sent locally')
      }
    }

    dispatch(markKotSent(pending.map((line) => line.lineKey)))
    toast.success(`KOT sent · ${pending.length} line${pending.length === 1 ? '' : 's'} (pay later to save order)`)
  }

  const handleOrderSuccess = (orderNumber: string, total: number, paymentMethod: string, serverOrder?: PosOrder) => {
    const offline = orderNumber.startsWith('OFF-')
    toast.success(
      offline
        ? `Offline order ${orderNumber} saved — ${formatCurrency(total)}`
        : `Order ${orderNumber} · ${formatCurrency(total)}`,
    )
    if (checkoutEbill) toast.message('eBill: share receipt from Orders when SMS/WhatsApp is enabled')

    const finalSubtotal = serverOrder?.subtotal ?? cartSubtotal
    const finalTax = serverOrder
      ? serverOrder.gstAmount + serverOrder.sgstAmount + serverOrder.cgstAmount
      : displayBreakdown.gstAmount + displayBreakdown.sgstAmount + displayBreakdown.cgstAmount

    dispatch(addOrder({
      id: serverOrder?.id ?? orderNumber,
      orderNumber,
      type: orderType,
      status: serverOrder?.status ?? 'confirmed',
      items: [...cart],
      subtotal: finalSubtotal,
      tax: finalTax,
      discount: (serverOrder?.discount ?? 0) + discount,
      total,
      tableId: selectedTableId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    if (checkoutPrint && window.electronAPI?.printReceipt) {
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
        customerName: serverOrder?.customer?.name || meta.customerName || undefined,
        table: serverOrder?.table?.label || (tables.find((t) => t.id === selectedTableId) ? tableDisplayLabel(tables.find((t) => t.id === selectedTableId)!) : undefined),
        orderType: orderType === 'dine-in' ? 'Dine In' : orderType === 'delivery' ? 'Delivery' : 'Pick Up',
        items: cart.map((i) => ({
          name: `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`,
          qty: i.quantity,
          price: i.price,
        })),
        subtotal: finalSubtotal,
        taxes: serverOrder ? [
          { name: 'GST', rate: taxSettings?.gstPercent, amount: serverOrder.gstAmount },
          { name: 'SGST', rate: taxSettings?.sgstPercent, amount: serverOrder.sgstAmount },
          { name: 'CGST', rate: taxSettings?.cgstPercent, amount: serverOrder.cgstAmount },
        ].filter((tax) => tax.amount > 0) : [{ name: 'Tax', amount: finalTax }],
        discount: (serverOrder?.discount ?? 0) + discount,
        total,
        paymentMethod,
        footerText: typeof restaurant?.receiptFooter === 'string' ? restaurant.receiptFooter : undefined,
        date: serverOrder?.createdAt,
      })
      window.electronAPI.printReceipt(html).catch(() => {})
    }

    dispatch(clearCart())
    dispatch(setSelectedTable(null))
    setLoyalty(false)
    setFeedbackSms(false)
    setMarkedPaid(true)
    setQuickPay('CASH')
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['tables'] })
  }

  const lastLine = cart[cart.length - 1]

  usePosShortcuts({
    onNewOrder: () => {
      dispatch(startNewOrder())
      toast.success('New order')
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onSave: () => openCheckout({ print: false }),
    onPrint: () => openCheckout({ print: true }),
    onKot: () => { void sendKot(true) },
    onIncreaseQty: () => {
      if (!lastLine) return
      dispatch(updateQuantity({ id: lastLine.lineKey, quantity: lastLine.quantity + 1 }))
    },
    onDecreaseQty: () => {
      if (!lastLine) return
      dispatch(updateQuantity({ id: lastLine.lineKey, quantity: Math.max(1, lastLine.quantity - 1) }))
    },
  })

  const handleBillSearch = () => {
    const q = billSearch.trim()
    if (!q) return
    navigate(`${APP_BASE}/orders?search=${encodeURIComponent(q)}`)
  }

  const onStartTableOrder = (table: TableDto) => {
    dispatch(setOrderType('dine-in'))
    dispatch(setSelectedTable(table.id))
    dispatch(setPosMeta({ selectedFloor: table.floor }))
    dispatch(setViewMode('order'))
    toast.success(`Table ${table.number} selected`)
  }

  const filteredHeld = heldOrders.filter((held) => {
    if (!holdFilter.trim()) return true
    const q = holdFilter.toLowerCase()
    return (held.label || '').toLowerCase().includes(q)
      || held.cart.some((line) => line.name.toLowerCase().includes(q))
  })

  const checkoutCustomerSeed = {
    firstName: meta.customerName.split(/\s+/)[0] || '',
    lastName: meta.customerName.split(/\s+/).slice(1).join(' ') || '',
    phone: meta.customerPhone,
    instructions: [
      orderType === 'delivery' ? meta.deliveryAddress : '',
      meta.deliveryNotes,
      meta.pickupTime ? `Pickup: ${meta.pickupTime}` : '',
      meta.waiterName ? `Waiter: ${meta.waiterName}` : '',
      meta.guestCount ? `Guests: ${meta.guestCount}` : '',
    ].filter(Boolean).join(' · '),
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <PosHeader
        userName={user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}
        unreadCount={unreadCount}
        billSearch={billSearch}
        onBillSearchChange={setBillSearch}
        onBillSearchSubmit={handleBillSearch}
        onNewOrder={() => { dispatch(startNewOrder()); toast.success('New order started') }}
        onOpenTables={() => dispatch(setViewMode(viewMode === 'tables' ? 'order' : 'tables'))}
        onOpenMenu={() => navigate(`${APP_BASE}/dashboard`)}
        onLogout={() => { void logout() }}
        viewMode={viewMode}
      />

      {viewMode === 'tables' ? (
        <PosTableFloorView
          tables={tables}
          selectedTableId={selectedTableId}
          selectedFloor={meta.selectedFloor}
          onFloorChange={(floor) => dispatch(setPosMeta({ selectedFloor: floor }))}
          onSelectTable={(table) => {
            if (normalizeAvailable(table)) dispatch(setSelectedTable(table.id))
          }}
          onStartOrder={onStartTableOrder}
          onRefresh={() => { void queryClient.invalidateQueries({ queryKey: ['tables'] }) }}
        />
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <PosCategoryRail
            categories={categories}
            selectedCategory={selectedCategory}
            catalogView={catalogView}
            onSelectAll={() => { setCatalogView('items'); setSelectedCategory(null) }}
            onSelectFavorites={() => { setCatalogView('favorites'); setSelectedCategory(null) }}
            onSelectCategory={(id) => { setCatalogView('items'); setSelectedCategory(id) }}
            onSelectCombos={() => setCatalogView('combos')}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <PosOrderMetaBar
              orderType={orderType}
              onOrderTypeChange={(type) => {
                dispatch(setOrderType(type))
                if (type !== 'dine-in') dispatch(setSelectedTable(null))
              }}
              meta={meta}
              onMetaChange={(patch) => dispatch(setPosMeta(patch))}
              tables={tables}
              selectedTableId={selectedTableId}
              onTableChange={(id) => dispatch(setSelectedTable(id))}
              floors={floors}
            />

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <PosProductArea
                catalogView={catalogView}
                categories={categories}
                items={filteredItems}
                combos={filteredCombos}
                search={search}
                shortCode={shortCode}
                onSearchChange={setSearch}
                onShortCodeChange={setShortCode}
                onShortCodeSubmit={handleShortCodeSubmit}
                searchInputRef={searchInputRef}
                shortCodeRef={shortCodeRef}
                disabledAdd={!canAddItems}
                onAddItem={handleAddItem}
                onAddCombo={handleAddCombo}
              />

              <PosCartPanel
                cart={cart}
                cartWidth={cartWidth}
                onResizeStart={startCartResize}
                kotSentKeys={kotSentKeys}
                discountMode={discountMode}
                discountValue={discountValue}
                discountAmount={discount}
                total={displayTotal}
                actionsDisabled={actionsDisabled}
                heldCount={heldOrders.length}
                quickPay={quickPay}
                loyalty={loyalty}
                feedbackSms={feedbackSms}
                markedPaid={markedPaid}
                onQuantity={(lineKey, quantity) => dispatch(updateQuantity({ id: lineKey, quantity }))}
                onRemove={(lineKey) => dispatch(removeFromCart(lineKey))}
                onEditModifiers={editModifiers}
                onNotes={(lineKey, notes) => dispatch(updateItemNotes({ lineKey, notes }))}
                onDiscountMode={(mode, value) => dispatch(setManualDiscount({ mode, value }))}
                onQuickPay={(method) => {
                  setQuickPay(method)
                  setMarkedPaid(method !== 'DUE')
                }}
                onToggleLoyalty={() => {
                  setLoyalty((v) => {
                    const next = !v
                    toast.message(next ? 'Loyalty flagged on bill notes' : 'Loyalty cleared')
                    return next
                  })
                }}
                onToggleFeedbackSms={() => {
                  setFeedbackSms((v) => {
                    const next = !v
                    toast.message(next ? 'Feedback SMS flagged' : 'Feedback SMS cleared')
                    return next
                  })
                }}
                onToggleMarkedPaid={() => setMarkedPaid((v) => !v)}
                onSave={() => openCheckout({ print: false })}
                onSavePrint={() => openCheckout({ print: true })}
                onSaveEbill={() => openCheckout({ print: true, ebill: true })}
                onKot={() => { void sendKot(false) }}
                onKotPrint={() => { void sendKot(true) }}
                onHold={() => {
                  if (!cart.length) return
                  dispatch(holdOrder())
                  toast.success('Order held')
                }}
                onOpenHeld={() => setHoldPickerOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        orderType={orderType}
        tables={tables}
        selectedTableId={selectedTableId}
        taxSettings={taxSettings ?? DEFAULT_TAX_SETTINGS}
        manualDiscount={discount}
        initialPayMethod={
          quickPay === 'PART' ? 'SPLIT'
            : quickPay === 'OTHER' ? 'OTHER'
              : quickPay === 'DUE' ? 'DUE'
                : !markedPaid ? 'DUE'
                  : quickPay
        }
        loyalty={loyalty}
        feedbackSms={feedbackSms}
        customerSeed={checkoutCustomerSeed}
        onSuccess={handleOrderSuccess}
      />

      <ModifierSelectionDialog
        item={modifierItem}
        editingLine={editingLine}
        open={Boolean(modifierItem)}
        onOpenChange={(open) => { if (!open) { setModifierItem(null); setEditingLine(null) } }}
        onConfirm={handleModifierConfirm}
      />

      <Dialog open={holdPickerOpen} onOpenChange={setHoldPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Held orders</DialogTitle>
            <DialogDescription>Resume a held ticket into the cart.</DialogDescription>
          </DialogHeader>
          <Input
            value={holdFilter}
            onChange={(e) => setHoldFilter(e.target.value)}
            placeholder="Search held orders"
            className="mb-2"
          />
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {filteredHeld.map((held) => (
              <div key={held.id} className="flex items-center gap-2 rounded-xl border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{held.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(held.timestamp).toLocaleTimeString()} · {held.cart.slice(0, 2).map((l) => l.name).join(', ')}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={() => {
                  dispatch(resumeOrder(held.id))
                  setHoldPickerOpen(false)
                  toast.success('Resumed')
                }}>
                  Resume
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => {
                  dispatch(discardHeldOrder(held.id))
                }}>
                  Delete
                </Button>
              </div>
            ))}
            {!filteredHeld.length && <p className="py-6 text-center text-sm text-muted-foreground">No held orders</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function normalizeAvailable(table: TableDto) {
  return String(table.status).toLowerCase() === 'available'
}
