import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { generarCotizacionPdf } from '@/shared/lib/pdf-cotizacion'

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export async function POST(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let to = '', asunto = '', mensaje = '', cotizacion: any = {}, cliente: any = null, empresa: any = null
  try {
    const body = await req.json()
    to = body.to; asunto = body.asunto; mensaje = body.mensaje; cotizacion = body.cotizacion
    cliente = body.cliente || null; empresa = body.empresa || null

    if (!to || !cotizacion?.codigo) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const subtotal = cotizacion.detalles.reduce((s: number, d: { subtotal: number }) => s + d.subtotal, 0)
    const impuesto = subtotal * ((cotizacion.pct_impuesto || 0) / 100)
    const retencion = subtotal * ((cotizacion.pct_retencion || 0) / 100)
    const total = subtotal + impuesto - retencion

    // Generate PDF con el formato SPIN
    const doc = generarCotizacionPdf({
      empresa: {
        nombre: empresa?.nombre || 'COTIZACIÓN',
        logo_url: empresa?.logo_url,
        nit: empresa?.nro_documento,
        direccion: empresa?.direccion,
        telefono: empresa?.telefono,
        ciudad: empresa?.ciudad,
        correo: empresa?.correo,
        pagina_web: empresa?.pagina_web,
      },
      cliente: {
        razon_social: cliente?.razon_social || cotizacion.cliente_nombre || '—',
        nit: cliente?.nro_documento,
        direccion: cliente?.direccion,
        ciudad: cliente?.ciudad,
        vendedor: cotizacion.vendedor || cotizacion.responsable,
      },
      cotizacion: {
        codigo: cotizacion.codigo,
        fecha_emision: cotizacion.fecha_emision,
        fecha_vencimiento: cotizacion.fecha_vencimiento,
        condicion_pago: cotizacion.condicion_pago,
        pct_impuesto: cotizacion.pct_impuesto || 19,
        pct_retencion: cotizacion.pct_retencion || 0,
        observaciones: cotizacion.observaciones,
        detalles: cotizacion.detalles.map((d: { codigo_producto: string; descripcion: string; cantidad: number; precio_unitario: number; subtotal: number }) => ({
          codigo: d.codigo_producto,
          descripcion: d.descripcion,
          precio_unitario: d.precio_unitario,
          cantidad: d.cantidad,
          subtotal: d.subtotal,
        })),
        anulada: cotizacion.situacion === 'Anulada',
      },
    })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Email HTML
    const html = `
      <div style="font-family:Arial;max-width:600px;margin:0 auto">
        <div style="background:#1e3a8a;padding:20px;border-radius:10px 10px 0 0">
          <h2 style="color:#fff;margin:0">Cotización ${cotizacion.codigo}</h2>
        </div>
        <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
          ${mensaje ? `<p style="margin-bottom:16px">${mensaje}</p>` : ''}
          <table style="width:100%;margin-bottom:16px">
            <tr><td style="color:#6b7280;padding:4px 0">Empresa:</td><td style="font-weight:600">${cotizacion.cliente_nombre}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0">Fecha:</td><td>${fDate(cotizacion.fecha_emision)}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0">Vencimiento:</td><td>${fDate(cotizacion.fecha_vencimiento)}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0">Condición:</td><td>${cotizacion.condicion_pago}</td></tr>
          </table>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead><tr style="background:#f3f4f6">
              <th style="padding:8px;text-align:left;font-size:12px;border-bottom:2px solid #e5e7eb">Producto</th>
              <th style="padding:8px;text-align:center;font-size:12px;border-bottom:2px solid #e5e7eb">Cant.</th>
              <th style="padding:8px;text-align:right;font-size:12px;border-bottom:2px solid #e5e7eb">Subtotal</th>
            </tr></thead>
            <tbody>
              ${cotizacion.detalles.map((d: { descripcion: string; cantidad: number; subtotal: number }, i: number) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
                  <td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #e5e7eb">${d.descripcion}</td>
                  <td style="padding:6px 8px;font-size:12px;text-align:center;border-bottom:1px solid #e5e7eb">${d.cantidad}</td>
                  <td style="padding:6px 8px;font-size:12px;text-align:right;border-bottom:1px solid #e5e7eb">${fmtMoney(d.subtotal)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div style="text-align:right;font-size:14px;background:#f9fafb;padding:14px 16px;border-radius:8px;border:1px solid #e5e7eb">
            <p style="margin:4px 0">Subtotal antes de impuestos: <strong>${fmtMoney(subtotal)}</strong></p>
            <p style="margin:4px 0">Monto IVA (${cotizacion.pct_impuesto || 0}%): <strong>${fmtMoney(impuesto)}</strong></p>
            <p style="margin:4px 0;color:#b91c1c">Retención (${cotizacion.pct_retencion || 0}%): <strong>−${fmtMoney(retencion)}</strong></p>
            <p style="font-size:18px;color:#1e3a8a;border-top:2px solid #1e3a8a;padding-top:8px;margin-top:8px">VALOR NETO A PAGAR: <strong>${fmtMoney(total)}</strong></p>
          </div>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">CRM SPIN</p>
      </div>`

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: asunto || `Cotización ${cotizacion.codigo}`,
      html,
      attachments: [{ filename: `${cotizacion.codigo}.pdf`, content: pdfBuffer }],
    })

    // Registrar correo en log
    try {
      const logUrl = new URL('/api/correos-log', req.url)
      await fetch(logUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          de: process.env.SMTP_USER,
          para: to,
          asunto: asunto || `Cotización ${cotizacion.codigo}`,
          modulo: 'cotizaciones',
          referencia: cotizacion.codigo,
          estado: 'Enviado',
        }),
      })
    } catch { /* no bloquear si falla el log */ }

    return NextResponse.json({ success: true, message: 'Cotización enviada correctamente' })
  } catch (error) {
    console.error('Error sending cotizacion email:', error)

    // Registrar error en log
    try {
      const logUrl = new URL('/api/correos-log', req.url)
      await fetch(logUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          de: process.env.SMTP_USER,
          para: to,
          asunto: asunto || 'Cotización',
          modulo: 'cotizaciones',
          referencia: cotizacion?.codigo || '',
          estado: 'Error',
          detalle_error: String(error),
        }),
      })
    } catch { /* ignore */ }

    return NextResponse.json({ error: 'Error al enviar el correo' }, { status: 500 })
  }
}
