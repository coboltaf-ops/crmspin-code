import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface Producto {
  id: string
  codigo: string
  descripcion: string
  categoria: string
  unidad_medida: string
  precio_unitario: number
  tipo_moneda: string
  observaciones: string
  situacion: string
  fecha_registro: string
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
