import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Seguimiento } from '@/shared/types/seguimiento'

export type { Seguimiento }

export interface Empresa {
  id: string
  codigo: string
  nombre: string
  tipo_identificacion: string
  nro_documento: string
  correo: string
  telefono: string
  nro_movil: string
  pagina_web: string
  logo_url: string
  representante_legal: string
  direccion: string
  ciudad: string
  pais: string
  codigo_postal: string
  situacion: string
  seguimientos: Seguimiento[]
}

interface EmpresaState {
  empresas: Empresa[]
  addEmpresa: (e: Empresa) => void
  updateEmpresa: (id: string, e: Partial<Empresa>) => void
  deleteEmpresa: (id: string) => void
}

export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set) => ({
      empresas: [],
      addEmpresa: (e) => set((s) => ({ empresas: [...s.empresas, e] })),
      updateEmpresa: (id, e) => set((s) => ({ empresas: s.empresas.map((r) => r.id === id ? { ...r, ...e } : r) })),
      deleteEmpresa: (id) => set((s) => ({ empresas: s.empresas.filter((r) => r.id !== id) })),
    }),
    { name: 'crm-empresa-storage' }
  )
)
