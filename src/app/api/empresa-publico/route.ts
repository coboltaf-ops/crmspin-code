import { NextRequest, NextResponse } from 'next/server'
import { put, list } from '@vercel/blob'

const BLOB_PATH = 'empresa-publico.json'

interface EmpresaPublica {
  nombre: string
  logo_url: string
  nro_documento?: string
  ciudad?: string
}

// GET — leer info pública de la empresa (para formularios públicos)
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 })
    const found = blobs.find(b => b.pathname === BLOB_PATH)
    if (!found) return NextResponse.json({ nombre: '', logo_url: '' })
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(found.url, { cache: 'no-store', headers })
    if (!res.ok) return NextResponse.json({ nombre: '', logo_url: '' })
    const data = (await res.json()) as EmpresaPublica
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ nombre: '', logo_url: '' })
  }
}

// POST — sincronizar info de empresa desde el CRM admin
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body || typeof body.nombre !== 'string') {
      return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })
    }
    const empresa: EmpresaPublica = {
      nombre: body.nombre || '',
      logo_url: body.logo_url || '',
      nro_documento: body.nro_documento || '',
      ciudad: body.ciudad || '',
    }
    await put(BLOB_PATH, JSON.stringify(empresa), {
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
      addRandomSuffix: false,
    } as Parameters<typeof put>[2])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}