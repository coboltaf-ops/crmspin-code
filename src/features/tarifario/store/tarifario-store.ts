import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface PrecioCliente {
  id: string
  cliente_id: string
  cliente_codigo: string
  cliente_nombre: string
  producto_id: string
  producto_codigo: string
  producto_descripcion: string
  precio: number
  fecha_inicio_vigencia: string
  fecha_fin_vigencia: string
  situacion: string
  observaciones: string
  fecha_registro: string
  seguimientos: Seguimiento[]
}

interface TarifarioState {
  precios: PrecioCliente[]
  addPrecio: (p: PrecioCliente) => void
  updatePrecio: (id: string, p: Partial<PrecioCliente>) => void
  deletePrecio: (id: string) => void
}

export const useTarifarioStore = create<TarifarioState>()(
  persist(
    (set) => ({
      precios: [],
      addPrecio: (p) => set((s) => ({ precios: [...s.precios, p] })),
      updatePrecio: (id, p) => set((s) => ({ precios: s.precios.map((r) => r.id === id ? { ...r, ...p } : r) })),
      deletePrecio: (id) => set((s) => ({ precios: s.precios.filter((r) => r.id !== id) })),
    }),
    { name: 'crm-tarifario-storage' }
  )
)
