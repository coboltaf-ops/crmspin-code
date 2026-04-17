import { NextRequest, NextResponse } from 'next/server'
import { readList, writeList } from '@/shared/lib/kv-store'

const KV_KEY = 'spin-pqrs-externas'

interface PQRSExterna {
  id: string
  radicado: string
  fecha: string
  tipo: string
  prioridad: string
  cliente_id: string
  cliente_codigo: string
  cliente_nombre: string
  fecha_aviso: string
  hora_aviso: string
  persona_avisa: string
  movil_avisa: string
  detalle_incidencia: string
  fecha_registro: string
  hora_registro: string
  importada: boolean
}

const readData = () => readList<PQRSExterna>(KV_KEY)
const writeData = (data: PQRSExterna[]) => writeList(KV_KEY, data)

// GET — listar PQRS externas pendientes (no importadas)
export async function GET(req: NextRequest) {
  const showAll = req.nextUrl.searchParams.get('all') === '1'
  const data = await readData()
  const result = showAll ? data : data.filter(p => !p.importada)
  return NextResponse.json({ pqrs: result, total: result.length })
}

// POST — crear nueva PQRS externa desde formulario público
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fecha, tipo, prioridad, cliente_id, cliente_codigo, cliente_nombre, fecha_aviso, hora_aviso, persona_avisa, movil_avisa, detalle_incidencia } = body

    if (!tipo || !persona_avisa || !detalle_incidencia) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: tipo, persona que avisa y detalle son requeridos.' }, { status: 400 })
    }

    const now = new Date()
    const fechaReg = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    const horaReg = now.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })

    // Generar radicado: RAD-YYYYMMDD-XXXX
    const data = await readData()
    const todayPrefix = `RAD-${fechaReg.replace(/-/g, '')}`
    const todayCount = data.filter(p => p.radicado?.startsWith(todayPrefix)).length + 1
    const radicado = `${todayPrefix}-${String(todayCount).padStart(4, '0')}`

    const nueva: PQRSExterna = {
      id: crypto.randomUUID(),
      radicado,
      fecha: fecha || fechaReg,
      tipo,
      prioridad: prioridad || 'Media',
      cliente_id: cliente_id || '',
      cliente_codigo: cliente_codigo || '',
      cliente_nombre: cliente_nombre || '',
      fecha_aviso: fecha_aviso || '',
      hora_aviso: hora_aviso || '',
      persona_avisa,
      movil_avisa: movil_avisa || '',
      detalle_incidencia,
      fecha_registro: fechaReg,
      hora_registro: horaReg,
      importada: false,
    }

    data.push(nueva)
    await writeData(data)

    return NextResponse.json({ ok: true, id: nueva.id, radicado, mensaje: `Su PQRS ha sido radicada exitosamente con el número ${radicado}.` })
  } catch {
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}

// PATCH — marcar PQRS como importadas
export async function PATCH(req: NextRequest) {
  try {
    const { ids } = await req.json() as { ids: string[] }
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Se requiere un array de IDs.' }, { status: 400 })
    }
    const data = await readData()
    let count = 0
    for (const item of data) {
      if (ids.includes(item.id)) { item.importada = true; count++ }
    }
    await writeData(data)
    return NextResponse.json({ ok: true, importadas: count })
  } catch {
    return NextResponse.json({ error: 'Error al procesar.' }, { status: 500 })
  }
}
