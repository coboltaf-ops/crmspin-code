import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { destinatarios, asunto, contenido, campana_codigo, empresa_nombre, imagenes } = body

    if (!destinatarios?.length || !asunto || !contenido) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    // Preparar imagenes embebidas como attachments CID
    const attachments: { filename: string; path?: string; content?: Buffer; cid: string }[] = []
    let htmlConImagenes = contenido

    if (imagenes && Array.isArray(imagenes)) {
      for (const img of imagenes as { cid: string; url: string; filename: string }[]) {
        try {
          // Leer archivo desde public/
          const filePath = path.join(process.cwd(), 'public', img.url)
          const buffer = await readFile(filePath)
          attachments.push({
            filename: img.filename,
            content: buffer,
            cid: img.cid,
          })
          // Reemplazar URLs locales por CID en el HTML
          htmlConImagenes = htmlConImagenes.replace(
            new RegExp(`src=["']${img.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
            `src="cid:${img.cid}"`
          )
        } catch { /* si no se puede leer la imagen, se omite */ }
      }
    }

    const resultados: { email: string; estado: 'Enviado' | 'Error'; error?: string }[] = []

    for (const dest of destinatarios as { email: string; nombre: string }[]) {
      try {
        const asuntoFinal = asunto
          .replace(/\{\{nombre\}\}/g, dest.nombre)
          .replace(/\{\{empresa\}\}/g, empresa_nombre || 'CRM SPIN')
        const contenidoFinal = htmlConImagenes
          .replace(/\{\{nombre\}\}/g, dest.nombre)
          .replace(/\{\{empresa\}\}/g, empresa_nombre || 'CRM SPIN')

        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: dest.email,
          subject: asuntoFinal,
          html: contenidoFinal,
          attachments: attachments.length > 0 ? attachments : undefined,
        })

        resultados.push({ email: dest.email, estado: 'Enviado' })

        try {
          const logUrl = new URL('/api/correos-log', req.url)
          await fetch(logUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              de: process.env.SMTP_USER,
              para: dest.email,
              asunto: asuntoFinal,
              modulo: 'email-marketing',
              referencia: campana_codigo || '',
              estado: 'Enviado',
            }),
          })
        } catch { /* no bloquear */ }
      } catch (err) {
        resultados.push({ email: dest.email, estado: 'Error', error: String(err) })

        try {
          const logUrl = new URL('/api/correos-log', req.url)
          await fetch(logUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              de: process.env.SMTP_USER,
              para: dest.email,
              asunto,
              modulo: 'email-marketing',
              referencia: campana_codigo || '',
              estado: 'Error',
              detalle_error: String(err),
            }),
          })
        } catch { /* ignore */ }
      }
    }

    const enviados = resultados.filter(r => r.estado === 'Enviado').length
    const errores = resultados.filter(r => r.estado === 'Error').length

    return NextResponse.json({
      success: true,
      total: resultados.length,
      enviados,
      errores,
      resultados,
    })
  } catch (error) {
    console.error('Error en email marketing:', error)
    return NextResponse.json({ error: 'Error al enviar la campana' }, { status: 500 })
  }
}
