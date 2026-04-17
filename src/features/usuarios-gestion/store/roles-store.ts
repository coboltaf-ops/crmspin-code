import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PermisoModulo, MODULOS_CRM } from '../types'

export interface Rol {
  id: string
  nombre: string
  permisos: PermisoModulo[]
}

interface RolesState {
  roles: Rol[]
  addRol: (r: Rol) => void
  updateRol: (id: string, r: Partial<Rol>) => void
  deleteRol: (id: string) => void
}

const defaultRoles: Rol[] = [
  { id: 'admin', nombre: 'Admin', permisos: MODULOS_CRM.map(m => ({ modulo: m.id, leer: true, editar: true, eliminar: true })) },
  { id: 'ventas', nombre: 'Ventas', permisos: MODULOS_CRM.map(m => ({ modulo: m.id, leer: true, editar: ['clientes', 'contactos', 'oportunidades', 'cotizaciones', 'prospectos'].includes(m.id), eliminar: false })) },
  { id: 'soporte', nombre: 'Soporte', permisos: MODULOS_CRM.map(m => ({ modulo: m.id, leer: true, editar: m.id === 'pqrs', eliminar: false })) },
  { id: 'gerencia', nombre: 'Gerencia', permisos: MODULOS_CRM.map(m => ({ modulo: m.id, leer: true, editar: false, eliminar: false })) },
]

export const useRolesStore = create<RolesState>()(
  persist(
    (set) => ({
      roles: defaultRoles,
      addRol: (r) => set((s) => ({ roles: [...s.roles, r] })),
      updateRol: (id, r) => set((s) => ({ roles: s.roles.map((rol) => rol.id === id ? { ...rol, ...r } : rol) })),
      deleteRol: (id) => set((s) => ({ roles: s.roles.filter((r) => r.id !== id) })),
    }),
    { name: 'crm-roles-storage' }
  )
)
