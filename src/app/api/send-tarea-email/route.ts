import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { to, nombre_ejecuta, codigo, descripcion, fecha_requerida, persona_asigna } = body

    if (!to || !codigo) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e3a8a;padding:20px;border-radius:10px 10px 0 0">
          <h2 style="color:#fff;margin:0;font-size:18px">Nueva Tarea Asignada</h2>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">${codigo}</p>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
          <p style="margin-bottom:16px;font-size:14px">Hola <strong>${nombre_ejecuta}</strong>,</p>
          <p style="margin-bottom:16px;font-size:14px">Se te ha asignado una nueva tarea. A continuacion los detalles:</p>
          <table style="width:100%;margin-bottom:16px;border-collapse:collapse">
            <tr><td style="color:#6b7280;padding:8px 0;font-size:13px;border-bottom:1px solid #f3f4f6">Codigo:</td><td style="font-weight:600;padding:8px 0;font-size:13px;border-bottom:1px solid #f3f4f6">${codigo}</td></tr>
            <tr><td style="color:#6b7280;padding:8px 0;font-size:13px;border-bottom:1px solid #f3f4f6">Asignada por:</td><td style="font-weight:600;padding:8px 0;font-size:13px;border-bottom:1px solid #f3f4f6">${persona_asigna}</td></tr>
            <tr><td style="color:#6b7280;padding:8px 0;font-size:13px;border-bottom:1px solid #f3f4f6">Fecha requerida:</td><td style="font-weight:600;padding:8px 0;font-size:13px;border-bottom:1px solid #f3f4f6">${fecha_requerida}</td></tr>
          </table>
          <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px">
            <p style="color:#6b7280;font-size:11px;margin-bottom:4px;font-weight:600">DESCRIPCION</p>
            <p style="font-size:13px;line-height:1.6;margin:0">${descripcion}</p>
          </div>
          <p style="font-size:12px;color:#9ca3af;margin:0">Ingrese al CRM SPIN para gestionar esta tarea.</p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">CRM SPIN - Gestion de Tareas</p>
      </div>`

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: `Nueva tarea asignada: ${codigo}`,
      html,
    })

    // Registrar en log de correos
    try {
      const logUrl = new URL('/api/correos-log', req.url)
      await fetch(logUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          de: process.env.SMTP_USER,
          para: to,
          asunto: `Nueva tarea asignada: ${codigo}`,
          modulo: 'tareas',
          referencia: codigo,
          estado: 'Enviado',
        }),
      })
    } catch { /* no bloquear */ }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error enviando email de tarea:', error)

    try {
      const body = await req.clone().json().catch(() => ({}))
      const logUrl = new URL('/api/correos-log', req.url)
      await fetch(logUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          de: process.env.SMTP_USER,
          para: (body as { to?: string }).to || '',
          asunto: 'Nueva tarea asignada',
          modulo: 'tareas',
          referencia: (body as { codigo?: string }).codigo || '',
          estado: 'Error',
          detalle_error: String(error),
        }),
      })
    } catch { /* ignore */ }

    return NextResponse.json({ error: 'Error al enviar el correo' }, { status: 500 })
  }
}
