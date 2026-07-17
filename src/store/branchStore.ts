import { create } from 'zustand'

interface BranchState {
  selectedBranchId: string | null
  branches: { id: string; name: string }[]
  setBranch: (id: string) => void
  setBranches: (branches: { id: string; name: string }[]) => void
}

export const useBranchStore = create<BranchState>((set) => ({
  selectedBranchId: null,
  branches: [],
  setBranch: (id) => set({ selectedBranchId: id }),
  setBranches: (branches) => set({ branches, selectedBranchId: branches[0]?.id ?? null })
}))
