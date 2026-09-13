import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addToCart, removeFromCart, updateQuantity, updateItemNotes, clearCart, replaceCartItem,
  setOrderType, holdOrder, resumeOrder, discardHeldOrder, setSelectedTable, setActiveOrder, bindTableSession,
  loadRunningBill, setViewMode, setPosMeta, setManualDiscount, markKotSent, resetKotSent, startNewOrder,
} from '@/store/slices/posSlice'
import { addOrder } from '@/store/slices/ordersSlice'
import { formatCurrency } from '@/lib/utils'
import { calculateTaxBreakdown, DEFAULT_TAX_SETTINGS } from '@/lib/tax'
import { BRAND } from '@/constants/brand'
import { buildReceiptHtml, buildKotReceiptHtml } from '@/lib/print/receipt'
import { printKotReceiptHtml, printReceiptHtml } from '@/lib/print/print-jobs'
import { menuApi } from '@/api/menu.api'
import { combosApi } from '@/api/catalog.api'
import { tablesApi } from '@/api/tables.api'
import { ordersApi } from '@/api/orders.api'
import { settingsApi } from '@/api/settings.api'
import { formatApiError } from '@/api/management-utils'
import { useTaxSettings } from '@/hooks/useTaxSettings'
import { useAuth } from '@/hooks/useAuth'
import { checkOnline } from '@/api/client'
import { withOfflineCache, enqueueSync, isNetworkFailure, cacheSet } from '@/lib/offline'
import { APP_BASE } from '@/constants/navigation'
import { CheckoutModal } from './components/CheckoutModal'
import { ModifierSelectionDialog } from './components/ModifierSelectionDialog'
import { PosHeader, type PosLayoutMode } from './components/PosHeader'
import { PosOrderMetaBar } from './components/PosOrderMetaBar'
import { PosCategoryRail } from './components/PosCategoryRail'
import { PosProductArea } from './components/PosProductArea'
import { PosCartPanel, type PosQuickPay } from './components/PosCartPanel'
import { PosNormalLayout } from './components/PosNormalLayout'
import { PosTableFloorView } from './components/PosTableFloorView'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RootState } from '@/store'
import { store } from '@/store'
import type { MenuItemDto, PosOrder, TableDto } from '@/api/types/pos.types'
import type { OrderItem } from '@/types'
import { findByShortCode, matchesMenuSearch } from './lib/menuSearch'
import { floorsFromTables, normalizeTableStatus, tableDisplayLabel } from './lib/tableStatus'
import { mapPosOrderItemsToCart } from './lib/mapOrderToCart'
import { usePosShortcuts } from './hooks/usePosShortcuts'

const CART_WIDTH_KEY = 'dinehub:pos-cart-width'
const LAYOUT_MODE_KEY = 'dinehub:pos-layout-mode'
const MIN_CART_WIDTH = 280
const MAX_CART_WIDTH = 440

const getInitialCartWidth = () => {
  if (typeof window === 'undefined') return 320
  const stored = Number(window.localStorage.getItem(CART_WIDTH_KEY))
  return Number.isFinite(stored) ? Math.min(MAX_CART_WIDTH, Math.max(MIN_CART_WIDTH, stored)) : 320
}

const getInitialLayoutMode = (): PosLayoutMode => {
  if (typeof window === 'undefined') return 'fast'
  const stored = window.localStorage.getItem(LAYOUT_MODE_KEY)
  return stored === 'normal' ? 'normal' : 'fast'
}

