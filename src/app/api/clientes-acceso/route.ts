import { NextRequest, NextResponse } from 'next/server'
import { readList, writeList } from '@/shared/lib/kv-store'

const KV_KEY = 'spin-clientes-acceso'

interface ClienteAcceso {
  id: string
  codigo: string
  razon_social: string
  codigo_acceso: string
}

// GET — validar código de acceso (público)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'Código requerido' }, { status: 400 })

  const data = await readList<ClienteAcceso>(KV_KEY)
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
    await writeList<ClienteAcceso>(KV_KEY, clientes)
    return NextResponse.json({ ok: true, total: clientes.length })
  } catch {
    return NextResponse.json({ error: 'Error al sincronizar' }, { status: 500 })
  }
}
