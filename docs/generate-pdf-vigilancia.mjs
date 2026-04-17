import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

const doc = new jsPDF({ unit: 'mm', format: 'a4' })
const W = 210, M = 18
let y = 20

const COLOR_PRIMARY = [30, 27, 75]
const COLOR_ACCENT = [30, 58, 138]
const COLOR_MUTED = [107, 114, 128]

function checkPage(needed = 20) {
  if (y + needed > 280) { doc.addPage(); y = 20 }
}
function h1(text) {
  checkPage(20)
  doc.setFillColor(...COLOR_PRIMARY)
  doc.rect(0, y - 6, W, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(text, M, y + 3)
  doc.setTextColor(0, 0, 0)
  y += 16
}
function h2(text) {
  checkPage(14)
  y += 4
  doc.setTextColor(...COLOR_ACCENT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(text, M, y)
  doc.setDrawColor(...COLOR_ACCENT)
  doc.setLineWidth(0.4)
  doc.line(M, y + 1.5, W - M, y + 1.5)
  doc.setTextColor(0, 0, 0)
  y += 8
}
function h3(text) {
  checkPage(10)
  y += 2
  doc.setTextColor(...COLOR_PRIMARY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(text, M, y)
  doc.setTextColor(0, 0, 0)
  y += 6
}
function p(text) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  const lines = doc.splitTextToSize(text, W - 2 * M)
  for (const line of lines) {
    checkPage(6)
    doc.text(line, M, y)
    y += 5
  }
  y += 1
}
function bullet(text) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  const lines = doc.splitTextToSize(text, W - 2 * M - 6)
  checkPage(6)
  doc.setTextColor(...COLOR_ACCENT)
  doc.text('•', M, y)
  doc.setTextColor(40, 40, 40)
  doc.text(lines[0], M + 5, y)
  y += 5
  for (let i = 1; i < lines.length; i++) {
    checkPage(6)
    doc.text(lines[i], M + 5, y)
    y += 5
  }
}
function code(text) {
  doc.setFont('courier', 'normal')
  doc.setFontSize(9)
  const lines = text.split('\n')
  const boxH = lines.length * 4.5 + 4
  checkPage(boxH + 2)
  doc.setFillColor(245, 247, 250)
  doc.rect(M, y - 3, W - 2 * M, boxH, 'F')
  doc.setTextColor(30, 27, 75)
  for (const line of lines) {
    doc.text(line, M + 2, y + 1)
    y += 4.5
  }
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  y += 3
}

// ===== PORTADA =====
doc.setFillColor(...COLOR_PRIMARY)
doc.rect(0, 0, W, 80, 'F')
doc.setTextColor(255, 255, 255)
doc.setFont('helvetica', 'bold')
doc.setFontSize(22)
doc.text('CRM COMERCIAL', M, 30)
doc.setFontSize(14)
doc.text('Reto: Cotizaciones para Empresa de Vigilancia', M, 42)
doc.setFont('helvetica', 'normal')
doc.setFontSize(11)
doc.text('Recomendaciones y plan de implementación', M, 52)
doc.setFontSize(9)
doc.text(`Generado: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`, M, 65)
doc.setTextColor(0, 0, 0)
y = 95

// ===== INTRO =====
h1('Contexto del reto')
p('La empresa cotiza múltiples líneas de servicio (Vigilancia, Escoltas, Cámaras/CCTV, Rastreadores, etc.). Cada línea debe tener su propio consecutivo de cotizaciones, y en los renglones de cada cotización deben poder mezclarse productos físicos y servicios. El objetivo es que el CRM cumpla todos esos puntos sin perder claridad ni trazabilidad.')

// ===== CONCEPTO =====
h1('El concepto: Línea de Servicio + consecutivo independiente')
p('Cada línea de servicio que ofrece la empresa es prácticamente una unidad de negocio aparte:')
bullet('VIG — Vigilancia Física')
bullet('ESC — Escoltas')
bullet('CCT — Vigilancia con Cámaras / Monitoreo')
bullet('GPS — Rastreo Satelital / Telemetría')
bullet('CAN — Caninos (si aplica)')
bullet('MED — Medios Tecnológicos / Alarmas')
y += 2
p('Cada una tiene su propio consecutivo:')
code('COT-VIG-00001\nCOT-ESC-00001\nCOT-CCT-00001\nCOT-GPS-00001')
p('Así, si en el mismo día cotizas vigilancia y escoltas para dos clientes distintos, los códigos no se mezclan y cada gerente de línea ve su propia secuencia limpia.')

// ===== POR QUÉ =====
h1('Por qué esto funciona mejor que un solo consecutivo')
h3('1. Reportes por línea de negocio')
p('El gerente de Escoltas ve solo "ESC-*" y mide su propio pipeline, sus tasas de conversión, sus márgenes. Hoy es muy difícil hacer eso si todo está mezclado.')
h3('2. Comisiones claras')
p('Cada vendedor y cada línea tiene su rentabilidad por separado.')
h3('3. Numeración legal / contable')
p('Si la DIAN o un cliente pregunta "muéstrame todas las cotizaciones de escoltas del 2026", sale en un solo filtro.')
h3('4. Plantillas distintas por línea')
p('Vigilancia cotiza en puestos × turnos × salario integral × factor prestacional. CCTV cotiza en equipos + instalación + mantenimiento mensual. GPS cotiza en equipos + activación + mensualidad por vehículo. Son modelos de cotización distintos, con campos diferentes.')
h3('5. Tiempos de aprobación distintos')
p('Una cotización de un puesto de vigilancia se aprueba rápido. Una de 50 cámaras + servidor + integraciones puede tomar semanas. Mezclarlas en un solo flujo distorsiona los reportes.')

// ===== PRODUCTOS VS SERVICIOS =====
h1('Productos vs Servicios en los renglones')
p('Una sola cotización debe permitir mezclar ambos, porque en este negocio casi nunca van separados.')
h3('Ejemplo: Cotización de Vigilancia con CCTV')
code('LÍNEA: VIG-CCT (Vigilancia + Cámaras)\n------------------------------------------------\nSERVICIO  Puesto vigilante 24h x 30 días   1  8.500.000  8.500.000\nSERVICIO  Supervisor zona x 30 días        1  2.200.000  2.200.000\nPRODUCTO  Cámara IP domo PTZ 4MP           4    650.000  2.600.000\nPRODUCTO  NVR 16 canales 4TB               1  2.400.000  2.400.000\nSERVICIO  Instalación y configuración      1  1.800.000  1.800.000\nSERVICIO  Monitoreo 24/7 mensual           1  1.500.000  1.500.000')
p('Cada renglón tiene un tipo: Producto o Servicio. Eso te sirve para:')
bullet('Aplicar IVA distinto si el régimen lo requiere (en Colombia los servicios de vigilancia tienen base AIU especial, distinto a productos físicos).')
bullet('Generar conceptos separados para facturación.')
bullet('Calcular costos: el producto tiene costo de compra; el servicio tiene costo laboral (salario + prestaciones + dotación + ARL).')

// ===== LO CRÍTICO =====
h1('Lo crítico que NO puede faltar')
p('Esto es lo que diferencia un CRM genérico de uno que sirve a una empresa de vigilancia colombiana:')
h3('1. Cálculo AIU (Administración + Imprevistos + Utilidad)')
p('Es la base del negocio de vigilancia en Colombia. La cotización debe permitir capturar:')
bullet('Costo del puesto/servicio (todos los componentes laborales)')
bullet('% AIU')
bullet('IVA solo sobre el AIU, NO sobre el costo total del servicio')
h3('2. Vigencia legal de la oferta')
p('Supervigilancia exige fechas claras y mención de póliza de cumplimiento.')
h3('3. Tipo de modalidad')
p('8 horas, 12 horas, 24 horas, fines de semana, festivos.')
h3('4. Dotación incluida')
p('Cuántos uniformes, equipos de comunicación, armamento.')
h3('5. Pólizas y certificaciones')
p('La cotización profesional debe incluir referencias a las pólizas de la empresa (cumplimiento, RC extracontractual).')
h3('6. Recargos automáticos')
p('Nocturno, dominical, hora extra — calculados automáticamente según modalidad.')

// ===== PLAN =====
h1('Plan de implementación en el CRM (por etapas)')
h3('Paso 1 — Líneas de Servicio (lo más urgente)')
bullet('Crear módulo "Líneas de Servicio" en Configuración.')
bullet('Cada línea tiene: código (3 letras), nombre, color, IVA por defecto, % AIU por defecto, prefijo de cotización.')
bullet('En el formulario de Cotización, primer campo después de Empresa: seleccionar Línea de Servicio.')
bullet('Consecutivo independiente por línea: COT-VIG-00001, COT-ESC-00001, etc.')
bullet('Filtros y reportes por línea.')
h3('Paso 2 — Tipo Producto / Servicio en los renglones')
bullet('Cada detalle tiene un campo Tipo: Producto o Servicio.')
bullet('Visualmente diferente (icono o color).')
bullet('En los totales del PDF aparece desglose: Total Productos, Total Servicios, Total General.')
h3('Paso 3 — Plantillas de Cotización por Línea')
bullet('Cada Línea tiene una plantilla con renglones predefinidos.')
bullet('Cuando seleccionas "Vigilancia 24h", se autopopulan los renglones típicos (puesto vigilante, supervisor, dotación, AIU, póliza).')
bullet('Esto es lo que más tiempo ahorra a los vendedores.')
h3('Paso 4 — Cálculo AIU')
bullet('Campo AIU% en la cotización (con default por línea).')
bullet('IVA aplicado sobre el AIU, no sobre el subtotal completo.')
bullet('Reflejado en PDF y email.')
h3('Paso 5 — Reportes por Línea')
bullet('Pipeline por línea, tasa de conversión, valor promedio, días de cierre.')
bullet('Comisiones por vendedor segmentadas por línea.')

// ===== CONSEJO =====
h1('Consejo de negocio (no técnico)')
p('Antes de meternos a programar, es mejor listar con el dueño o gerente TODAS las líneas que SÍ van a cotizar este año. No las del futuro hipotético. Si solo van a manejar 3 líneas, no te metas en 7. Es más fácil agregar después que tener un sistema sobrediseñado.')
y += 2
p('El AIU es un tema fiscal sensible. El contador debe validar cómo quiere que el sistema lo calcule, porque cada empresa de vigilancia lo aplica distinto y la DIAN ha sancionado por errores.')

// ===== CIERRE =====
h1('Próximo paso sugerido')
p('Arrancar por el Paso 1 (Líneas de Servicio + consecutivo independiente). Es el cambio con mayor impacto y resuelve directamente el reto planteado. Los demás pasos se hacen en sesiones siguientes.')

// Footer
const pages = doc.getNumberOfPages()
for (let i = 1; i <= pages; i++) {
  doc.setPage(i)
  doc.setFontSize(8)
  doc.setTextColor(...COLOR_MUTED)
  doc.text(`CRM Comercial · Reto Vigilancia · Página ${i} de ${pages}`, W / 2, 290, { align: 'center' })
}

const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'reto-vigilancia-cotizaciones.pdf')
fs.writeFileSync(out, Buffer.from(doc.output('arraybuffer')))
console.log('PDF generado:', out)
