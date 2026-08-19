import { describe, expect, it } from 'vitest'
import reducer, {
  addToCart, discardHeldOrder, holdOrder, replaceCartItem, resumeOrder, setOrderType, setSelectedTable
} from './posSlice'
import type { OrderItem } from '@/types'

const line = (lineKey: string, modifiers: OrderItem['modifiers'] = []): OrderItem => ({
  id: 'burger',
  lineKey,
  menuItemId: 'burger',
  name: 'Burger',
  price: 200,
  quantity: 1,
  modifiers,
})

describe('POS cart modifier identity', () => {
  it('merges identical selections and keeps different selections separate', () => {
    let state = reducer(undefined, addToCart(line('menu:burger:large')))
    state = reducer(state, addToCart(line('menu:burger:large')))
    state = reducer(state, addToCart(line('menu:burger:small')))
    expect(state.cart).toHaveLength(2)
    expect(state.cart[0].quantity).toBe(2)
  })

  it('merges lines when editing produces an existing selection', () => {
    let state = reducer(undefined, addToCart(line('menu:burger:large')))
    state = reducer(state, addToCart(line('menu:burger:small')))
    state = reducer(state, replaceCartItem({
      oldLineKey: 'menu:burger:small',
      item: line('menu:burger:large'),
    }))
    expect(state.cart).toHaveLength(1)
    expect(state.cart[0].quantity).toBe(2)
  })
})

describe('POS hold / resume', () => {
  it('stores multiple holds and restores the selected one with order type/table', () => {
    let state = reducer(undefined, setOrderType('dine-in'))
    state = reducer(state, setSelectedTable('table-9'))
    state = reducer(state, addToCart(line('menu:burger:large')))
    state = reducer(state, holdOrder())

    state = reducer(state, setOrderType('takeaway'))
    state = reducer(state, setSelectedTable(null))
    state = reducer(state, addToCart(line('menu:burger:small')))
    state = reducer(state, holdOrder())

    expect(state.heldOrders).toHaveLength(2)
    const firstHoldId = state.heldOrders[0].id
    state = reducer(state, resumeOrder(firstHoldId))

    expect(state.cart[0].lineKey).toBe('menu:burger:large')
    expect(state.orderType).toBe('dine-in')
    expect(state.selectedTableId).toBe('table-9')
    expect(state.heldOrders).toHaveLength(1)

    state = reducer(state, discardHeldOrder(state.heldOrders[0].id))
    expect(state.heldOrders).toHaveLength(0)
  })
})
