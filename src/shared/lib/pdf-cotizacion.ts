import jsPDF from 'jspdf'
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable'

export interface CotizacionPdfEmpresa {
  nombre: string
  logo_url?: string
  nit?: string
  direccion?: string
  ciudad?: string
  telefono?: string
  correo?: string
  pagina_web?: string
  regimen?: string[]
}

export interface CotizacionPdfCliente {
  razon_social: string
  nit?: string
  direccion?: string
  ciudad?: string
  vendedor?: string
}

export interface CotizacionPdfDetalle {
  codigo: string
  descripcion: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export interface CotizacionPdfData {
  codigo: string
  fecha_emision: string
  fecha_vencimiento: string
  condicion_pago: string
  detalles: CotizacionPdfDetalle[]
  pct_impuesto: number
  pct_retencion?: number
  pct_retencion_iva?: number
  descuento?: number
  observaciones?: string
  anulada?: boolean
}

export interface GenerarCotizacionPdfInput {
  empresa: CotizacionPdfEmpresa
  cliente: CotizacionPdfCliente
  cotizacion: CotizacionPdfData
}

const VERDE: [number, number, number] = [15, 118, 110]
const NEGRO_SUAVE: [number, number, number] = [130, 140, 155]
const BLANCO_SUAVE: [number, number, number] = [249, 250, 251]
const ROJO: [number, number, number] = [220, 38, 38]
const LIMA: [number, number, number] = [144, 224, 210]
const GRIS_BORDE: [number, number, number] = [80, 85, 95]
const GRIS_LINEA: [number, number, number] = [180, 180, 180]
const GRIS_TEXTO: [number, number, number] = [55, 65, 81]

const SAGRILAFT_TEXTO =
  'La sociedad SPIN S.A.S., en virtud del Sistema de Autocontrol y Gestión del Riesgo Integral de Lavado de Activos, Financiación del Terrorismo y el Financiamiento de la Proliferación de Armas de Destrucción Masiva – SAGRILAFT, debe tener un conocimiento responsable de todos sus clientes, por lo tanto, al usted aceptar la cotización presentada, se compromete a cumplir con todos los lineamientos de vinculación que se deben agotar en aras de garantizar el óptimo cumplimiento del SAGRILAFT. En caso de aprobar nuestra propuesta de servicios amablemente le pedimos no realizar ningún pago hasta que el respectivo funcionario de SPIN S.A.S., así se lo requiera y adicionalmente le solicitamos el envío de la constancia de su documento de identificación (copia cédula o certificado de existencia y representación legal con una fecha de expedición inferior a 30 días). Agradecemos su comprensión y colaboración.'

const REGIMEN_DEFAULT = ['IVA REGIMEN COMUN', 'NO SOMOS GRANDES CONTRIBUYENTES', 'NO SOMOS RETENEDORES DE IVA']

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fDate(d: string) {
  if (!d) return ''
  if (d.includes('-') && d.length >= 10) {
    const [y, m, day] = d.split('-')
    return `${day}-${m}-${y}`
  }
  return d
}

export function generarCotizacionPdf(input: GenerarCotizacionPdfInput): jsPDF {
  const { empresa, cliente, cotizacion } = input

  const subtotal = cotizacion.detalles.reduce((s, d) => s + d.subtotal, 0)
  const descuento = cotizacion.descuento || 0
  const pctImpuesto = cotizacion.pct_impuesto ?? 19
  const pctRetFuente = cotizacion.pct_retencion || 0
  const pctRetIva = cotizacion.pct_retencion_iva || 0
  const baseImponible = subtotal - descuento
  const iva = +(baseImponible * (pctImpuesto / 100)).toFixed(2)
  const retIva = +(baseImponible * (pctRetIva / 100)).toFixed(2)
  const retFuente = +(baseImponible * (pctRetFuente / 100)).toFixed(2)
  const total = baseImponible + iva - retIva - retFuente

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // === LOGO ===
  const lx = 10
  const ly = 11
  let logoDibujado = false
  const logoUrl = empresa.logo_url || ''
  if (logoUrl) {
    let fmt: 'PNG' | 'JPEG' | null = null
    if (logoUrl.startsWith('data:image/png')) fmt = 'PNG'
    else if (logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/jpg')) fmt = 'JPEG'
    if (fmt) {
      try {
        doc.addImage(logoUrl, fmt, lx, ly, 50, 19)
        logoDibujado = true
      } catch { /* placeholder */ }
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

  // === EMPRESA (centro) ===
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(empresa.nombre, 105, 14, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_TEXTO)
  const empLines = [
    empresa.nit ? empresa.nit : '',
    empresa.direccion || '',
    empresa.telefono ? `TEL: ${empresa.telefono}` : '',
    empresa.ciudad || '',
    empresa.correo || '',
    empresa.pagina_web || '',
  ].filter(Boolean)
  let yE = 19
  for (const line of empLines) {
    doc.text(line, 105, yE, { align: 'center' })
    yE += 4
  }

  // === COTIZACIÓN + RÉGIMEN (derecha) ===
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(0)
  doc.text('COTIZACIÓN', 195, 14, { align: 'right' })
  doc.setFontSize(10)
  doc.text(`No. ${cotizacion.codigo}`, 195, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_TEXTO)
  const regimen = empresa.regimen && empresa.regimen.length ? empresa.regimen : REGIMEN_DEFAULT
  let yR = 26
  for (const line of regimen) {
    doc.text(line, 195, yR, { align: 'right' })
    yR += 4
  }

  // === BLOQUE CLIENTE (izquierda) ===
  const y = 55
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
  doc.text(cliente.razon_social || '—', 38, y)
  doc.text(cliente.nit || '—', 38, y + 5)
  doc.text(cliente.direccion || '—', 38, y + 10)
  doc.text(cliente.ciudad || '—', 38, y + 15)
  doc.text(cliente.vendedor || '—', 38, y + 20)

  // === FECHAS (derecha) ===
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('FECHA DE COTIZACIÓN', 120, y)
  doc.text('FECHA VENCIMIENTO', 165, y)
  doc.setDrawColor(...GRIS_LINEA)
  doc.setLineWidth(0.2)
  doc.line(118, y + 1.5, 198, y + 1.5)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(fDate(cotizacion.fecha_emision), 132, y + 6, { align: 'center' })
  doc.text(fDate(cotizacion.fecha_vencimiento), 175, y + 6, { align: 'center' })

  // === COND. DE PAGO ===
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...VERDE)
  doc.text('COND. DE PAGO', 165, y + 14, { align: 'center' })
  doc.setDrawColor(...GRIS_LINEA)
  doc.line(140, y + 15.5, 190, y + 15.5)
  doc.setTextColor(...GRIS_TEXTO)
  doc.setFont('helvetica', 'normal')
  const condText = cotizacion.condicion_pago || '—'
  const condW = doc.getTextWidth(condText) + 8
  doc.setFillColor(...LIMA)
  doc.rect(165 - condW / 2, y + 17.5, condW, 5.5, 'F')
  doc.text(condText, 165, y + 21.2, { align: 'center' })

  // === TABLA PRODUCTOS + TOTALES ===
  const headers = [['Cod.', 'Producto', 'Precio Unitario', 'Cantidad', 'Total']]
  const productRows: RowInput[] = cotizacion.detalles.map((d) => [
    d.codigo,
    d.descripcion,
    fmtMoney(d.precio_unitario),
    fmtMoney(d.cantidad),
    fmtMoney(d.subtotal),
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
    [emptyCell, labelCell(`IVA ${pctImpuesto}%`), valueCell(`$ ${fmtMoney(iva)}`)],
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

  // === OBSERVACIONES ===
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0)
  doc.text('OBSERVACIONES:', 14, finalY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIS_TEXTO)
  const obsTexto = cotizacion.observaciones ? `${cotizacion.observaciones}\n\n${SAGRILAFT_TEXTO}` : SAGRILAFT_TEXTO
  const lines = doc.splitTextToSize(obsTexto, 186)
  doc.text(lines, 14, finalY + 6)

  // === ANULADA (sello rojo) ===
  if (cotizacion.anulada) {
    doc.setTextColor(...ROJO)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(48)
    doc.text('ANULADA', 105, 150, { align: 'center', angle: -25 })
  }

  return doc
}
