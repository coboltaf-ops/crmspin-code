import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface Cliente {
  id: string
  codigo: string
  tipo_identificacion: string
  nro_documento: string
  digito_verificacion: string
  razon_social: string
  macro_sector: string
  actividad: string
  actividad_codigo: string
  direccion: string
  departamento: string
  ciudad: string
  codigo_ciudad: string
  pais: string
  codigo_pais: string
  codigo_postal: string
  telefono: string
  nro_movil: string
  email: string
  sitio_web: string
  condicion_pago: string
  tipo_moneda: string
  calificacion_pagador: string
  representante_legal: string
  tipo_cuenta_cliente: string
  clase_cliente: string
  autoretenedor: string
  agente_retenedor: string
  como_nos_conocio: string
  gran_contribuyente: string
  regimen_iva: string
  clasificacion_tributaria: string
  mes_cierre_anual: string
  retencion_fuente_pct: number
  tipo_retencion_fuente: string
  retencion_iva_pct: number
  tipo_retencion_iva: string
  retencion_ica_pct: number
  cupo_credito: number
  banco_pagos: string
  cuenta_banco: string
  tipo_cuenta_banco: string
  naturaleza_cuenta: string
  observaciones: string
  situacion: string
  fecha_registro: string
  fecha_ingreso_cliente: string
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
        state.clientes = state.clientes.map(c => {
          const next = { ...c }
          if (!next.codigo_acceso) next.codigo_acceso = generarCodigoAcceso()
          if (!next.clase_cliente) next.clase_cliente = 'Otros Clientes'
          if (next.clase_cliente === 'Especiales') next.clase_cliente = 'Clientes Especiales'
          return next
        })
        return state
      },
    }
  )
)
