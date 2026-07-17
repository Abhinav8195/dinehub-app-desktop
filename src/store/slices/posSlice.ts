import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { OrderItem } from '@/types'

interface POSState {
  cart: OrderItem[]
  selectedTableId: string | null
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  discount: number
  tax: number
  serviceCharge: number
  tip: number
  notes: string
  heldOrders: { id: string; cart: OrderItem[]; timestamp: string }[]
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
      const existing = state.cart.find((i) => i.id === action.payload.id)
      if (existing) existing.quantity += action.payload.quantity
      else state.cart.push(action.payload)
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter((i) => i.id !== action.payload)
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.cart.find((i) => i.id === action.payload.id)
      if (item) item.quantity = action.payload.quantity
    },
    clearCart: (state) => { state.cart = [] },
    setOrderType: (state, action: PayloadAction<POSState['orderType']>) => { state.orderType = action.payload },
    setSelectedTable: (state, action: PayloadAction<string | null>) => { state.selectedTableId = action.payload },
    setDiscount: (state, action: PayloadAction<number>) => { state.discount = action.payload },
    setTip: (state, action: PayloadAction<number>) => { state.tip = action.payload },
    holdOrder: (state) => {
      if (state.cart.length > 0) {
        state.heldOrders.push({
          id: `hold-${Date.now()}`,
          cart: [...state.cart],
          timestamp: new Date().toISOString()
        })
        state.cart = []
      }
    },
    resumeOrder: (state, action: PayloadAction<string>) => {
      const held = state.heldOrders.find((h) => h.id === action.payload)
      if (held) {
        state.cart = held.cart
        state.heldOrders = state.heldOrders.filter((h) => h.id !== action.payload)
      }
    }
  }
})

export const {
  addToCart, removeFromCart, updateQuantity, clearCart,
  setOrderType, setSelectedTable, setDiscount, setTip, holdOrder, resumeOrder
} = posSlice.actions
export default posSlice.reducer
