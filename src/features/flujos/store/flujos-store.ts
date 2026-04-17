import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MODULOS_FLUJO = [
  { id: 'clientes', label: 'Empresas' },
  { id: 'contactos', label: 'Contactos' },
  { id: 'oportunidades', label: 'Oportunidades' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'prospectos', label: 'Prospectos' },
  { id: 'pqrs', label: 'PQRS' },
  { id: 'tareas', label: 'Tareas' },
]

export const TRIGGERS = [
  { id: 'record_created', label: 'Registro Creado' },
  { id: 'record_updated', label: 'Registro Actualizado' },
  { id: 'field_changed', label: 'Campo Cambió de Valor' },
  { id: 'scheduled', label: 'Fecha y Hora Programada' },
]

export const OPERADORES = [
  { id: 'equals', label: 'Igual a' },
  { id: 'not_equals', label: 'Diferente de' },
  { id: 'contains', label: 'Contiene' },
  { id: 'greater_than', label: 'Mayor que' },
  { id: 'less_than', label: 'Menor que' },
]

export const TIPOS_ACCION = [
  { id: 'send_email', label: 'Enviar Email', icon: '📧' },
  { id: 'create_tarea', label: 'Crear Tarea', icon: '✅' },
  { id: 'update_field', label: 'Actualizar Campo', icon: '✏️' },
  { id: 'add_seguimiento', label: 'Agregar Seguimiento', icon: '📝' },
  { id: 'create_record', label: 'Crear Registro', icon: '➕' },
]

export interface Condicion {
  id: string
  campo: string
  operador: string
  valor: string
}

export interface Accion {
  id: string
  tipo: string // send_email | create_tarea | update_field | add_seguimiento | create_record
  modulo_destino: string // modulo donde se ejecuta la accion
  config: Record<string, string>
}

export interface Ejecucion {
  id: string
  fecha: string
  registro_id: string
  registro_codigo: string
  estado: 'exitoso' | 'error'
  detalle: string
}

export interface Flujo {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  modulo: string // modulo que dispara el flujo
  trigger: string // record_created | record_updated | field_changed | scheduled
  trigger_campo?: string // solo para field_changed
  fecha_programada?: string // YYYY-MM-DD para scheduled
  hora_programada?: string // HH:MM para scheduled
  ejecutado_programado?: boolean // si ya se ejecuto el programado
  condiciones_operador: 'AND' | 'OR'
  condiciones: Condicion[]
  acciones: Accion[]
  activo: boolean
  fecha_creacion: string
  creado_por: string
  ejecuciones: Ejecucion[]
}

interface FlujosState {
  flujos: Flujo[]
  addFlujo: (f: Flujo) => void
  updateFlujo: (id: string, f: Partial<Flujo>) => void
  deleteFlujo: (id: string) => void
  addEjecucion: (flujoId: string, e: Ejecucion) => void
  toggleActivo: (id: string) => void
  duplicarFlujo: (id: string) => void
}

function todayCO() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) }

export const useFlujosStore = create<FlujosState>()(
  persist(
    (set, get) => ({
      flujos: [],
      addFlujo: (f) => set((s) => ({ flujos: [...s.flujos, f] })),
      updateFlujo: (id, f) => set((s) => ({ flujos: s.flujos.map((r) => r.id === id ? { ...r, ...f } : r) })),
      deleteFlujo: (id) => set((s) => ({ flujos: s.flujos.filter((r) => r.id !== id) })),
      addEjecucion: (flujoId, e) => set((s) => ({
        flujos: s.flujos.map(f => f.id === flujoId ? { ...f, ejecuciones: [...f.ejecuciones, e] } : f)
      })),
      toggleActivo: (id) => set((s) => ({
        flujos: s.flujos.map(f => f.id === id ? { ...f, activo: !f.activo } : f)
      })),
      duplicarFlujo: (id) => {
        const orig = get().flujos.find(f => f.id === id)
        if (!orig) return
        const copia: Flujo = {
          ...orig, id: crypto.randomUUID(),
          codigo: `FLJ-${String(get().flujos.length + 1).padStart(3, '0')}`,
          nombre: `${orig.nombre} (copia)`, activo: false,
          fecha_creacion: todayCO(), ejecuciones: [],
        }
        set((s) => ({ flujos: [...s.flujos, copia] }))
      },
    }),
    { name: 'crm-flujos-storage' }
  )
)