export default function POSPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout } = useAuth()
  const {
    cart, orderType, heldOrders, selectedTableId, activeOrderId, activeOrderNumber, viewMode, meta,
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
  const [kotBusy, setKotBusy] = useState(false)
  const [cartWidth, setCartWidth] = useState(getInitialCartWidth)
  const [layoutMode, setLayoutMode] = useState<PosLayoutMode>(getInitialLayoutMode)
  const cartWidthRef = useRef(cartWidth)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const shortCodeRef = useRef<HTMLInputElement>(null)

  // POS stays light — dark theme makes counter billing hard to read.
  useEffect(() => {
    document.documentElement.dataset.forceLight = '1'
    document.documentElement.classList.remove('dark')
    return () => {
      delete document.documentElement.dataset.forceLight
      document.documentElement.classList.toggle('dark', store.getState().app.darkMode)
    }
  }, [])

  useEffect(() => { cartWidthRef.current = cartWidth }, [cartWidth])

  const handleLayoutModeChange = (mode: PosLayoutMode) => {
    setLayoutMode(mode)
    window.localStorage.setItem(LAYOUT_MODE_KEY, mode)
    if (mode === 'normal') dispatch(setViewMode('order'))
  }

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
  const { data: restaurant } = useQuery({
    queryKey: ['settings', 'restaurant'],
    queryFn: settingsApi.getRestaurant,
    staleTime: 60_000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => withOfflineCache('menu-categories', () => menuApi.listCategories()),
    staleTime: 60_000,
  })

  // Single menu catalog — filter by category / favorites / search client-side.
  const { data: allMenuItems = [] } = useQuery({
    queryKey: ['menu-items', 'all-for-search'],
    queryFn: () => withOfflineCache('menu-items:all', () => menuApi.listItems()),
    staleTime: 60_000,
  })

  const menuItems = useMemo(() => {
    if (!selectedCategory) return allMenuItems
    return allMenuItems.filter((item) => item.categoryId === selectedCategory)
  }, [allMenuItems, selectedCategory])

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => withOfflineCache('tables', () => tablesApi.list()),
    staleTime: 5_000,
    refetchInterval: viewMode === 'tables' ? 10_000 : false,
    refetchOnWindowFocus: true,
  })

  // Do not auto-pick a table — New Order / post-KOT always show the floor plan
  // so staff can choose any table, including occupied (running bill).

  const { data: combos = [] } = useQuery({
    queryKey: ['combos', 'pos'],
    queryFn: () => withOfflineCache('combos', () => combosApi.list()),
    staleTime: 60_000,
  })

  const tableFloors = useMemo(() => floorsFromTables(tables), [tables])

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
  const actionsDisabled = (cart.length === 0 && !activeOrderId) || (orderType === 'dine-in' && !selectedTableId)
  const kotDisabled = kotBusy || cart.filter((line) => !kotSentKeys.includes(line.lineKey)).length === 0
    || (orderType === 'dine-in' && !selectedTableId)

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
    if (cart.length === 0 && !activeOrderId) {
      toast.error('Add items first')
      return
    }
    if (orderType === 'dine-in' && !selectedTableId && !activeOrderId) {
      toast.error('Select a table first')
      return
    }
    if (opts.forceSplit) setQuickPay('PART')
    setCheckoutPrint(opts.print)
    setCheckoutEbill(Boolean(opts.ebill))
    setCheckoutOpen(true)
  }

  const toApiItems = (lines: OrderItem[]) =>
    lines.map((item) => ({
      ...(item.menuItemId
        ? {
            menuItemId: item.menuItemId,
            variantId: item.variantId,
            modifierOptionIds: item.modifiers?.map((modifier) => modifier.id) ?? [],
          }
        : item.comboId
          ? { comboId: item.comboId }
          : { name: item.name, unitPrice: item.price }),
      quantity: item.quantity,
      notes: item.notes,
    }))

  const printKotTicket = async (pending: OrderItem[], order: PosOrder) => {
    const table = tables.find((row) => row.id === selectedTableId)
    const subtotal = pending.reduce((sum, line) => sum + line.price * line.quantity, 0)
    const html = buildKotReceiptHtml({
      orderNumber: order.orderNumber,
      restaurant: {
        name: String(restaurant?.name || BRAND.name),
        logoUrl: typeof restaurant?.logoUrl === 'string' ? restaurant.logoUrl : undefined,
        showLogo: restaurant?.receiptLogoEnabled !== false,
        address: typeof restaurant?.address === 'string' ? restaurant.address : undefined,
        phone: typeof restaurant?.phone === 'string' ? restaurant.phone : undefined,
        gstin: typeof restaurant?.gstin === 'string' ? restaurant.gstin : undefined,
      },
      customerName: meta.customerName || undefined,
      table: table ? tableDisplayLabel(table) : undefined,
      orderType: orderType === 'dine-in' ? 'Dine In' : orderType === 'delivery' ? 'Delivery' : 'Pick Up',
      waiterName: meta.waiterName || undefined,
      guestCount: meta.guestCount,
      items: pending.map((line) => ({
        name: `${line.name}${line.variantName ? ` (${line.variantName})` : ''}`,
        qty: line.quantity,
        price: line.price,
        amount: line.price * line.quantity,
        notes: line.notes,
        modifiers: line.modifiers,
      })),
      subtotal,
      total: subtotal,
      footerText: typeof restaurant?.receiptFooter === 'string' ? restaurant.receiptFooter : undefined,
      date: order.createdAt,
    })
    await printKotReceiptHtml(html)
  }

  const sendKot = async (alsoPrint: boolean) => {
    if (kotBusy) return
    if (orderType === 'dine-in' && !selectedTableId) {
      toast.error('Select a table before KOT')
      return
    }
    const pending = cart.filter((line) => !kotSentKeys.includes(line.lineKey))
    if (!pending.length) {
      toast.message('No new items to send — already on KOT')
      return
    }

    setKotBusy(true)
    try {
      const items = toApiItems(pending)
      const table = tables.find((row) => row.id === selectedTableId)
      const boundOrderId = activeOrderId || table?.currentOrder?.id || null

      const createPayload = {
        type: orderType === 'dine-in' ? 'DINE_IN' as const : orderType === 'delivery' ? 'DELIVERY' as const : 'TAKEAWAY' as const,
        items,
        tableId: orderType === 'dine-in' ? selectedTableId || undefined : undefined,
        firstName: meta.customerName.split(/\s+/)[0] || undefined,
        lastName: meta.customerName.split(/\s+/).slice(1).join(' ') || undefined,
        phone: meta.customerPhone || undefined,
        instructions: [
          orderType === 'delivery' ? meta.deliveryAddress : '',
          meta.deliveryNotes,
          meta.waiterName ? `Waiter: ${meta.waiterName}` : '',
          meta.guestCount ? `Guests: ${meta.guestCount}` : '',
          'KOT — payment pending',
        ].filter(Boolean).join(' · ') || undefined,
      }

      const buildOfflineKotOrder = (): PosOrder => {
        const id = boundOrderId || crypto.randomUUID()
        const orderNumber = boundOrderId && activeOrderNumber && !activeOrderNumber.startsWith('OFF-')
          ? activeOrderNumber
          : `OFF-${Date.now().toString().slice(-6)}`
        const now = new Date().toISOString()
        const subtotal = pending.reduce((sum, line) => sum + line.price * line.quantity, 0)
        return {
          id,
          orderNumber,
          type: createPayload.type,
          status: 'confirmed',
          subtotal,
          gstAmount: 0,
          sgstAmount: 0,
          cgstAmount: 0,
          serviceCharge: 0,
          discount: 0,
          voucherDiscount: 0,
          total: subtotal,
          tax: 0,
          instructions: createPayload.instructions || null,
          paymentMethod: null,
          paymentStatus: 'pending',
          tableId: selectedTableId,
          table: table
            ? { id: table.id, label: `T-${table.number}`, number: table.number, floor: table.floor }
            : null,
          customer: meta.customerName || meta.customerPhone
            ? {
                id: `local-${id}`,
                name: meta.customerName || 'Walk-in',
                phone: meta.customerPhone || '',
                email: null,
              }
            : null,
          items: pending.map((line) => ({
            id: line.id,
            menuItemId: line.menuItemId,
            variantId: line.variantId,
            variantName: line.variantName,
            comboId: line.comboId,
            name: line.name,
            quantity: line.quantity,
            price: line.price,
            total: line.price * line.quantity,
            notes: line.notes,
            modifiers: line.modifiers ?? [],
          })),
          createdAt: now,
          updatedAt: now,
        }
      }

      const saveKotOffline = async () => {
        if (boundOrderId) {
          await enqueueSync({
            method: 'POST',
            url: `/orders/${boundOrderId}/items`,
            body: { items },
            resource: 'orders',
            operation: 'update',
          })
        } else {
          await enqueueSync({
            method: 'POST',
            url: '/orders',
            body: createPayload,
            resource: 'orders',
            operation: 'create',
          })
        }
        return buildOfflineKotOrder()
      }

      let order: PosOrder
      const online = await checkOnline().catch(() => navigator.onLine)
      if (!online) {
        order = await saveKotOffline()
      } else {
        try {
          if (boundOrderId) {
            order = await ordersApi.addItems(boundOrderId, { items })
          } else {
            order = await ordersApi.create(createPayload)
          }
        } catch (error) {
          if (!isNetworkFailure(error)) throw error
          order = await saveKotOffline()
        }
      }

      const kotTableId = selectedTableId || order.tableId || order.table?.id || null
      const offline = order.orderNumber.startsWith('OFF-')
      const occupiedPatch = (prev: TableDto[] = []): TableDto[] =>
        prev.map((t) =>
          t.id === kotTableId
            ? {
                ...t,
                status: 'occupied',
                currentOrder: {
                  id: order.id,
                  orderNumber: order.orderNumber,
                  status: order.status || 'confirmed',
                  customerName: meta.customerName || order.customer?.name || 'Walk-in',
                  total: order.total,
                  createdAt: order.createdAt || new Date().toISOString(),
                },
              }
            : t,
        )

      // 1) Mark occupied in UI cache immediately (before print / redirect).
      if (kotTableId) {
        queryClient.setQueryData<TableDto[]>(['tables'], occupiedPatch)
      }

      // 2) Redirect to table floor RIGHT AWAY — never wait on printer dialog.
      dispatch(markKotSent(pending.map((line) => line.lineKey)))
      toast.success(
        alsoPrint
          ? offline
            ? `Offline KOT + print · ${order.orderNumber} (syncs when online)`
            : `KOT + print · ${order.orderNumber}`
          : offline
            ? `Offline KOT · ${order.orderNumber} (syncs when online)`
            : orderType === 'dine-in' && selectedTableId
              ? `KOT sent · ${order.orderNumber} · table booked — add more anytime`
              : `KOT sent · ${order.orderNumber}`,
      )
      dispatch(startNewOrder())

      // 3) Print in background so OS print dialog cannot block table redirect.
      if (alsoPrint) {
        void printKotTicket(pending, order).catch((error) => {
          toast.error(error instanceof Error ? error.message : 'KOT print failed')
        })
      }

      // 4) Persist OCCUPIED + refresh tables without letting stale offline cache win.
      void (async () => {
        if (kotTableId && !offline) {
          await tablesApi.updateStatus(kotTableId, 'OCCUPIED').catch(() => {})
        }
        try {
          const fresh = await tablesApi.list()
          const merged = occupiedPatch(Array.isArray(fresh) ? fresh : [])
          queryClient.setQueryData(['tables'], merged)
          await cacheSet('tables', merged).catch(() => {})
        } catch {
          queryClient.setQueryData<TableDto[]>(['tables'], occupiedPatch)
        }
        queryClient.invalidateQueries({ queryKey: ['orders'] })
      })()
    } catch (error) {
      toast.error(formatApiError(error, 'Could not send KOT'))
    } finally {
      setKotBusy(false)
    }
  }

  const handleOrderSuccess = async (orderNumber: string, total: number, paymentMethod: string, serverOrder?: PosOrder) => {
    const offline = orderNumber.startsWith('OFF-')
    const paidTableId = selectedTableId || serverOrder?.tableId || serverOrder?.table?.id || null
    const freeTable = Boolean(paidTableId && !offline && paymentMethod !== 'DUE')

    const freePatch = (prev: TableDto[] = []): TableDto[] =>
      prev.map((t) =>
        t.id === paidTableId
          ? { ...t, status: 'available', currentOrder: null }
          : t,
      )

    // Free table in UI immediately so floor plan is green before any print/refetch.
    if (freeTable) {
      queryClient.setQueryData<TableDto[]>(['tables'], freePatch)
    }

    toast.success(
      offline
        ? `Offline order ${orderNumber} saved — ${formatCurrency(total)}`
        : `Paid · ${orderNumber} · ${formatCurrency(total)}${paidTableId ? ' · table free' : ''}`,
    )
    if (checkoutEbill) toast.message('eBill: share receipt from Orders when SMS/WhatsApp is enabled')

    const finalSubtotal = serverOrder?.subtotal ?? cartSubtotal
    const finalTax = serverOrder
      ? serverOrder.gstAmount + serverOrder.sgstAmount + serverOrder.cgstAmount
      : displayBreakdown.gstAmount + displayBreakdown.sgstAmount + displayBreakdown.cgstAmount

    const cartSnapshot = [...cart]
    const metaSnapshot = { ...meta }
    const taxSnapshot = taxSettings
    const discountSnapshot = discount
    const checkoutPrintSnapshot = checkoutPrint

    dispatch(addOrder({
      id: serverOrder?.id ?? orderNumber,
      orderNumber,
      type: orderType,
      status: serverOrder?.status ?? 'confirmed',
      items: cartSnapshot,
      subtotal: finalSubtotal,
      tax: finalTax,
      discount: (serverOrder?.discount ?? 0) + discountSnapshot,
      total,
      tableId: paidTableId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    // Redirect to table selector immediately — do not wait on printer or status API.
    dispatch(startNewOrder())
    setLoyalty(false)
    setFeedbackSms(false)
    setMarkedPaid(true)
    setQuickPay('CASH')

    if (checkoutPrintSnapshot) {
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
        customerName: serverOrder?.customer?.name || metaSnapshot.customerName || undefined,
        table: serverOrder?.table?.label
          || (paidTableId && tables.find((t) => t.id === paidTableId)
            ? tableDisplayLabel(tables.find((t) => t.id === paidTableId)!)
            : undefined),
        orderType: orderType === 'dine-in' ? 'Dine In' : orderType === 'delivery' ? 'Delivery' : 'Pick Up',
        items: cartSnapshot.map((i) => ({
          name: `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`,
          qty: i.quantity,
          price: i.price,
        })),
        subtotal: finalSubtotal,
        taxes: serverOrder ? [
          { name: 'GST', rate: taxSnapshot?.gstPercent, amount: serverOrder.gstAmount },
          { name: 'SGST', rate: taxSnapshot?.sgstPercent, amount: serverOrder.sgstAmount },
          { name: 'CGST', rate: taxSnapshot?.cgstPercent, amount: serverOrder.cgstAmount },
        ].filter((tax) => tax.amount > 0) : [{ name: 'Tax', amount: finalTax }],
        discount: (serverOrder?.discount ?? 0) + discountSnapshot,
        total,
        paymentMethod,
        footerText: typeof restaurant?.receiptFooter === 'string' ? restaurant.receiptFooter : undefined,
        date: serverOrder?.createdAt,
      })
      void printReceiptHtml(html).catch(() => {})
    }

    void (async () => {
      if (freeTable && paidTableId) {
        await tablesApi.updateStatus(paidTableId, 'AVAILABLE').catch(() => {})
      }
      try {
        const fresh = await tablesApi.list()
        const merged = freeTable ? freePatch(Array.isArray(fresh) ? fresh : []) : (Array.isArray(fresh) ? fresh : [])
        queryClient.setQueryData(['tables'], merged)
        await cacheSet('tables', merged).catch(() => {})
      } catch {
        if (freeTable) queryClient.setQueryData<TableDto[]>(['tables'], freePatch)
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    })()
  }

  const lastLine = cart[cart.length - 1]

  usePosShortcuts({
    onNewOrder: () => {
      dispatch(startNewOrder())
      toast.success('Select a table')
    },
    onFocusSearch: () => searchInputRef.current?.focus(),
    onSave: () => openCheckout({ print: false }),
    onPrint: () => openCheckout({ print: true }),
    onKot: () => { void sendKot(false) },
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

  const openRunningTable = async (table: TableDto) => {
    let orderId = table.currentOrder?.id
    const isOccupied = Boolean(table.currentOrder)
      || normalizeTableStatus(table.status) === 'occupied'

    // If table is occupied but currentOrder was not attached directly, query active orders for this table
    if (!orderId && isOccupied) {
      try {
        const listResult = await ordersApi.list({ limit: 50 })
        const running = (listResult.orders || []).find(
          (o) => (o.tableId === table.id || o.table?.id === table.id)
            && String(o.paymentStatus || '').toLowerCase() !== 'paid'
            && o.status !== 'cancelled'
            && o.status !== 'refunded',
        )
        if (running) {
          orderId = running.id
        }
      } catch {
        // continue with empty session
      }
    }

    if (!orderId) {
      dispatch(bindTableSession({
        tableId: table.id,
        floor: table.floor,
      }))
      toast.success(`Table ${table.number} selected`)
      return
    }

    try {
      const order = await ordersApi.get(orderId)
      const cartLines = mapPosOrderItemsToCart(order)
      const guestMatch = order.instructions?.match(/Guests?:\s*(\d+)/i)
      dispatch(loadRunningBill({
        tableId: table.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        floor: table.floor,
        cart: cartLines,
        guestCount: guestMatch ? Number(guestMatch[1]) || 2 : 2,
        customerName: order.customer?.name || table.currentOrder?.customerName || '',
        customerPhone: order.customer?.phone || '',
      }))
      toast.success(
        cartLines.length
          ? `${tableDisplayLabel(table)} · ${order.orderNumber} · ${cartLines.length} item(s) · ${formatCurrency(order.total)}`
          : `${tableDisplayLabel(table)} · ${order.orderNumber} — running bill open`,
      )
    } catch (error) {
      // Keep table selected but never keep the previous table's cart.
      dispatch(bindTableSession({
        tableId: table.id,
        floor: table.floor,
      }))
      toast.error(formatApiError(error, 'Could not load running bill — add items or try again'))
    }
  }

  const onStartTableOrder = (table: TableDto) => {
    void openRunningTable(table)
  }

  /** Fast POS table dropdown — always reset cart, then load new table session / running bill. */
  const handleTableDropdownChange = (id: string | null) => {
    if (!id) {
      dispatch(clearCart())
      dispatch(setSelectedTable(null))
      dispatch(setActiveOrder({ id: null, orderNumber: null }))
      return
    }
    if (id === selectedTableId) return

    const table = tables.find((row) => row.id === id)
    if (!table) {
      dispatch(clearCart())
      dispatch(setSelectedTable(id))
      dispatch(setActiveOrder({ id: null, orderNumber: null }))
      return
    }

    const pendingUnsent = cart.some((line) => !kotSentKeys.includes(line.lineKey))
    if (pendingUnsent && selectedTableId) {
      toast.message('Switching table — previous cart cleared')
    }

    // Sync clear first so old KOT items never linger on the new table.
    dispatch(bindTableSession({
      tableId: table.id,
      floor: table.floor || meta.selectedFloor,
    }))

    // Occupied / running table → load that bill into cart; available stays empty.
    if (table.currentOrder || normalizeTableStatus(table.status) === 'occupied') {
      void openRunningTable(table)
    } else {
      toast.success(`Table ${table.number} selected — cart cleared`)
    }
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <PosHeader
        userName={user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}
        unreadCount={unreadCount}
        billSearch={billSearch}
        onBillSearchChange={setBillSearch}
        onBillSearchSubmit={handleBillSearch}
        onNewOrder={() => {
          dispatch(startNewOrder())
          toast.success('Select a table — available and occupied shown')
        }}
        onOpenTables={() => dispatch(setViewMode(viewMode === 'tables' ? 'order' : 'tables'))}
        onOpenMenu={() => navigate(`${APP_BASE}/dashboard`)}
        onLogout={() => { void logout() }}
        viewMode={viewMode}
        layoutMode={layoutMode}
        onLayoutModeChange={handleLayoutModeChange}
      />

      {layoutMode === 'normal' ? (
        <PosNormalLayout
          categories={categories}
          catalogView={catalogView === 'favorites' ? 'items' : catalogView}
          selectedCategory={selectedCategory}
          onSelectAll={() => { setCatalogView('items'); setSelectedCategory(null) }}
          onSelectCategory={(id) => { setCatalogView('items'); setSelectedCategory(id) }}
          onSelectCombos={() => setCatalogView('combos')}
          orderType={orderType}
          onOrderTypeChange={(type) => {
            dispatch(setOrderType(type))
            if (type !== 'dine-in') dispatch(setSelectedTable(null))
          }}
          tables={tables}
          selectedTableId={selectedTableId}
          onTableChange={handleTableDropdownChange}
          search={search}
          onSearchChange={setSearch}
          items={filteredItems}
          combos={filteredCombos}
          canAddItems={canAddItems}
          onAddItem={handleAddItem}
          onAddCombo={handleAddCombo}
          cart={cart}
          cartWidth={cartWidth}
          onResizeStart={startCartResize}
          onQuantity={(lineKey, quantity) => dispatch(updateQuantity({ id: lineKey, quantity }))}
          onRemove={(lineKey) => dispatch(removeFromCart(lineKey))}
          onEditModifiers={editModifiers}
          onHold={() => {
            if (!cart.length) return
            dispatch(holdOrder())
            toast.success('Order held')
          }}
          onClearCart={() => {
            dispatch(clearCart())
            toast.success('Cart cleared')
          }}
          heldCount={heldOrders.length}
          onOpenHeld={() => setHoldPickerOpen(true)}
          breakdown={displayBreakdown}
          onCheckout={() => openCheckout({ print: true })}
          checkoutDisabled={actionsDisabled}
        />
      ) : viewMode === 'tables' ? (
        <PosTableFloorView
          tables={tables}
          selectedTableId={selectedTableId}
          selectedFloor={meta.selectedFloor}
          onFloorChange={(floor) => dispatch(setPosMeta({ selectedFloor: floor }))}
          onSelectTable={(table) => {
            dispatch(setSelectedTable(table.id))
            if (table.floor) dispatch(setPosMeta({ selectedFloor: table.floor }))
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
                if (type !== 'dine-in') {
                  dispatch(setSelectedTable(null))
                  dispatch(setActiveOrder({ id: null }))
                }
              }}
              meta={meta}
              onMetaChange={(patch) => dispatch(setPosMeta(patch))}
              tables={tables}
              selectedTableId={selectedTableId}
              onTableChange={handleTableDropdownChange}
              floors={tableFloors}
              activeOrderNumber={activeOrderNumber}
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
                kotDisabled={kotDisabled}
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
        activeOrderId={activeOrderId || tables.find((t) => t.id === selectedTableId)?.currentOrder?.id || null}
        kotSentKeys={kotSentKeys}
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
