import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface SituacionTarea {
  id: string
  nombre: string
  color: string // yellow | blue | green | gray | red
}

export interface Tarea {
  id: string
  codigo: string
  fecha_asignacion: string
  hora_asignacion: string
  persona_asigna: string
  persona_ejecuta: string
  fecha_requerida_fin: string
  fecha_real_fin: string
  descripcion: string
  situacion: string
  fecha_registro: string
  seguimientos: Seguimiento[]
}

const defaultSituaciones: SituacionTarea[] = [
  { id: 'pendiente', nombre: 'Pendiente', color: 'yellow' },
  { id: 'en-proceso', nombre: 'En Proceso', color: 'blue' },
  { id: 'completada', nombre: 'Completada', color: 'green' },
  { id: 'cancelada', nombre: 'Cancelada', color: 'red' },
]

interface TareasState {
  tareas: Tarea[]
  situaciones: SituacionTarea[]
  addTarea: (t: Tarea) => void
  updateTarea: (id: string, t: Partial<Tarea>) => void
  deleteTarea: (id: string) => void
  addSituacion: (s: SituacionTarea) => void
  updateSituacion: (id: string, s: Partial<SituacionTarea>) => void
  deleteSituacion: (id: string) => void
}

export const useTareasStore = create<TareasState>()(
  persist(
    (set) => ({
      tareas: [],
      situaciones: defaultSituaciones,
      addTarea: (t) => set((s) => ({ tareas: [...s.tareas, t] })),
      updateTarea: (id, t) => set((s) => ({ tareas: s.tareas.map((r) => r.id === id ? { ...r, ...t } : r) })),
      deleteTarea: (id) => set((s) => ({ tareas: s.tareas.filter((r) => r.id !== id) })),
      addSituacion: (sit) => set((s) => ({ situaciones: [...s.situaciones, sit] })),
      updateSituacion: (id, sit) => set((s) => ({ situaciones: s.situaciones.map((r) => r.id === id ? { ...r, ...sit } : r) })),
      deleteSituacion: (id) => set((s) => ({ situaciones: s.situaciones.filter((r) => r.id !== id) })),
    }),
    {
      name: 'crm-tareas-storage',
      merge: (persisted, current) => {
        const p = persisted as Partial<TareasState>
        const saved = { ...current, ...p }
        if (!saved.situaciones || saved.situaciones.length === 0) {
          saved.situaciones = defaultSituaciones
        }
        return saved
      },
    }
  )
)
