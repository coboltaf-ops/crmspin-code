import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Usuario } from '../types'

interface CurrentUserState {
  user: Usuario | null
  setUser: (u: Usuario | null) => void
  logout: () => void
}

export const useCurrentUserStore = create<CurrentUserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: 'crm-current-user-storage' }
  )
)
