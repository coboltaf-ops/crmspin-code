import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface Prospecto {
  id: string
  external_id?: string
  codigo: string
  nombre: string
  apellido: string
  empresa: string
  correo: string
  nro_movil: string
  origen_prospecto: string
  detalle_requerimiento: string
  actividad: string
  ciudad: string
  pais: string
  situacion: string
  fecha_registro: string
  seguimientos: Seguimiento[]
}

interface ProspectosState {
  prospectos: Prospecto[]
  addProspecto: (p: Prospecto) => void
  updateProspecto: (id: string, p: Partial<Prospecto>) => void
  deleteProspecto: (id: string) => void
}

export const useProspectosStore = create<ProspectosState>()(
  persist(
    (set) => ({
      prospectos: [],
      addProspecto: (p) => set((s) => ({ prospectos: [...s.prospectos, p] })),
      updateProspecto: (id, p) => set((s) => ({ prospectos: s.prospectos.map((r) => r.id === id ? { ...r, ...p } : r) })),
      deleteProspecto: (id) => set((s) => ({ prospectos: s.prospectos.filter((r) => r.id !== id) })),
    }),
    { name: 'crm-prospectos-storage' }
  )
)
