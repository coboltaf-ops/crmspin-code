import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Usuario, PERMISOS_DEFAULT } from '../types'

interface UsuariosState {
  usuarios: Usuario[]
  addUsuario: (u: Usuario) => void
  updateUsuario: (id: string, u: Partial<Usuario>) => void
  deleteUsuario: (id: string) => void
}

const defaultAdmin: Usuario = {
  id: 'admin-1',
  nombre: 'Admin',
  apellido: 'CRM',
  usuario: 'admin',
  clave: 'admin123',
  correo: 'admin@crmspin.com',
  rol: 'Admin',
  situacion: 'Activo',
  permisos: PERMISOS_DEFAULT['Admin'],
}

export const useUsuariosStore = create<UsuariosState>()(
  persist(
    (set) => ({
      usuarios: [defaultAdmin],
      addUsuario: (u) => set((s) => ({ usuarios: [...s.usuarios, u] })),
      updateUsuario: (id, u) => set((s) => ({ usuarios: s.usuarios.map((r) => r.id === id ? { ...r, ...u } : r) })),
      deleteUsuario: (id) => set((s) => ({ usuarios: s.usuarios.filter((r) => r.id !== id) })),
    }),
    {
      name: 'crm-usuarios-storage',
      merge: (persisted, current) => {
        const p = persisted as UsuariosState
        return {
          ...current,
          usuarios: (p?.usuarios || [defaultAdmin]).map(u => ({
            ...u,
            permisos: u.permisos || PERMISOS_DEFAULT[u.rol] || PERMISOS_DEFAULT['Ventas'],
          })),
        }
      },
    }
  )
)
