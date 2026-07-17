import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Order } from '@/types'

interface OrdersState {
  orders: Order[]
  selectedOrderId: string | null
  filter: { status: string; type: string; search: string }
}

const initialState: OrdersState = {
  orders: [],
  selectedOrderId: null,
  filter: { status: 'all', type: 'all', search: '' }
}

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<Order[]>) => { state.orders = action.payload },
    selectOrder: (state, action: PayloadAction<string | null>) => { state.selectedOrderId = action.payload },
    setFilter: (state, action: PayloadAction<Partial<OrdersState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload }
    },
    updateOrderStatus: (state, action: PayloadAction<{ id: string; status: Order['status'] }>) => {
      const order = state.orders.find((o) => o.id === action.payload.id)
      if (order) order.status = action.payload.status
    },
    addOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload)
    }
  }
})

export const { setOrders, selectOrder, setFilter, updateOrderStatus, addOrder } = ordersSlice.actions
export default ordersSlice.reducer
