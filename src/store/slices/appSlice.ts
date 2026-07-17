import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  sidebarCollapsed: boolean
  darkMode: boolean
  selectedRestaurantId: string
  selectedBranchId: string
  language: string
  isOnline: boolean
  printerConnected: boolean
  cashRegisterOpen: boolean
  recentPages: string[]
  favorites: string[]
  pinnedMenus: string[]
  commandPaletteOpen: boolean
}

const initialState: AppState = {
  sidebarCollapsed: false,
  darkMode: false,
  selectedRestaurantId: '1',
  selectedBranchId: '1',
  language: 'en',
  isOnline: true,
  printerConnected: true,
  cashRegisterOpen: true,
  recentPages: [],
  favorites: ['dashboard', 'pos', 'orders'],
  pinnedMenus: ['dashboard', 'pos'],
  commandPaletteOpen: false
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => { state.sidebarCollapsed = action.payload },
    toggleDarkMode: (state) => { state.darkMode = !state.darkMode },
    setDarkMode: (state, action: PayloadAction<boolean>) => { state.darkMode = action.payload },
    setRestaurant: (state, action: PayloadAction<string>) => { state.selectedRestaurantId = action.payload },
    setBranch: (state, action: PayloadAction<string>) => { state.selectedBranchId = action.payload },
    setLanguage: (state, action: PayloadAction<string>) => { state.language = action.payload },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => { state.isOnline = action.payload },
    addRecentPage: (state, action: PayloadAction<string>) => {
      state.recentPages = [action.payload, ...state.recentPages.filter((p) => p !== action.payload)].slice(0, 10)
    },
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const id = action.payload
      state.favorites = state.favorites.includes(id)
        ? state.favorites.filter((f) => f !== id)
        : [...state.favorites, id]
    },
    setCommandPaletteOpen: (state, action: PayloadAction<boolean>) => { state.commandPaletteOpen = action.payload }
  }
})

export const {
  toggleSidebar, setSidebarCollapsed, toggleDarkMode, setDarkMode,
  setRestaurant, setBranch, setLanguage, setOnlineStatus,
  addRecentPage, toggleFavorite, setCommandPaletteOpen
} = appSlice.actions
export default appSlice.reducer
