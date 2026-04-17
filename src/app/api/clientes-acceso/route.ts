import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'clientes-acceso.json')

interface ClienteAcceso {
  id: string
  codigo: string
  razon_social: string
  codigo_acceso: string
}

function readData(): ClienteAcceso[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return []
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch { return [] }
}

function writeData(data: ClienteAcceso[]) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// GET — validar código de acceso (público)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'Código requerido' }, { status: 400 })

  const data = readData()
  const found = data.find(c => c.codigo_acceso === code)
  if (found) {
    return NextResponse.json({ valid: true, cliente_id: found.id, cliente_codigo: found.codigo, cliente_nombre: found.razon_social })
  }
  return NextResponse.json({ valid: false, error: 'Código de acceso no válido' })
}

// POST — sincronizar códigos desde el CRM (llamado internamente)
export async function POST(req: NextRequest) {
  try {
    const { clientes } = await req.json() as { clientes: ClienteAcceso[] }
    if (!Array.isArray(clientes)) return NextResponse.json({ error: 'Se requiere array de clientes' }, { status: 400 })
    writeData(clientes)
    return NextResponse.json({ ok: true, total: clientes.length })
  } catch {
    return NextResponse.json({ error: 'Error al sincronizar' }, { status: 500 })
  }
}
