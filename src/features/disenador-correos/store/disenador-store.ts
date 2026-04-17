import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PlantillaCorreo {
  id: string
  nombre: string
  categoria: string
  asunto: string
  contenido: string // HTML
  fecha_creacion: string
  fecha_modificacion: string
  favorito: boolean
}

interface DisenadorState {
  plantillas: PlantillaCorreo[]
  addPlantilla: (p: PlantillaCorreo) => void
  updatePlantilla: (id: string, p: Partial<PlantillaCorreo>) => void
  deletePlantilla: (id: string) => void
  duplicarPlantilla: (id: string) => void
}

function todayCO() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) }

const plantillasPredefinidas: PlantillaCorreo[] = [
  {
    id: 'pre-bienvenida', nombre: 'Bienvenida al Cliente', categoria: 'Comercial', asunto: 'Bienvenido a {{empresa}}', favorito: true,
    fecha_creacion: todayCO(), fecha_modificacion: todayCO(),
    contenido: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e3a8a;padding:28px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">Bienvenido</h1>
    <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px">Nos alegra tenerle con nosotros</p>
  </div>
  <div style="padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#ffffff">
    <p style="font-size:15px;color:#1e293b">Hola <strong>{{nombre}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Gracias por confiar en nosotros. Estamos encantados de tenerle como parte de nuestra comunidad.</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Nuestro equipo esta disponible para atenderle en lo que necesite. No dude en contactarnos.</p>
    <div style="text-align:center;margin:28px 0">
      <span style="display:inline-block;background:#1e3a8a;color:#fff;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px;text-decoration:none">Conocer Nuestros Servicios</span>
    </div>
    <p style="font-size:14px;color:#475569;margin-top:24px">Cordialmente,<br><strong>{{empresa}}</strong></p>
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">{{empresa}} - Todos los derechos reservados</p>
</div>`,
  },
  {
    id: 'pre-promocion', nombre: 'Oferta Especial', categoria: 'Marketing', asunto: 'Oferta exclusiva para ti - {{empresa}}', favorito: false,
    fecha_creacion: todayCO(), fecha_modificacion: todayCO(),
    contenido: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:32px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:26px">Oferta Especial</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:16px">Solo por tiempo limitado</p>
  </div>
  <div style="padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#ffffff">
    <p style="font-size:15px;color:#1e293b">Hola <strong>{{nombre}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Tenemos una oferta exclusiva diseñada especialmente para usted.</p>
    <div style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
      <p style="font-size:13px;color:#3b82f6;font-weight:600;margin:0">DESCUENTO ESPECIAL</p>
      <p style="font-size:42px;color:#1e3a8a;font-weight:900;margin:8px 0">20% OFF</p>
      <p style="font-size:13px;color:#64748b;margin:0">En todos nuestros productos y servicios</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <span style="display:inline-block;background:#1e3a8a;color:#fff;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px">Aprovechar Oferta</span>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center">Oferta valida hasta agotar existencias. Aplican condiciones.</p>
    <p style="font-size:14px;color:#475569;margin-top:20px">Saludos,<br><strong>{{empresa}}</strong></p>
  </div>
</div>`,
  },
  {
    id: 'pre-seguimiento', nombre: 'Seguimiento Post-Venta', categoria: 'Servicio', asunto: 'Como fue su experiencia? - {{empresa}}', favorito: false,
    fecha_creacion: todayCO(), fecha_modificacion: todayCO(),
    contenido: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1e3a8a;padding:28px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Queremos Saber de Usted</h1>
  </div>
  <div style="padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#ffffff">
    <p style="font-size:15px;color:#1e293b">Hola <strong>{{nombre}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Nos gustaria conocer su experiencia con nuestros productos y servicios. Su opinion es muy importante para nosotros.</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Si tiene alguna sugerencia o necesita asistencia adicional, estamos aqui para ayudarle.</p>
    <p style="font-size:14px;color:#475569;margin-top:24px">Esperamos su respuesta.<br>Cordialmente,<br><strong>{{empresa}}</strong></p>
  </div>
</div>`,
  },
  {
    id: 'pre-recordatorio', nombre: 'Recordatorio de Pago', categoria: 'Cobranza', asunto: 'Recordatorio de pago pendiente - {{empresa}}', favorito: false,
    fecha_creacion: todayCO(), fecha_modificacion: todayCO(),
    contenido: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#b91c1c;padding:24px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">Recordatorio de Pago</h1>
  </div>
  <div style="padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#ffffff">
    <p style="font-size:15px;color:#1e293b">Estimado/a <strong>{{nombre}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Le recordamos que tiene un pago pendiente con nuestra empresa. Le agradecemos realizar el pago a la brevedad posible.</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Si ya realizo el pago, por favor ignore este mensaje.</p>
    <p style="font-size:14px;color:#475569;margin-top:24px">Atentamente,<br><strong>{{empresa}}</strong></p>
  </div>
</div>`,
  },
  {
    id: 'pre-invitacion', nombre: 'Invitacion a Evento', categoria: 'Marketing', asunto: 'Esta invitado! - {{empresa}}', favorito: false,
    fecha_creacion: todayCO(), fecha_modificacion: todayCO(),
    contenido: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:32px;border-radius:12px 12px 0 0;text-align:center">
    <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0">ESTA INVITADO</p>
    <h1 style="color:#fff;margin:8px 0 0;font-size:28px">Evento Especial</h1>
  </div>
  <div style="padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#ffffff">
    <p style="font-size:15px;color:#1e293b">Hola <strong>{{nombre}}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.7">Queremos invitarle a nuestro proximo evento exclusivo. Sera una oportunidad unica para conocer nuestras novedades.</p>
    <div style="background:#f5f3ff;border-radius:12px;padding:20px;text-align:center;margin:24px 0;border:1px solid #ddd6fe">
      <p style="font-size:18px;color:#7c3aed;font-weight:700;margin:0">Fecha del Evento</p>
      <p style="font-size:14px;color:#64748b;margin:8px 0 0">Proximamente - Le confirmaremos los detalles</p>
    </div>
    <div style="text-align:center;margin:24px 0">
      <span style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px">Confirmar Asistencia</span>
    </div>
    <p style="font-size:14px;color:#475569;margin-top:20px">Le esperamos!<br><strong>{{empresa}}</strong></p>
  </div>
</div>`,
  },
]

export const useDirenadorStore = create<DisenadorState>()(
  persist(
    (set, get) => ({
      plantillas: plantillasPredefinidas,
      addPlantilla: (p) => set((s) => ({ plantillas: [...s.plantillas, p] })),
      updatePlantilla: (id, p) => set((s) => ({ plantillas: s.plantillas.map((r) => r.id === id ? { ...r, ...p, fecha_modificacion: todayCO() } : r) })),
      deletePlantilla: (id) => set((s) => ({ plantillas: s.plantillas.filter((r) => r.id !== id) })),
      duplicarPlantilla: (id) => {
        const orig = get().plantillas.find(p => p.id === id)
        if (!orig) return
        const copia: PlantillaCorreo = { ...orig, id: crypto.randomUUID(), nombre: `${orig.nombre} (copia)`, favorito: false, fecha_creacion: todayCO(), fecha_modificacion: todayCO() }
        set((s) => ({ plantillas: [...s.plantillas, copia] }))
      },
    }),
    {
      name: 'crm-disenador-correos-storage',
      merge: (persisted, current) => {
        const p = persisted as Partial<DisenadorState>
        const saved = { ...current, ...p }
        if (!saved.plantillas || saved.plantillas.length === 0) saved.plantillas = plantillasPredefinidas
        return saved
      },
    }
  )
)
