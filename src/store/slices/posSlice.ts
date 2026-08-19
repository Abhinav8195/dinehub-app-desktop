import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { OrderItem } from '@/types'

export interface HeldOrder {
  id: string
  cart: OrderItem[]
  timestamp: string
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  selectedTableId: string | null
  label?: string
}

interface POSState {
  cart: OrderItem[]
  selectedTableId: string | null
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  discount: number
  tax: number
  serviceCharge: number
  tip: number
  notes: string
  heldOrders: HeldOrder[]
}

const initialState: POSState = {
  cart: [],
  selectedTableId: null,
  orderType: 'dine-in',
  discount: 0,
  tax: 8.5,
  serviceCharge: 0,
  tip: 0,
  notes: '',
  heldOrders: []
}

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<OrderItem>) => {
      const existing = state.cart.find((i) => i.lineKey === action.payload.lineKey)
      if (existing) existing.quantity += action.payload.quantity
      else state.cart.push(action.payload)
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter((i) => i.lineKey !== action.payload)
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.cart.find((i) => i.lineKey === action.payload.id)
      if (item) item.quantity = action.payload.quantity
    },
    replaceCartItem: (state, action: PayloadAction<{ oldLineKey: string; item: OrderItem }>) => {
      const index = state.cart.findIndex((item) => item.lineKey === action.payload.oldLineKey)
      if (index < 0) return
      const matchingIndex = state.cart.findIndex((item, itemIndex) =>
        itemIndex !== index && item.lineKey === action.payload.item.lineKey)
      if (matchingIndex >= 0) {
        state.cart[matchingIndex].quantity += action.payload.item.quantity
        state.cart.splice(index, 1)
      } else {
        state.cart[index] = action.payload.item
      }
    },
    clearCart: (state) => { state.cart = [] },
    setOrderType: (state, action: PayloadAction<POSState['orderType']>) => { state.orderType = action.payload },
    setSelectedTable: (state, action: PayloadAction<string | null>) => { state.selectedTableId = action.payload },
    setDiscount: (state, action: PayloadAction<number>) => { state.discount = action.payload },
    setTip: (state, action: PayloadAction<number>) => { state.tip = action.payload },
    holdOrder: (state) => {
      if (state.cart.length === 0) return
      const itemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0)
      state.heldOrders.push({
        id: `hold-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        cart: [...state.cart],
        timestamp: new Date().toISOString(),
        orderType: state.orderType,
        selectedTableId: state.selectedTableId,
        label: `${state.orderType.replace('-', ' ')} · ${itemCount} item${itemCount === 1 ? '' : 's'}`,
      })
      state.cart = []
    },
    resumeOrder: (state, action: PayloadAction<string>) => {
      const held = state.heldOrders.find((h) => h.id === action.payload)
      if (!held) return
      state.cart = held.cart
      state.orderType = held.orderType
      state.selectedTableId = held.selectedTableId
      state.heldOrders = state.heldOrders.filter((h) => h.id !== action.payload)
    },
    discardHeldOrder: (state, action: PayloadAction<string>) => {
      state.heldOrders = state.heldOrders.filter((h) => h.id !== action.payload)
    },
  }
})

export const {
  addToCart, removeFromCart, updateQuantity, clearCart,
  setOrderType, setSelectedTable, setDiscount, setTip, holdOrder, resumeOrder, replaceCartItem, discardHeldOrder
} = posSlice.actions
export default posSlice.reducer
