import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface Producto {
  id: string
  codigo: string
  descripcion: string
  tipo_empaque: string
  tipo_formula: string
  porcentaje_iva: string
  tipo_precio: string
  precio_unitario: number
  fecha_vigencia_precio: string
  situacion: string
  observaciones: string
  fecha_registro: string

  costo_producto: number
  margen_contribucion_pct: number
  margen_calculo_pct: number

  valor_trm: number
  conversion_cop: number
  valor_usd: number

  unidad_medida: string
  existencia_actual: number
  valor_permanente_stock: number
  costo_inventario: number

  seguimientos: Seguimiento[]
}

interface ProductosState {
  productos: Producto[]
  addProducto: (p: Producto) => void
  updateProducto: (id: string, p: Partial<Producto>) => void
  deleteProducto: (id: string) => void
}

export const useProductosStore = create<ProductosState>()(
  persist(
    (set) => ({
      productos: [],
      addProducto: (p) => set((s) => ({ productos: [...s.productos, p] })),
      updateProducto: (id, p) => set((s) => ({ productos: s.productos.map((r) => r.id === id ? { ...r, ...p } : r) })),
      deleteProducto: (id) => set((s) => ({ productos: s.productos.filter((r) => r.id !== id) })),
    }),
    { name: 'crm-productos-storage' }
  )
)
