import jsPDF from 'jspdf'
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable'

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const VERDE: [number, number, number] = [15, 118, 110]
const NEGRO_SUAVE: [number, number, number] = [130, 140, 155]
const BLANCO_SUAVE: [number, number, number] = [249, 250, 251]
const ROJO: [number, number, number] = [220, 38, 38]
const LIMA: [number, number, number] = [144, 224, 210]
const GRIS_BORDE: [number, number, number] = [80, 85, 95]
const GRIS_LINEA: [number, number, number] = [180, 180, 180]
const GRIS_TEXTO: [number, number, number] = [55, 65, 81]

export async function GET(req: Request) {
  let empresaDB: { nombre?: string; logo_url?: string; nro_documento?: string; ciudad?: string } = {}
  try {
    const empresaUrl = new URL('/api/empresa-publico', req.url)
    const empresaRes = await fetch(empresaUrl.toString(), { cache: 'no-store' })
    if (empresaRes.ok) empresaDB = await empresaRes.json()
  } catch { /* sigue con valores de muestra */ }

  const empresa = {
    nombre: empresaDB.nombre || 'SILICATOS PARA LA INDUSTRIA S.A.S',
    logo_url: empresaDB.logo_url || '',
    nit: empresaDB.nro_documento || '890.908.711 - 6',
    direccion1: 'KM 2 VÍA AMAGA-CALDAS.',
    direccion2: 'BOD 11 CE EL DORAL LA TOLVA',
    tel: 'TEL: 288 00 55',
    ciudad: empresaDB.ciudad || 'CALDAS - ANTIOQUIA',
    email: 'info@spinsa.com.co',
    web: 'www.spinsa.com.co',
    regimen: ['IVA REGIMEN COMUN', 'NO SOMOS GRANDES CONTRIBUYENTES', 'NO SOMOS RETENEDORES DE IVA'],
  }

  const cotizacion = {
    codigo: 'QUO947',
    fecha: '23-04-2026',
    vence: '30-04-2026',
    cond_pago: 'Contado',
  }

  const cliente = {
    nombre: 'RALYXXTON AUTOMOTRIZ SAS',
    nit: '900424784',
    direccion: 'CR 60 45 A 28',
    ciudad: 'MEDELLIN',
    vendedor: 'Lorena Avila',
  }

  const productos = [
    { cod: '60480283', nombre: 'Varsil E3', precio: 3253.0, cantidad: 150, total: 487950.0 },
  ]

  const subtotal = productos.reduce((s, p) => s + p.total, 0)
  const descuento = 0
  const iva = +(subtotal * 0.19).toFixed(2)
  const retIva = 0
  const retFuente = 0
  const total = subtotal - descuento + iva - retIva - retFuente

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const lx = 10
  const ly = 11
  let logoDibujado = false
  const logoUrl = empresa.logo_url
  if (logoUrl) {
    let fmt: 'PNG' | 'JPEG' | null = null
    if (logoUrl.startsWith('data:image/png')) fmt = 'PNG'
    else if (logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/jpg')) fmt = 'JPEG'
    if (fmt) {
      try {
        doc.addImage(logoUrl, fmt, lx, ly, 50, 19)
        logoDibujado = true
      } catch { /* cae al placeholder */ }
    }
  }
  if (!logoDibujado) {
    doc.setFillColor(...ROJO)
    doc.triangle(lx + 2, ly + 18, lx + 14, ly + 18, lx + 8, ly + 2, 'F')
    doc.setFillColor(255, 255, 255)
    doc.triangle(lx + 5, ly + 16, lx + 11, ly + 16, lx + 8, ly + 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...VERDE)
    doc.text('SPIN', lx + 16, ly + 15)
    doc.setFontSize(7)
    doc.text('®', lx + 33.5, ly + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(80)
    doc.text('Silicatos para la industria S.A.S', lx, ly + 23)
  }

  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(empresa.nombre, 105, 14, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_TEXTO)
  let yE = 19
  for (const line of [empresa.nit, empresa.direccion1, empresa.direccion2, empresa.tel, empresa.ciudad, empresa.email, empresa.web]) {
    doc.text(line, 105, yE, { align: 'center' })
    yE += 4
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(0)
  doc.text('COTIZACIÓN', 195, 14, { align: 'right' })
  doc.setFontSize(10)
  doc.text(`No. ${cotizacion.codigo}`, 195, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_TEXTO)
  let yR = 26
  for (const line of empresa.regimen) {
    doc.text(line, 195, yR, { align: 'right' })
    yR += 4
  }

  let y = 55
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0)
  doc.text('CLIENTE:', 14, y)
  doc.text('NIT:', 14, y + 5)
  doc.text('DIRECCIÓN:', 14, y + 10)
  doc.text('CIUDAD:', 14, y + 15)
  doc.text('VENDEDOR:', 14, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS_TEXTO)
  doc.text(cliente.nombre, 38, y)
  doc.text(cliente.nit, 38, y + 5)
  doc.text(cliente.direccion, 38, y + 10)
  doc.text(cliente.ciudad, 38, y + 15)
  doc.text(cliente.vendedor, 38, y + 20)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('FECHA DE COTIZACIÓN', 120, y)
  doc.text('FECHA VENCIMIENTO', 165, y)
  doc.setDrawColor(...GRIS_LINEA)
  doc.setLineWidth(0.2)
  doc.line(118, y + 1.5, 198, y + 1.5)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(cotizacion.fecha, 132, y + 6, { align: 'center' })
  doc.text(cotizacion.vence, 175, y + 6, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...VERDE)
  doc.text('COND. DE PAGO', 165, y + 14, { align: 'center' })
  doc.setDrawColor(...GRIS_LINEA)
  doc.line(140, y + 15.5, 190, y + 15.5)
  doc.setTextColor(...GRIS_TEXTO)
  doc.setFont('helvetica', 'normal')
  const condW = doc.getTextWidth(cotizacion.cond_pago) + 8
  doc.setFillColor(...LIMA)
  doc.rect(165 - condW / 2, y + 17.5, condW, 5.5, 'F')
  doc.text(cotizacion.cond_pago, 165, y + 21.2, { align: 'center' })

  const headers = [['Cod.', 'Producto', 'Precio Unitario', 'Cantidad', 'Total']]
  const productRows: RowInput[] = productos.map((p) => [
    p.cod,
    p.nombre,
    fmtMoney(p.precio),
    fmtMoney(p.cantidad),
    fmtMoney(p.total),
  ])

  const labelCell = (text: string, emphasis = false): CellDef => ({
    content: text,
    colSpan: 2,
    styles: {
      halign: 'right',
      fontStyle: 'bold',
      fillColor: BLANCO_SUAVE,
      textColor: [0, 0, 0],
      fontSize: emphasis ? 10 : 9,
    },
  })
  const valueCell = (text: string, emphasis = false): CellDef => ({
    content: text,
    styles: {
      halign: 'right',
      fontStyle: emphasis ? 'bold' : 'normal',
      fillColor: BLANCO_SUAVE,
      textColor: emphasis ? [0, 0, 0] : GRIS_TEXTO,
      fontSize: emphasis ? 10 : 9,
    },
  })
  const emptyCell: CellDef = {
    content: '',
    colSpan: 2,
    styles: { fillColor: BLANCO_SUAVE },
  }

  const totalesRows: RowInput[] = [
    [emptyCell, labelCell('Sub Total'), valueCell(`$ ${fmtMoney(subtotal)}`)],
    [emptyCell, labelCell('Descuento'), valueCell(descuento ? `$ ${fmtMoney(descuento)}` : '')],
    [emptyCell, labelCell('IVA 19%'), valueCell(`$ ${fmtMoney(iva)}`)],
    [emptyCell, labelCell('Retencion IVA'), valueCell(`$ ${fmtMoney(retIva)}`)],
    [emptyCell, labelCell('Retención fuente'), valueCell(`$ ${fmtMoney(retFuente)}`)],
    [emptyCell, labelCell('Total Cotización', true), valueCell(`$ ${fmtMoney(total)}`, true)],
  ]

  autoTable(doc, {
    startY: 90,
    head: headers,
    body: [...productRows, ...totalesRows],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, lineColor: GRIS_BORDE, lineWidth: 0.1, textColor: GRIS_TEXTO },
    headStyles: { fillColor: NEGRO_SUAVE, textColor: [255, 255, 255], halign: 'center', fontStyle: 'bold' },
    bodyStyles: { fillColor: BLANCO_SUAVE },
    columnStyles: {
      0: { halign: 'left', cellWidth: 25 },
      1: { halign: 'left', cellWidth: 70 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: 12, right: 12 },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0)
  doc.text('OBSERVACIONES:', 14, finalY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_TEXTO)
  const obs =
    'La sociedad SPIN S.A.S., en virtud del Sistema de Autocontrol y Gestión del Riesgo Integral de Lavado de Activos, Financiación del Terrorismo y el Financiamiento de la Proliferación de Armas de Destrucción Masiva – SAGRILAFT, debe tener un conocimiento responsable de todos sus clientes, por lo tanto, al usted aceptar la cotización presentada, se compromete a cumplir con todos los lineamientos de vinculación que se deben agotar en aras de garantizar el óptimo cumplimiento del SAGRILAFT. En caso de aprobar nuestra propuesta de servicios amablemente le pedimos no realizar ningún pago hasta que el respectivo funcionario de SPIN S.A.S., así se lo requiera y adicionalmente le solicitamos el envío de la constancia de su documento de identificación (copia cédula o certificado de existencia y representación legal con una fecha de expedición inferior a 30 días). Agradecemos su comprensión y colaboración.'
  const lines = doc.splitTextToSize(obs, 186)
  doc.text(lines, 14, finalY + 6)

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview-cotizacion.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}
