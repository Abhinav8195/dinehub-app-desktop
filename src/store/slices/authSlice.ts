import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
}

const initialState: AuthState = {
  user: {
    id: '1',
    name: 'Alex Morgan',
    email: 'alex@dinehub.com',
    role: 'manager',
    permissions: [
      'dashboard.view', 'pos.access', 'orders.view', 'tables.view',
      'qr.view', 'kitchen.view', 'menu.view', 'inventory.view',
      'purchase.view', 'customers.view', 'employees.view', 'staff.view',
      'reservations.view', 'reports.view', 'crm.view', 'accounting.view',
      'analytics.view', 'notifications.view', 'settings.view'
    ]
  },
  isAuthenticated: true,
  token: 'demo-token'
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.token = null
    }
  }
})

export const { setUser, logout } = authSlice.actions
export default authSlice.reducer
