import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { FAVORITES_KEY, PINNED_KEY, RECENT_PAGES_KEY } from '@/constants/navigation'

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
  sidebarCollapsed: true,
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

const readStoredIds = (key: string, fallback: string[]) => {
  if (typeof window === 'undefined') return fallback
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? 'null')
    return Array.isArray(value) && value.every((id) => typeof id === 'string') ? value : fallback
  } catch {
    return fallback
  }
}

initialState.favorites = readStoredIds(FAVORITES_KEY, initialState.favorites)
initialState.pinnedMenus = readStoredIds(PINNED_KEY, initialState.pinnedMenus)
initialState.recentPages = readStoredIds(RECENT_PAGES_KEY, initialState.recentPages)

const storeIds = (key: string, ids: string[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Keep the Redux state usable when storage is unavailable.
  }
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
      storeIds(RECENT_PAGES_KEY, state.recentPages)
    },
    toggleFavorite: (state, action: PayloadAction<string>) => {
      const id = action.payload
      state.favorites = state.favorites.includes(id)
        ? state.favorites.filter((f) => f !== id)
        : [...state.favorites, id]
      storeIds(FAVORITES_KEY, state.favorites)
    },
    togglePinnedMenu: (state, action: PayloadAction<string>) => {
      const id = action.payload
      state.pinnedMenus = state.pinnedMenus.includes(id)
        ? state.pinnedMenus.filter((item) => item !== id)
        : [...state.pinnedMenus, id]
      storeIds(PINNED_KEY, state.pinnedMenus)
    },
    setCommandPaletteOpen: (state, action: PayloadAction<boolean>) => { state.commandPaletteOpen = action.payload }
  }
})

export const {
  toggleSidebar, setSidebarCollapsed, toggleDarkMode, setDarkMode,
  setRestaurant, setBranch, setLanguage, setOnlineStatus,
  addRecentPage, toggleFavorite, togglePinnedMenu, setCommandPaletteOpen
} = appSlice.actions
export default appSlice.reducer
