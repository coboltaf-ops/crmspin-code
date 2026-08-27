import { NextRequest, NextResponse } from 'next/server'
import { writeList } from '@/shared/lib/kv-store'
import { getUsuariosServer, USUARIOS_KEY } from '@/shared/lib/usuarios-server'
import { verifySession, hashPassword, isHashed } from '@/shared/lib/auth-crypto'

// Solo usuarios con sesión válida pueden ver/guardar la lista (no es público).
function autorizado(req: NextRequest): boolean {
  const token = req.cookies.get('palomares_session')?.value
  return verifySession(token) !== null
}

// GET — listar usuarios (PROTEGIDO)
export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const data = await getUsuariosServer()
  return NextResponse.json(data)
}

// POST — guardar la lista (PROTEGIDO + cifra las claves nuevas)
export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const data = await req.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Se esperaba un arreglo de usuarios' }, { status: 400 })
    }
    const segura = data.map((u: Record<string, unknown>) => {
      const clave = u.clave as string | undefined
      return { ...u, clave: clave && !isHashed(clave) ? hashPassword(clave) : clave }
    })
    await writeList(USUARIOS_KEY, segura)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/usuarios] POST error:', err)
    return NextResponse.json({ error: 'Error al guardar usuarios' }, { status: 500 })
  }
}
