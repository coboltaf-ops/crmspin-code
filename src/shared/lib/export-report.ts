import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type ReportColumn = { header: string; key: string; width?: number }
export type EmpresaInfo = { nombre?: string; nro_documento?: string; direccion?: string; ciudad?: string }
type ReportOptions = {
  title: string; subtitle?: string; columns: ReportColumn[]
  rows: Record<string, string | number>[]; filename?: string
  empresa?: EmpresaInfo
}

export function exportToPDF(opts: ReportOptions) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const empNombre = opts.empresa?.nombre || ''
  const empSub = [opts.empresa?.nro_documento ? `NIT: ${opts.empresa.nro_documento}` : '', opts.empresa?.direccion, opts.empresa?.ciudad].filter(Boolean).join(' · ')
  const headerH = empNombre ? 36 : 28
  doc.setFillColor(30, 27, 75)
  doc.rect(0, 0, 297, headerH, 'F')
  doc.setTextColor(255, 255, 255)
  if (empNombre) {
    doc.setFontSize(14); doc.text(empNombre, 14, 12)
    if (empSub) { doc.setFontSize(9); doc.text(empSub, 14, 18) }
    doc.setFontSize(13); doc.text(opts.title, 14, 28)
    if (opts.subtitle) { doc.setFontSize(9); doc.text(opts.subtitle, 14, 33) }
  } else {
    doc.setFontSize(16); doc.text(opts.title, 14, 14)
    if (opts.subtitle) { doc.setFontSize(10); doc.text(opts.subtitle, 14, 22) }
  }
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: headerH + 6,
    head: [opts.columns.map(c => c.header)],
    body: opts.rows.map(r => opts.columns.map(c => String(r[c.key] ?? ''))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 27, 75], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  })

  doc.save(`${opts.filename || opts.title}.pdf`)
}

export function exportToExcel(opts: ReportOptions) {
  const headers = opts.columns.map(c => c.header)
  const data = opts.rows.map(r => opts.columns.map(c => r[c.key] ?? ''))
  const empHeader: (string | number)[][] = []
  if (opts.empresa?.nombre) {
    empHeader.push([opts.empresa.nombre])
    const sub = [opts.empresa.nro_documento ? `NIT: ${opts.empresa.nro_documento}` : '', opts.empresa.direccion, opts.empresa.ciudad].filter(Boolean).join(' · ')
    if (sub) empHeader.push([sub])
    empHeader.push([opts.title])
    empHeader.push([])
  }
  const ws = XLSX.utils.aoa_to_sheet([...empHeader, headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
  XLSX.writeFile(wb, `${opts.filename || opts.title}.xlsx`)
}

export function printReport(opts: ReportOptions) {
  const rows = opts.rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">${opts.columns.map(c => `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${r[c.key] ?? ''}</td>`).join('')}</tr>`).join('')
  const empNombre = opts.empresa?.nombre || ''
  const empSub = [opts.empresa?.nro_documento ? `NIT: ${opts.empresa.nro_documento}` : '', opts.empresa?.direccion, opts.empresa?.ciudad].filter(Boolean).join(' · ')
  const empBlock = empNombre ? `
    <div style="border-bottom:3px solid #1e1b4b;padding-bottom:12px;margin-bottom:16px">
      <h1 style="color:#1e1b4b;font-size:20px;font-weight:800;margin:0">${empNombre}</h1>
      ${empSub ? `<p style="color:#6b7280;font-size:12px;margin:4px 0 0 0">${empSub}</p>` : ''}
    </div>` : ''
  const html = `<!DOCTYPE html><html><head><title>${opts.title}</title></head><body style="font-family:Arial;padding:20px">
    ${empBlock}
    <h2 style="color:#1e1b4b">${opts.title}</h2>${opts.subtitle ? `<p style="color:#6b7280">${opts.subtitle}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <thead><tr>${opts.columns.map(c => `<th style="padding:8px 10px;background:#1e1b4b;color:#fff;font-size:11px;text-align:left">${c.header}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;font-size:11px;color:#9ca3af">${opts.rows.length} registros | Generado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
    <script>window.onload=()=>window.print()<\/script></body></html>`
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
