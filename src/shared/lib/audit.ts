/**
 * Helper cliente para registrar eventos de auditoría.
 * Llamada no bloqueante (fire & forget) para no ralentizar la UI.
 */

type Accion = 'CREAR' | 'MODIFICAR' | 'ELIMINAR' | 'ANULAR' | 'ENVIAR_EMAIL' | 'IMPORTAR' | 'CONVERTIR' | 'SEGUIMIENTO' | 'LOGIN' | 'LOGOUT' | 'OTRO'

interface LogAuditParams {
  usuario: string
  usuario_nombre?: string
  rol?: string
  modulo: string
  accion: Accion
  registro_codigo?: string
  registro_nombre?: string
  detalle?: string
  campo?: string
  valor_anterior?: string
  valor_nuevo?: string
}

export function logAudit(params: LogAuditParams): void {
  try {
    fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      keepalive: true,
    }).catch(() => { /* silencioso, no debe bloquear la UI */ })
  } catch { /* ignore */ }
}

/**
 * Calcula un diff legible entre dos versiones de un registro.
 * Ignora campos internos (id, seguimientos, permisos) y devuelve string "campo: antes → ahora | campo2: antes → ahora".
 */
const LABELS: Record<string, string> = {
  razon_social: 'Razón Social',
  nombre_comercial: 'Nombre Comercial',
  nro_documento: 'Nro Documento',
  tipo_identificacion: 'Tipo ID',
  direccion: 'Dirección',
  ciudad: 'Ciudad',
  pais: 'País',
  codigo_postal: 'Código Postal',
  telefono: 'Teléfono',
  email: 'Email',
  sitio_web: 'Sitio Web',
  condicion_pago: 'Condición de Pago',
  tipo_moneda: 'Moneda',
  observaciones: 'Observaciones',
  situacion: 'Situación',
  actividad: 'Actividad',
  nombre: 'Nombre',
  apellido: 'Apellido',
  cargo: 'Cargo',
  departamento: 'Departamento',
  celular: 'Celular',
  fecha_nacimiento: 'Fecha Nacimiento',
  nivel_influencia: 'Nivel Influencia',
  empresa: 'Empresa',
  correo: 'Correo',
  nro_movil: 'Nro Móvil',
  origen_prospecto: 'Origen Prospecto',
  detalle_requerimiento: 'Detalle Requerimiento',
  cliente_id: 'Cliente',
  cliente_nombre: 'Cliente',
  contacto_id: 'Contacto',
  contacto_nombre: 'Contacto',
  oportunidad_id: 'Oportunidad',
  oportunidad_nombre: 'Oportunidad',
  valor_estimado: 'Valor Estimado',
  probabilidad: 'Probabilidad',
  etapa: 'Etapa',
  origen: 'Origen',
  fecha_cierre_estimada: 'Cierre Estimado',
  responsable: 'Responsable',
  vendedor: 'Vendedor',
  fecha_emision: 'Fecha Emisión',
  fecha_vencimiento: 'Fecha Vencimiento',
  pct_impuesto: '% Impuesto',
  asunto: 'Asunto',
  descripcion: 'Descripción',
  tipo: 'Tipo',
  prioridad: 'Prioridad',
  fecha_aviso: 'Fecha Aviso',
  hora_aviso: 'Hora Aviso',
  persona_avisa: 'Persona Avisa',
  movil_avisa: 'Móvil Avisa',
  persona_caso: 'Persona Recibe',
  movil_caso: 'Móvil Recibe',
  detalle_incidencia: 'Detalle Incidencia',
  fecha_cierre: 'Fecha Cierre',
  codigo: 'Código',
  categoria: 'Categoría',
  unidad_medida: 'Unidad Medida',
  precio_unitario: 'Precio Unitario',
  fecha_asignacion: 'Fecha Asignación',
  hora_asignacion: 'Hora Asignación',
  persona_asigna: 'Persona Asigna',
  persona_ejecuta: 'Persona Ejecuta',
  fecha_requerida_fin: 'Fecha Requerida',
  fecha_real_fin: 'Fecha Real Fin',
  detalles: 'Detalles',
}

const IGNORAR = new Set(['id', 'seguimientos', 'permisos', 'fecha_registro', 'codigo_acceso', 'documentos', 'nro'])

function fmtValor(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'number') return v.toLocaleString('en-US')
  if (Array.isArray(v)) return `(${v.length} items)`
  if (typeof v === 'object') return '(objeto)'
  const s = String(v)
  return s.length > 60 ? s.slice(0, 57) + '…' : s
}

export function computarDiff<T extends Record<string, unknown>>(antes: T | undefined | null, ahora: T): string {
  if (!antes) return ''
  const cambios: string[] = []
  const keys = new Set([...Object.keys(antes), ...Object.keys(ahora)])
  for (const key of keys) {
    if (IGNORAR.has(key)) continue
    const a = antes[key]
    const b = ahora[key]
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    const label = LABELS[key] || key
    cambios.push(`${label}: "${fmtValor(a)}" → "${fmtValor(b)}"`)
  }
  return cambios.length === 0 ? 'Sin cambios detectables' : cambios.join(' | ')
}
