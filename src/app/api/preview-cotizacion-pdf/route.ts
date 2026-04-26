import { generarCotizacionPdf } from '@/shared/lib/pdf-cotizacion'

export async function GET(req: Request) {
  let empresaDB: { nombre?: string; logo_url?: string; nro_documento?: string; ciudad?: string } = {}
  try {
    const empresaUrl = new URL('/api/empresa-publico', req.url)
    const empresaRes = await fetch(empresaUrl.toString(), { cache: 'no-store' })
    if (empresaRes.ok) empresaDB = await empresaRes.json()
  } catch { /* sigue con valores de muestra */ }

  const doc = generarCotizacionPdf({
    empresa: {
      nombre: empresaDB.nombre || 'SILICATOS PARA LA INDUSTRIA S.A.S',
      logo_url: empresaDB.logo_url,
      nit: empresaDB.nro_documento || '890.908.711 - 6',
      direccion: 'KM 2 VÍA AMAGA-CALDAS. BOD 11 CE EL DORAL LA TOLVA',
      telefono: '288 00 55',
      ciudad: empresaDB.ciudad || 'CALDAS - ANTIOQUIA',
      correo: 'info@spinsa.com.co',
      pagina_web: 'www.spinsa.com.co',
    },
    cliente: {
      razon_social: 'RALYXXTON AUTOMOTRIZ SAS',
      nit: '900424784',
      direccion: 'CR 60 45 A 28',
      ciudad: 'MEDELLIN',
      vendedor: 'Lorena Avila',
    },
    cotizacion: {
      codigo: 'QUO947',
      fecha_emision: '2026-04-23',
      fecha_vencimiento: '2026-04-30',
      condicion_pago: 'Contado',
      pct_impuesto: 19,
      pct_retencion: 0,
      detalles: [
        { codigo: '60480283', descripcion: 'Varsil E3', precio_unitario: 3253, cantidad: 150, subtotal: 487950 },
      ],
    },
  })

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview-cotizacion.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}
