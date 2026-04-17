import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const modulo = formData.get('modulo') as string | null
    const registroId = formData.get('registroId') as string | null

    if (!file || !modulo || !registroId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    if (file.size > 52428800) {
      return NextResponse.json({ error: 'Archivo supera 50 MB' }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_')
    const timestamp = Date.now()
    const filename = `${timestamp}-${safeName}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', modulo, registroId)
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, filename), buffer)

    return NextResponse.json({
      filename,
      nombre: file.name,
      tipo: file.type,
      tamano: file.size,
      url: `/uploads/${modulo}/${registroId}/${filename}`,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}
