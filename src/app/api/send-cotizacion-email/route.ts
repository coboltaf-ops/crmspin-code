import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
    const impuesto = subtotal * (cotizacion.pct_impuesto / 100)
    const total = subtotal + impuesto

    // Generate PDF
    const doc = new jsPDF()
    doc.setFillColor(30, 27, 75)
    doc.rect(0, 0, 210, 32, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.text(empresa?.nombre || 'COTIZACIÓN', 14, 12)
    doc.setFontSize(9)
    if (empresa?.nro_documento) doc.text(`NIT: ${empresa.nro_documento}`, 14, 18)
    const empSub = [empresa?.direccion, empresa?.ciudad].filter(Boolean).join(', ')
    if (empSub) doc.text(empSub, 14, 23)
    doc.setFontSize(13)
    doc.text(`COTIZACIÓN ${cotizacion.codigo}`, 14, 29)
    doc.setFontSize(10)
    doc.text(`Fecha: ${fDate(cotizacion.fecha_emision)}`, 150, 16)
    doc.text(`Vence: ${fDate(cotizacion.fecha_vencimiento)}`, 150, 22)

    doc.setTextColor(0, 0, 0)

    // Bloque DATOS DEL CLIENTE
    let y = 40
    doc.setFillColor(245, 247, 250)
    doc.rect(10, y - 4, 190, 36, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 58, 138)
    doc.text('DATOS DEL CLIENTE', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(`Empresa: ${cliente?.razon_social || cotizacion.cliente_nombre || '—'}`, 14, y + 6)
    doc.text(`${cliente?.tipo_identificacion || 'ID'}: ${cliente?.nro_documento || '—'}`, 110, y + 6)
    doc.text(`Dirección: ${cliente?.direccion || '—'}`, 14, y + 12)
    doc.text(`Ciudad: ${cliente?.ciudad || '—'}`, 110, y + 12)
    doc.text(`País: ${cliente?.pais || '—'}`, 14, y + 18)
    doc.text(`Contacto: ${cotizacion.contacto_nombre || '—'}`, 110, y + 18)
    doc.text(`Condición de Pago: ${cotizacion.condicion_pago}`, 14, y + 24)
    doc.text(`Moneda: ${cotizacion.tipo_moneda || 'Pesos Colombianos'}`, 110, y + 24)
    doc.text(`Vendedor: ${cotizacion.vendedor || cotizacion.responsable}`, 14, y + 30)
    y += 36

    autoTable(doc, {
      startY: y + 4,
      head: [['Código', 'Descripción', 'Cant.', 'Unidad', 'Precio Unit.', 'Desc.%', 'Subtotal']],
      body: cotizacion.detalles.map((d: { codigo_producto: string; descripcion: string; cantidad: number; unidad_medida: string; precio_unitario: number; descuento_pct: number; subtotal: number }) => [
        d.codigo_producto, d.descripcion, d.cantidad, d.unidad_medida,
        `${fmtMoney(d.precio_unitario)}`, `${d.descuento_pct}%`, `${fmtMoney(d.subtotal)}`
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 27, 75], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 150
    doc.setFontSize(10)
    doc.text(`Subtotal: ${fmtMoney(subtotal)}`, 140, finalY + 10)
    doc.text(`Impuesto (${cotizacion.pct_impuesto}%): ${fmtMoney(impuesto)}`, 140, finalY + 16)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`TOTAL: ${fmtMoney(total)}`, 140, finalY + 24)

    if (cotizacion.observaciones) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Observaciones: ${cotizacion.observaciones}`, 14, finalY + 10)
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Email HTML
    const html = `
      <div style="font-family:Arial;max-width:600px;margin:0 auto">
        <div style="background:#1e1b4b;padding:20px;border-radius:10px 10px 0 0">
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
          <div style="text-align:right;font-size:14px">
            <p>Subtotal: <strong>${fmtMoney(subtotal)}</strong></p>
            <p>Impuesto (${cotizacion.pct_impuesto}%): <strong>${fmtMoney(impuesto)}</strong></p>
            <p style="font-size:18px;color:#1e1b4b">Total: <strong>${fmtMoney(total)}</strong></p>
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
