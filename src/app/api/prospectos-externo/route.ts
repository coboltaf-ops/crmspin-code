import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { readList, writeList } from '@/shared/lib/kv-store'

const KV_KEY = 'spin-prospectos-externos'

interface ProspectoExterno {
  id: string
  nombre: string
  apellido: string
  empresa: string
  correo: string
  nro_movil: string
  descripcion_requerimiento: string
  fecha_registro: string
  hora_registro: string
  importado: boolean
}

const readData = () => readList<ProspectoExterno>(KV_KEY)
const writeData = (data: ProspectoExterno[]) => writeList(KV_KEY, data)

// GET — listar prospectos externos pendientes
export async function GET(req: NextRequest) {
  const showAll = req.nextUrl.searchParams.get('all') === '1'
  const data = await readData()
  const result = showAll ? data : data.filter(p => !p.importado)
  return NextResponse.json({ prospectos: result, total: result.length })
}

// POST — crear nuevo prospecto desde formulario público
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, apellido, empresa, correo, nro_movil, descripcion_requerimiento } = body

    if (!nombre || !apellido || !correo || !descripcion_requerimiento) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: nombre, apellido, correo y descripción del requerimiento.' }, { status: 400 })
    }

    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(correo)) {
      return NextResponse.json({ error: 'El formato del correo electrónico no es válido.' }, { status: 400 })
    }

    const now = new Date()
    const fechaReg = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    const fechaEmail = now.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' })
    const horaReg = now.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })

    const nuevo: ProspectoExterno = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      empresa: (empresa || '').trim(),
      correo: correo.trim().toLowerCase(),
      nro_movil: (nro_movil || '').trim(),
      descripcion_requerimiento: descripcion_requerimiento.trim(),
      fecha_registro: fechaReg,
      hora_registro: horaReg,
      importado: false,
    }

    const data = await readData()
    data.push(nuevo)
    await writeData(data)

    // Enviar email de confirmación al prospecto
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#4169E1;padding:24px 28px;border-radius:12px 12px 0 0">
            <h2 style="color:#ffffff;margin:0;font-size:20px">Solicitud de Servicio Recibida</h2>
          </div>
          <div style="padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:#ffffff">
            <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0 0 20px 0">
              Apreciado(a) <strong>${nombre.trim()} ${apellido.trim()}</strong>,
            </p>
            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px 0">
              Usted ha sido recibido en nuestra Empresa con una Solicitud de Servicio.
              En momentos uno de nuestros comerciales lo va a contactar.
            </p>
            <div style="background:#f1f5f9;border-radius:10px;padding:16px 20px;margin-bottom:20px">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="color:#64748b;padding:6px 0;font-size:13px;width:140px">Nombre:</td><td style="color:#1e293b;font-weight:600;font-size:13px">${nombre.trim()} ${apellido.trim()}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Empresa:</td><td style="color:#1e293b;font-weight:600;font-size:13px">${(empresa || '—').trim()}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Fecha recepción:</td><td style="color:#1e293b;font-weight:600;font-size:13px">${fechaEmail}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0;font-size:13px">Hora recepción:</td><td style="color:#1e293b;font-weight:600;font-size:13px">${horaReg}</td></tr>
              </table>
            </div>
            <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin-bottom:20px;border:1px solid #e2e8f0">
              <p style="color:#64748b;font-size:12px;font-weight:600;margin:0 0 8px 0">Descripción del Requerimiento:</p>
              <p style="color:#1e293b;font-size:13px;line-height:1.6;margin:0">${descripcion_requerimiento.trim()}</p>
            </div>
            <p style="color:#475569;font-size:13px;line-height:1.6;margin:0">
              Agradecemos su confianza. Si tiene alguna duda, no dude en comunicarse con nosotros.
            </p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px">CRM SPIN</p>
        </div>`

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: correo.trim().toLowerCase(),
        subject: 'Solicitud de Servicio Recibida',
        html,
      })

      // Registrar correo en log
      try {
        const logUrl = new URL('/api/correos-log', req.url)
        await fetch(logUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            de: process.env.SMTP_USER,
            para: correo.trim().toLowerCase(),
            asunto: 'Solicitud de Servicio Recibida',
            modulo: 'prospectos',
            referencia: `${nombre.trim()} ${apellido.trim()}`,
            estado: 'Enviado',
          }),
        })
      } catch { /* no bloquear si falla el log */ }

    } catch (emailErr) {
      console.error('Error enviando email de confirmación:', emailErr)

      // Registrar error en log
      try {
        const logUrl = new URL('/api/correos-log', req.url)
        await fetch(logUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            de: process.env.SMTP_USER,
            para: correo.trim().toLowerCase(),
            asunto: 'Solicitud de Servicio Recibida',
            modulo: 'prospectos',
            referencia: `${nombre.trim()} ${apellido.trim()}`,
            estado: 'Error',
            detalle_error: String(emailErr),
          }),
        })
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      ok: true,
      id: nuevo.id,
      mensaje: `Gracias ${nombre}, hemos recibido su información exitosamente. Nuestro equipo comercial se pondrá en contacto con usted a la brevedad.`,
    })
  } catch {
    return NextResponse.json({ error: 'Error al procesar la solicitud.' }, { status: 500 })
  }
}

// PATCH — marcar prospectos como importados
export async function PATCH(req: NextRequest) {
  try {
    const { ids } = await req.json() as { ids: string[] }
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Se requiere un array de IDs.' }, { status: 400 })
    }
    const data = await readData()
    let count = 0
    for (const item of data) {
      if (ids.includes(item.id)) { item.importado = true; count++ }
    }
    await writeData(data)
    return NextResponse.json({ ok: true, importados: count })
  } catch {
    return NextResponse.json({ error: 'Error al procesar.' }, { status: 500 })
  }
}
