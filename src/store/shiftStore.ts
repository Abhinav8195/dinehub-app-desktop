import { create } from 'zustand'
import { authApi } from '@/api/auth.api'
import type { StaffShift } from '@/api/types/auth.types'

interface ShiftState {
  currentShift: StaffShift | null
  isLocked: boolean
  isShiftLoading: boolean
  fetchCurrentShift: () => Promise<StaffShift | null>
  openShift: (openingCash: number, notes?: string) => Promise<StaffShift>
  closeShift: (closingCash: number, expectedCash?: number, notes?: string) => Promise<StaffShift>
  lockScreen: () => Promise<void>
  unlockScreen: (pin?: string, password?: string) => Promise<void>
  syncLockStatus: () => Promise<void>
  reset: () => void
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  isLocked: false,
  isShiftLoading: false,

  fetchCurrentShift: async () => {
    set({ isShiftLoading: true })
    try {
      const shift = await authApi.getCurrentShift()
      set({ currentShift: shift })
      return shift
    } finally {
      set({ isShiftLoading: false })
    }
  },

  openShift: async (openingCash, notes) => {
    const shift = await authApi.openShift({ openingCash, notes })
    set({ currentShift: shift })
    return shift
  },

  closeShift: async (closingCash, expectedCash, notes) => {
    const shift = await authApi.closeShift({ closingCash, expectedCash, notes })
    set({ currentShift: null })
    return shift
  },

  lockScreen: async () => {
    await authApi.lockScreen()
    set({ isLocked: true })
  },

  unlockScreen: async (pin, password) => {
    await authApi.unlockScreen({ pin, password })
    set({ isLocked: false })
  },

  syncLockStatus: async () => {
    try {
      const status = await authApi.getLockStatus()
      set({ isLocked: status.isLocked })
    } catch {
      // ignore when offline
    }
  },

  reset: () => set({ currentShift: null, isLocked: false })
}))
