import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Notification } from '@/types'

interface NotificationsState {
  items: Notification[]
  unreadCount: number
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
}

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (
      state,
      action: PayloadAction<{ items: Notification[]; unreadCount: number }>,
    ) => {
      state.items = action.payload.items
      state.unreadCount = action.payload.unreadCount
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.items.unshift(action.payload)
      if (!action.payload.read) state.unreadCount++
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const item = state.items.find((n) => n.id === action.payload)
      if (item && !item.read) {
        item.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllRead: (state) => {
      state.items.forEach((n) => { n.read = true })
      state.unreadCount = 0
    },
  },
})

export const { setNotifications, addNotification, markAsRead, markAllRead } = notificationsSlice.actions
export default notificationsSlice.reducer
