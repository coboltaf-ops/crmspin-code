import { NextRequest, NextResponse } from 'next/server'
import { getUsuariosServer } from '@/shared/lib/usuarios-server'
import { verifyPassword, signSession } from '@/shared/lib/auth-crypto'

/**
 * Login SEGURO en el servidor. Verifica la clave aquí (cifrada),
 * nunca devuelve la lista de usuarios ni las claves.
 */
export async function POST(req: NextRequest) {
  try {
    const { usuario, clave } = await req.json()
    if (!usuario || !clave) {
      return NextResponse.json({ ok: false, error: 'Faltan credenciales.' }, { status: 400 })
    }

    const usuarios = await getUsuariosServer()
    const u = usuarios.find(
      (x) =>
        String(x.usuario || '').trim().toLowerCase() === String(usuario).trim().toLowerCase() &&
        (x.situacion ?? 'Activo') === 'Activo'
    )

    if (!u || !verifyPassword(String(clave), u.clave as string)) {
      return NextResponse.json({ ok: false, error: 'Usuario o clave incorrectos.' }, { status: 401 })
    }

    const token = signSession({ usuario: u.usuario, rol: u.rol ?? '', nombre: u.nombre ?? '' })
    const safeUser = { ...u, clave: '' }
    const res = NextResponse.json({ ok: true, user: safeUser })
    res.cookies.set('palomares_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Error procesando el login.' }, { status: 500 })
  }
}
