import { create } from 'zustand'

interface AsistenteState {
  pendingSearch: string
  pendingAction: 'nuevo' | null
  setPending: (search: string, action?: 'nuevo' | null) => void
  clearPending: () => void
}

export const useAsistenteStore = create<AsistenteState>((set) => ({
  pendingSearch: '',
  pendingAction: null,
  setPending: (search, action = null) => set({ pendingSearch: search, pendingAction: action }),
  clearPending: () => set({ pendingSearch: '', pendingAction: null }),
}))
