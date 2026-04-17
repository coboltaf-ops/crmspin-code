import { NextRequest, NextResponse } from 'next/server'
import { readdir, unlink, stat } from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const modulo = searchParams.get('modulo')
  const registroId = searchParams.get('registroId')

  if (!modulo || !registroId) {
    return NextResponse.json({ files: [] })
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', modulo, registroId)

  try {
    const entries = await readdir(dir)
    const files = await Promise.all(
      entries.map(async (filename) => {
        const filePath = path.join(dir, filename)
        const info = await stat(filePath)
        // filename format: timestamp-originalname
        const nombre = filename.replace(/^\d+-/, '')
        return {
          filename,
          nombre,
          url: `/uploads/${modulo}/${registroId}/${filename}`,
          tamano: info.size,
          fecha: info.mtime.toISOString(),
        }
      })
    )
    files.sort((a, b) => b.fecha.localeCompare(a.fecha))
    return NextResponse.json({ files })
  } catch {
    return NextResponse.json({ files: [] })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const modulo = searchParams.get('modulo')
  const registroId = searchParams.get('registroId')
  const filename = searchParams.get('filename')

  if (!modulo || !registroId || !filename) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  // Security: prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return NextResponse.json({ error: 'Nombre inválido' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', modulo, registroId, filename)

  try {
    await unlink(filePath)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 })
  }
}
