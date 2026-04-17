import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface Oportunidad {
  id: string
  codigo: string
  nombre: string
  cliente_id: string
  cliente_nombre: string
  contacto_id: string
  contacto_nombre: string
  valor_estimado: number
  tipo_moneda: string
  probabilidad: number
  etapa: string
  origen: string
  fecha_cierre_estimada: string
  responsable: string
  observaciones: string
  situacion: string
  fecha_registro: string
  seguimientos: Seguimiento[]
}

interface OportunidadesState {
  oportunidades: Oportunidad[]
  addOportunidad: (o: Oportunidad) => void
  updateOportunidad: (id: string, o: Partial<Oportunidad>) => void
  deleteOportunidad: (id: string) => void
}

export const useOportunidadesStore = create<OportunidadesState>()(
  persist(
    (set) => ({
      oportunidades: [],
      addOportunidad: (o) => set((s) => ({ oportunidades: [...s.oportunidades, o] })),
      updateOportunidad: (id, o) => set((s) => ({ oportunidades: s.oportunidades.map((r) => r.id === id ? { ...r, ...o } : r) })),
      deleteOportunidad: (id) => set((s) => ({ oportunidades: s.oportunidades.filter((r) => r.id !== id) })),
    }),
    { name: 'crm-oportunidades-storage' }
  )
)
