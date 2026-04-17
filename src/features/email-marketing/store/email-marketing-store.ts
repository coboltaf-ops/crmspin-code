import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ImagenEmail {
  cid: string
  url: string
  filename: string
}

export interface Plantilla {
  id: string
  nombre: string
  asunto: string
  contenido: string // HTML
  imagenes: ImagenEmail[]
  fecha_creacion: string
}

export interface Destinatario {
  email: string
  nombre: string
  origen: 'clientes' | 'contactos' | 'prospectos' | 'manual'
  origen_id?: string
}

export interface Campana {
  id: string
  codigo: string
  nombre: string
  asunto: string
  contenido: string // HTML
  imagenes: ImagenEmail[]
  plantilla_id?: string
  destinatarios: Destinatario[]
  estado: 'Borrador' | 'Enviando' | 'Enviada' | 'Error Parcial'
  total_enviados: number
  total_errores: number
  fecha_creacion: string
  fecha_envio?: string
  responsable: string
}

interface EmailMarketingState {
  campanas: Campana[]
  plantillas: Plantilla[]
  addCampana: (c: Campana) => void
  updateCampana: (id: string, c: Partial<Campana>) => void
  deleteCampana: (id: string) => void
  addPlantilla: (p: Plantilla) => void
  updatePlantilla: (id: string, p: Partial<Plantilla>) => void
  deletePlantilla: (id: string) => void
}

const plantillasDefault: Plantilla[] = [
  {
    id: 'tpl-bienvenida',
    nombre: 'Bienvenida',
    asunto: 'Bienvenido a {{empresa}}',
    imagenes: [],
    contenido: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e3a8a;padding:24px;border-radius:10px 10px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Bienvenido</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
    <p>Hola <strong>{{nombre}}</strong>,</p>
    <p>Gracias por confiar en nosotros. Estamos encantados de tenerle como parte de nuestra comunidad.</p>
    <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
    <p style="margin-top:24px">Cordialmente,<br><strong>{{empresa}}</strong></p>
  </div>
</div>`,
    fecha_creacion: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'tpl-promocion',
    nombre: 'Promocion',
    asunto: 'Oferta especial para ti - {{empresa}}',
    imagenes: [],
    contenido: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e3a8a;padding:24px;border-radius:10px 10px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Oferta Especial</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
    <p>Hola <strong>{{nombre}}</strong>,</p>
    <p>Tenemos una oferta exclusiva para usted. Aproveche nuestros productos y servicios con condiciones especiales.</p>
    <p style="text-align:center;margin:24px 0">
      <span style="display:inline-block;background:#1e3a8a;color:#fff;padding:12px 32px;border-radius:8px;font-weight:bold;font-size:16px">Contactenos hoy</span>
    </p>
    <p>Esta oferta es por tiempo limitado.</p>
    <p style="margin-top:24px">Saludos,<br><strong>{{empresa}}</strong></p>
  </div>
</div>`,
    fecha_creacion: new Date().toISOString().slice(0, 10),
  },
  {
    id: 'tpl-seguimiento',
    nombre: 'Seguimiento',
    asunto: 'Seguimiento - {{empresa}}',
    imagenes: [],
    contenido: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e3a8a;padding:24px;border-radius:10px 10px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Seguimiento</h1>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
    <p>Hola <strong>{{nombre}}</strong>,</p>
    <p>Queremos saber como le ha ido. Nos gustaria conocer su experiencia y si hay algo en lo que podamos ayudarle.</p>
    <p>Esperamos su respuesta.</p>
    <p style="margin-top:24px">Cordialmente,<br><strong>{{empresa}}</strong></p>
  </div>
</div>`,
    fecha_creacion: new Date().toISOString().slice(0, 10),
  },
]

export const useEmailMarketingStore = create<EmailMarketingState>()(
  persist(
    (set) => ({
      campanas: [],
      plantillas: plantillasDefault,
      addCampana: (c) => set((s) => ({ campanas: [...s.campanas, c] })),
      updateCampana: (id, c) => set((s) => ({ campanas: s.campanas.map((r) => r.id === id ? { ...r, ...c } : r) })),
      deleteCampana: (id) => set((s) => ({ campanas: s.campanas.filter((r) => r.id !== id) })),
      addPlantilla: (p) => set((s) => ({ plantillas: [...s.plantillas, p] })),
      updatePlantilla: (id, p) => set((s) => ({ plantillas: s.plantillas.map((r) => r.id === id ? { ...r, ...p } : r) })),
      deletePlantilla: (id) => set((s) => ({ plantillas: s.plantillas.filter((r) => r.id !== id) })),
    }),
    {
      name: 'crm-email-marketing-storage',
      merge: (persisted, current) => {
        const p = persisted as Partial<EmailMarketingState>
        const saved = { ...current, ...p }
        // Ensure default templates exist
        if (!saved.plantillas || saved.plantillas.length === 0) {
          saved.plantillas = plantillasDefault
        }
        return saved
      },
    }
  )
)
