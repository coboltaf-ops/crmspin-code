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
  // Configuración SMTP de correos
  smtp_host: string
  smtp_port: string
  smtp_usuario: string
  smtp_clave: string
  smtp_seguridad: string
  smtp_remitente_email: string
  smtp_remitente_nombre: string
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
    {
      name: 'crm-empresa-storage',
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<EmpresaState>) }
        state.empresas = (state.empresas || []).map(e => ({
          ...e,
          smtp_host: e.smtp_host ?? '',
          smtp_port: e.smtp_port ?? '',
          smtp_usuario: e.smtp_usuario ?? '',
          smtp_clave: e.smtp_clave ?? '',
          smtp_seguridad: e.smtp_seguridad ?? '',
          smtp_remitente_email: e.smtp_remitente_email ?? '',
          smtp_remitente_nombre: e.smtp_remitente_nombre ?? '',
        }))
        return state
      },
    }
  )
)
