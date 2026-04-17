import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface Cliente {
  id: string
  codigo: string
  tipo_identificacion: string
  nro_documento: string
  razon_social: string
  nombre_comercial: string
  actividad: string
  direccion: string
  ciudad: string
  pais: string
  codigo_postal: string
  telefono: string
  email: string
  sitio_web: string
  condicion_pago: string
  tipo_moneda: string
  observaciones: string
  situacion: string
  fecha_registro: string
  seguimientos: Seguimiento[]
  codigo_acceso: string
}

/** Genera código de acceso aleatorio tipo ACC-XXXXXX */
export function generarCodigoAcceso(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `ACC-${code}`
}

interface ClientesState {
  clientes: Cliente[]
  addCliente: (c: Cliente) => void
  updateCliente: (id: string, c: Partial<Cliente>) => void
  deleteCliente: (id: string) => void
}

export const useClientesStore = create<ClientesState>()(
  persist(
    (set) => ({
      clientes: [],
      addCliente: (c) => set((s) => ({ clientes: [...s.clientes, c] })),
      updateCliente: (id, c) => set((s) => ({ clientes: s.clientes.map((r) => r.id === id ? { ...r, ...c } : r) })),
      deleteCliente: (id) => set((s) => ({ clientes: s.clientes.filter((r) => r.id !== id) })),
    }),
    {
      name: 'crm-clientes-storage',
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<ClientesState>) }
        state.clientes = state.clientes.map(c =>
          c.codigo_acceso ? c : { ...c, codigo_acceso: generarCodigoAcceso() }
        )
        return state
      },
    }
  )
)
