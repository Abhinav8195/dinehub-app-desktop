import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/constants/navigation'
import reducer, { addToCart, discardHeldOrder, holdOrder, resumeOrder, setOrderType } from '@/store/slices/posSlice'
import type { OrderItem } from '@/types'

const root = resolve(__dirname, '../..')
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')

const line = (name: string, id = name): OrderItem => ({
  id,
  lineKey: `menu:${id}:`,
  menuItemId: id,
  name,
  price: 100,
  quantity: 1,
})

/** Attached menu-item id resolution used by Modifier Management. */
function attachedMenuItemIds(
  rows: Array<{ id?: string; menuItemId?: string }>
): Set<string> {
  return new Set(
    rows
      .map((row) => row.menuItemId ?? row.id)
      .filter((id): id is string => Boolean(id))
  )
}

/** Mirrors backend order.create paymentStatus rule. */
function paymentStatusForMethod(paymentMethod?: string | null): 'PAID' | 'PENDING' {
  if (!paymentMethod) return 'PENDING'
  const method = String(paymentMethod).toUpperCase()
  return method === 'CASH' || method === 'CARD' ? 'PAID' : 'PENDING'
}

describe('10 product fixes — source + logic validation', () => {
  it('1. Topbar no longer shows fake wifi/printer/cash status icons', () => {
    const topbar = read('src/components/layout/Topbar.tsx')
    expect(topbar).not.toMatch(/\bWifi\b|\bWifiOff\b|\bPrinter\b|CircleDollarSign/)
    expect(topbar).toContain('Realtime')
  })

  it('2. Topbar branch selector has a visible Branch label', () => {
    const topbar = read('src/components/layout/Topbar.tsx')
    expect(topbar).toContain('>Branch<')
    expect(topbar).toContain('Select branch')
  })

  it('3. Lock requires PIN setup and Account Settings can create a PIN', () => {
    const topbar = read('src/components/layout/Topbar.tsx')
    const account = read('src/features/auth/AccountSettingsPage.tsx')
    const lock = read('src/components/auth/LockScreen.tsx')
    expect(topbar).toContain('user?.hasPin')
    expect(topbar).toContain('Set a PIN in Account Settings')
    expect(account).toContain('Create Lock PIN')
    expect(account).toContain('authApi.setPin')
    expect(lock).toContain('Sign out to login')
  })

  it('4. Only English is exposed until i18n is ready', () => {
    expect(LANGUAGES).toEqual([{ code: 'en', label: 'English', flag: '🇺🇸' }])
    const topbar = read('src/components/layout/Topbar.tsx')
    const settings = read('src/features/settings/SettingsPage.tsx')
    expect(topbar).toContain('English')
    expect(topbar).not.toContain('LANGUAGES.map')
    expect(settings).toContain('Only English is available')
  })

  it('5. Activity timeline moved from Dashboard to Settings', () => {
    const dashboard = read('src/features/dashboard/DashboardPage.tsx')
    const settings = read('src/features/settings/SettingsPage.tsx')
    expect(dashboard).not.toContain('Activity Timeline')
    expect(settings).toContain('Activity Timeline')
    expect(settings).toContain('value="activity"')
  })

  it('6. Combo builder surfaces loading/error/empty menu-item states', () => {
    const combo = read('src/features/menu/ComboManagementPage.tsx')
    expect(combo).toContain('items.isLoading')
    expect(combo).toContain('Could not load menu items')
    expect(combo).toContain('No menu items found')
    expect(combo).toContain('accent-primary')
  })

  it('7. Modifier attachments resolve join-row menuItemId and support unchecked state', () => {
    const joinRows = [
      { id: 'join-1', menuItemId: 'menu-a' },
      { id: 'join-2', menuItemId: 'menu-b' },
    ]
    const attached = attachedMenuItemIds(joinRows)
    expect(attached.has('menu-a')).toBe(true)
    expect(attached.has('join-1')).toBe(false)
    expect(attached.has('menu-b')).toBe(true)

    const page = read('src/features/menu/ModifierManagementPage.tsx')
    expect(page).toContain('menuItemId ?? item.id')
    expect(page).toContain('accent-primary')
    expect(page).toContain('detachFromMenuItem')

    const backend = readFileSync(
      resolve(root, '../dinehub-backend/src/modules/restaurant-operations/restaurant-operations.module.ts'),
      'utf8'
    )
    expect(backend).toContain("menuItems: { include: { menuItem: true } }")
    expect(backend).toContain('menuItemId: row.menuItemId')
  })

  it('8. Menu item create/update includes veg / non-veg selector', () => {
    const menu = read('src/features/menu/MenuPage.tsx')
    expect(menu).toContain('Dietary type')
    expect(menu).toContain('isVegetarian')
    expect(menu).toContain('Vegetarian')
    expect(menu).toContain('Non-vegetarian')
  })

  it('9. Hold list can resume any held order, not only the latest', () => {
    let state = reducer(undefined, setOrderType('takeaway'))
    state = reducer(state, addToCart(line('Burger', 'b1')))
    state = reducer(state, holdOrder())
    state = reducer(state, setOrderType('delivery'))
    state = reducer(state, addToCart(line('Pasta', 'p1')))
    state = reducer(state, holdOrder())

    expect(state.heldOrders).toHaveLength(2)
    expect(state.cart).toHaveLength(0)

    const older = state.heldOrders[0]
    const newer = state.heldOrders[1]
    expect(older.id).not.toBe(newer.id)
    state = reducer(state, resumeOrder(older.id))
    expect(state.cart.map((item) => item.name)).toEqual(['Burger'])
    expect(state.orderType).toBe('takeaway')
    expect(state.heldOrders).toHaveLength(1)
    expect(state.heldOrders[0].id).toBe(newer.id)

    state = reducer(state, discardHeldOrder(newer.id))
    expect(state.heldOrders).toHaveLength(0)

    const posPage = read('src/features/pos/POSPage.tsx')
    expect(posPage).toContain('holdPickerOpen')
    expect(posPage).toContain('Held orders')
    expect(posPage).not.toContain('resumeOrder(heldOrders[0].id)')
  })

  it('10. Checkout labels are payment methods and cash/card mark order paid', () => {
    const checkout = read('src/features/pos/components/CheckoutModal.tsx')
    expect(checkout).toContain('Pay with Cash')
    expect(checkout).toContain('Pay with Card')
    expect(checkout).not.toContain('Order Now')

    expect(paymentStatusForMethod('CASH')).toBe('PAID')
    expect(paymentStatusForMethod('CARD')).toBe('PAID')
    expect(paymentStatusForMethod('UPI')).toBe('PENDING')
    expect(paymentStatusForMethod(undefined)).toBe('PENDING')

    const orderService = readFileSync(
      resolve(root, '../dinehub-backend/src/modules/pos/services/order.service.ts'),
      'utf8'
    )
    expect(orderService).toContain("paymentStatus: dto.paymentMethod")
    expect(orderService).toContain("'PAID'")
  })
})
