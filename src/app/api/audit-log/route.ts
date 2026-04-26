import { NextRequest, NextResponse } from 'next/server'
import { readList, writeList } from '@/shared/lib/kv-store'

export interface AuditEvent {
  id: string
  fecha: string            // ISO date-time
  fecha_dia: string        // DD/MM/YYYY (para filtro rápido)
  hora: string             // HH:mm:ss
  usuario: string          // login/username
  usuario_nombre: string   // nombre completo
  rol: string
  modulo: string           // clientes, contactos, cotizaciones, etc.
  accion: 'CREAR' | 'MODIFICAR' | 'ELIMINAR' | 'ANULAR' | 'ENVIAR_EMAIL' | 'IMPORTAR' | 'CONVERTIR' | 'SEGUIMIENTO' | 'LOGIN' | 'LOGOUT' | 'OTRO'
  registro_codigo: string  // CLI-00005, COT-00012, etc.
  registro_nombre: string  // razón social, nombre de oportunidad, etc.
  detalle?: string         // descripción libre
  campo?: string           // campo modificado (opcional)
  valor_anterior?: string  // valor previo (opcional)
  valor_nuevo?: string     // valor nuevo (opcional)
}

// Particiona por mes para no cargar todo a la vez: audit-log-2026-04
const keyForMonth = (yyyyMm: string) => `spin-audit-log-${yyyyMm}`
const currentMonthKey = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

// GET: lista eventos de un mes específico (o actual)
export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get('mes') || currentMonthKey()
  const modulo = req.nextUrl.searchParams.get('modulo')
  const usuario = req.nextUrl.searchParams.get('usuario')
  const accion = req.nextUrl.searchParams.get('accion')
  const codigo = req.nextUrl.searchParams.get('codigo')

  const data = await readList<AuditEvent>(keyForMonth(mes))
  let result = data
  if (modulo) result = result.filter(e => e.modulo === modulo)
  if (usuario) result = result.filter(e => e.usuario === usuario || e.usuario_nombre?.toLowerCase().includes(usuario.toLowerCase()))
  if (accion) result = result.filter(e => e.accion === accion)
  if (codigo) result = result.filter(e => (e.registro_codigo || '').toLowerCase().includes(codigo.toLowerCase()))

  // Más recientes primero
  result.sort((a, b) => b.fecha.localeCompare(a.fecha))
  return NextResponse.json({ eventos: result, total: result.length, mes })
}

// POST: registrar un nuevo evento de auditoría
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { usuario, usuario_nombre, rol, modulo, accion, registro_codigo, registro_nombre, detalle, campo, valor_anterior, valor_nuevo } = body

    if (!usuario || !modulo || !accion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: usuario, modulo, accion' }, { status: 400 })
    }

    const now = new Date()
    const fecha = now.toISOString()
    const fechaDia = now.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' })
    const hora = now.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const yyyyMm = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7)

    const evento: AuditEvent = {
      id: crypto.randomUUID(),
      fecha, fecha_dia: fechaDia, hora,
      usuario, usuario_nombre: usuario_nombre || usuario, rol: rol || '',
      modulo, accion,
      registro_codigo: registro_codigo || '',
      registro_nombre: registro_nombre || '',
      detalle: detalle || '',
      campo: campo || '',
      valor_anterior: valor_anterior || '',
      valor_nuevo: valor_nuevo || '',
    }

    const data = await readList<AuditEvent>(keyForMonth(yyyyMm))
    data.push(evento)
    await writeList(keyForMonth(yyyyMm), data)

    return NextResponse.json({ ok: true, id: evento.id })
  } catch {
    return NextResponse.json({ error: 'Error al registrar evento' }, { status: 500 })
  }
}

// NO implementamos DELETE — los audit logs son inmutables por diseño.
