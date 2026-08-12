import { configureStore } from '@reduxjs/toolkit'
import appReducer from './slices/appSlice'
import posReducer from './slices/posSlice'
import ordersReducer from './slices/ordersSlice'
import notificationsReducer from './slices/notificationsSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    pos: posReducer,
    orders: ordersReducer,
    notifications: notificationsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
