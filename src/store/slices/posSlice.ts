import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { OrderItem } from '@/types'

export type PosViewMode = 'order' | 'tables'
export type PosDiscountMode = 'none' | 'percent' | 'fixed'

export interface PosOrderMeta {
  guestCount: number
  customerName: string
  customerPhone: string
  deliveryAddress: string
  deliveryNotes: string
  pickupTime: string
  waiterName: string
  selectedFloor: string | null
}

export interface HeldOrder {
  id: string
  cart: OrderItem[]
  timestamp: string
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  selectedTableId: string | null
  label?: string
  meta?: PosOrderMeta
  discount: number
  discountMode: PosDiscountMode
  discountValue: number
  kotSentKeys: string[]
}

interface POSState {
  cart: OrderItem[]
  selectedTableId: string | null
  orderType: 'dine-in' | 'takeaway' | 'delivery'
  discount: number
  discountMode: PosDiscountMode
  discountValue: number
  tax: number
  serviceCharge: number
  tip: number
  notes: string
  heldOrders: HeldOrder[]
  viewMode: PosViewMode
  meta: PosOrderMeta
  /** Line keys already printed/sent as KOT for this draft cart */
  kotSentKeys: string[]
}

const emptyMeta = (): PosOrderMeta => ({
  guestCount: 2,
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  deliveryNotes: '',
  pickupTime: '',
  waiterName: '',
  selectedFloor: null,
})

const initialState: POSState = {
  cart: [],
  selectedTableId: null,
  orderType: 'dine-in',
  discount: 0,
  discountMode: 'none',
  discountValue: 0,
  tax: 8.5,
  serviceCharge: 0,
  tip: 0,
  notes: '',
  heldOrders: [],
  viewMode: 'order',
  meta: emptyMeta(),
  kotSentKeys: [],
}

function recomputeDiscount(state: POSState) {
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  if (state.discountMode === 'percent') {
    state.discount = Math.min(subtotal, Math.max(0, (subtotal * state.discountValue) / 100))
  } else if (state.discountMode === 'fixed') {
    state.discount = Math.min(subtotal, Math.max(0, state.discountValue))
  } else {
    state.discount = 0
  }
}

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<OrderItem>) => {
      const existing = state.cart.find((i) => i.lineKey === action.payload.lineKey)
      if (existing) existing.quantity += action.payload.quantity
      else state.cart.push(action.payload)
      recomputeDiscount(state)
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter((i) => i.lineKey !== action.payload)
      state.kotSentKeys = state.kotSentKeys.filter((key) => key !== action.payload)
      recomputeDiscount(state)
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.cart.find((i) => i.lineKey === action.payload.id)
      if (item) item.quantity = action.payload.quantity
      recomputeDiscount(state)
    },
    updateItemNotes: (state, action: PayloadAction<{ lineKey: string; notes: string }>) => {
      const item = state.cart.find((i) => i.lineKey === action.payload.lineKey)
      if (item) item.notes = action.payload.notes
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
      recomputeDiscount(state)
    },
    clearCart: (state) => {
      state.cart = []
      state.kotSentKeys = []
      state.discount = 0
      state.discountMode = 'none'
      state.discountValue = 0
      state.meta = emptyMeta()
    },
    setOrderType: (state, action: PayloadAction<POSState['orderType']>) => {
      state.orderType = action.payload
    },
    setSelectedTable: (state, action: PayloadAction<string | null>) => {
      state.selectedTableId = action.payload
    },
    setViewMode: (state, action: PayloadAction<PosViewMode>) => {
      state.viewMode = action.payload
    },
    setPosMeta: (state, action: PayloadAction<Partial<PosOrderMeta>>) => {
      state.meta = { ...state.meta, ...action.payload }
    },
    setManualDiscount: (state, action: PayloadAction<{ mode: PosDiscountMode; value: number }>) => {
      state.discountMode = action.payload.mode
      state.discountValue = action.payload.value
      recomputeDiscount(state)
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload
      state.discountMode = 'fixed'
      state.discountValue = action.payload
    },
    setTip: (state, action: PayloadAction<number>) => { state.tip = action.payload },
    markKotSent: (state, action: PayloadAction<string[]>) => {
      const next = new Set(state.kotSentKeys)
      for (const key of action.payload) next.add(key)
      state.kotSentKeys = [...next]
    },
    resetKotSent: (state) => { state.kotSentKeys = [] },
    startNewOrder: (state) => {
      state.cart = []
      state.kotSentKeys = []
      state.selectedTableId = null
      state.discount = 0
      state.discountMode = 'none'
      state.discountValue = 0
      state.meta = emptyMeta()
      state.viewMode = 'order'
    },
    holdOrder: (state) => {
      if (state.cart.length === 0) return
      const itemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0)
      const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const tableLabel = state.selectedTableId ? 'Table' : state.orderType.replace('-', ' ')
      state.heldOrders.push({
        id: `hold-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        cart: [...state.cart],
        timestamp: new Date().toISOString(),
        orderType: state.orderType,
        selectedTableId: state.selectedTableId,
        label: `${tableLabel} · ${itemCount} item${itemCount === 1 ? '' : 's'} · ₹${Math.round(total)}`,
        meta: { ...state.meta },
        discount: state.discount,
        discountMode: state.discountMode,
        discountValue: state.discountValue,
        kotSentKeys: [...state.kotSentKeys],
      })
      state.cart = []
      state.kotSentKeys = []
      state.discount = 0
      state.discountMode = 'none'
      state.discountValue = 0
      state.meta = emptyMeta()
      state.selectedTableId = null
    },
    resumeOrder: (state, action: PayloadAction<string>) => {
      const held = state.heldOrders.find((h) => h.id === action.payload)
      if (!held) return
      state.cart = held.cart
      state.orderType = held.orderType
      state.selectedTableId = held.selectedTableId
      state.meta = held.meta ? { ...held.meta } : emptyMeta()
      state.discount = held.discount ?? 0
      state.discountMode = held.discountMode ?? 'none'
      state.discountValue = held.discountValue ?? 0
      state.kotSentKeys = held.kotSentKeys ?? []
      state.heldOrders = state.heldOrders.filter((h) => h.id !== action.payload)
      state.viewMode = 'order'
    },
    discardHeldOrder: (state, action: PayloadAction<string>) => {
      state.heldOrders = state.heldOrders.filter((h) => h.id !== action.payload)
    },
  }
})

export const {
  addToCart, removeFromCart, updateQuantity, updateItemNotes, clearCart,
  setOrderType, setSelectedTable, setDiscount, setTip, setManualDiscount,
  holdOrder, resumeOrder, replaceCartItem, discardHeldOrder,
  setViewMode, setPosMeta, markKotSent, resetKotSent, startNewOrder,
} = posSlice.actions
export default posSlice.reducer
