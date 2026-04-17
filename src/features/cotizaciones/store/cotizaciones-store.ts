import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface DetalleCotizacion {
  id: string
  producto_id: string
  codigo_producto: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  unidad_medida: string
  descuento_pct: number
  subtotal: number
}

export interface Cotizacion {
  id: string
  codigo: string
  nro: number
  fecha_emision: string
  fecha_vencimiento: string
  cliente_id: string
  cliente_nombre: string
  contacto_id: string
  contacto_nombre: string
  oportunidad_id: string
  oportunidad_nombre: string
  tipo_moneda: string
  condicion_pago: string
  pct_impuesto: number
  observaciones: string
  detalles: DetalleCotizacion[]
  situacion: string
  responsable: string
  vendedor: string
  fecha_registro: string
  seguimientos: Seguimiento[]
}

interface CotizacionesState {
  cotizaciones: Cotizacion[]
  addCotizacion: (c: Cotizacion) => void
  updateCotizacion: (id: string, c: Partial<Cotizacion>) => void
  deleteCotizacion: (id: string) => void
}

export const useCotizacionesStore = create<CotizacionesState>()(
  persist(
    (set) => ({
      cotizaciones: [],
      addCotizacion: (c) => set((s) => ({ cotizaciones: [...s.cotizaciones, c] })),
      updateCotizacion: (id, c) => set((s) => ({ cotizaciones: s.cotizaciones.map((r) => r.id === id ? { ...r, ...c } : r) })),
      deleteCotizacion: (id) => set((s) => ({ cotizaciones: s.cotizaciones.filter((r) => r.id !== id) })),
    }),
    { name: 'crm-cotizaciones-storage' }
  )
)
