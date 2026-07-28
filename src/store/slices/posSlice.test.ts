import { describe, expect, it } from 'vitest'
import reducer, { addToCart, replaceCartItem } from './posSlice'
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
