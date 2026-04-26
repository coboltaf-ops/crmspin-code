'use client'
import { logAudit, computarDiff } from '@/shared/lib/audit'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClientesStore, Cliente, generarCodigoAcceso } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useCotizacionesStore } from '@/features/cotizaciones/store/cotizaciones-store'
import { useOportunidadesStore } from '@/features/oportunidades/store/oportunidades-store'
import { usePQRSStore } from '@/features/pqrs/store/pqrs-store'
import { useTarifarioStore, PrecioCliente } from '@/features/tarifario/store/tarifario-store'
import { useProductosStore } from '@/features/productos/store/productos-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { fmtMoney } from '@/shared/lib/format-number'
import { fDate, todayColombia } from '@/shared/lib/format-date'
import { nextConsecutivo } from '@/shared/lib/consecutivo'
import ReportPanel from '@/shared/components/report-panel'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import DocumentosPanel from '@/shared/components/documentos-panel'
import { useAsistenteStore } from '@/shared/stores/asistente-store'
import { Seguimiento } from '@/shared/types/seguimiento'
import * as XLSX from 'xlsx'

const CLIENTE_FIELDS: (keyof Cliente)[] = [
  'codigo','tipo_identificacion','nro_documento','digito_verificacion','razon_social',
  'macro_sector','actividad_codigo','actividad','direccion','departamento','ciudad',
  'codigo_ciudad','pais','codigo_pais','codigo_postal','telefono','nro_movil','email','sitio_web',
  'condicion_pago','tipo_moneda','calificacion_pagador','representante_legal','tipo_cuenta_cliente','clase_cliente','autoretenedor','agente_retenedor','gran_contribuyente',
  'regimen_iva','clasificacion_tributaria','mes_cierre_anual','retencion_fuente_pct',
  'tipo_retencion_fuente','retencion_iva_pct','tipo_retencion_iva','retencion_ica_pct',
  'cupo_credito','banco_pagos','cuenta_banco','tipo_cuenta_banco','naturaleza_cuenta',
  'observaciones','como_nos_conocio','situacion','fecha_ingreso_cliente',
]
const NUMERIC_FIELDS = new Set<keyof Cliente>(['retencion_fuente_pct','retencion_iva_pct','retencion_ica_pct','cupo_credito'])
const norm = (s: string) => s.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")

// Sin\u00f3nimos de encabezado \u2192 campo del store (normalizados)
const FIELD_SYNONYMS: Record<string, keyof Cliente> = {
  // Identificaci\u00f3n
  'tipodocumento': 'tipo_identificacion', 'tipoidentificacion': 'tipo_identificacion', 'tipodoc': 'tipo_identificacion', 'tipoid': 'tipo_identificacion',
  'nit': 'nro_documento', 'documento': 'nro_documento', 'numerodocumento': 'nro_documento', 'nrodocumento': 'nro_documento', 'nodocumento': 'nro_documento', 'nrodoc': 'nro_documento', 'cedula': 'nro_documento',
  'dv': 'digito_verificacion', 'digitoverificacion': 'digito_verificacion', 'digitochequeo': 'digito_verificacion',
  'razonsocial': 'razon_social', 'nombre': 'razon_social', 'cliente': 'razon_social', 'nombrecliente': 'razon_social', 'empresa': 'razon_social',
  // Sector / actividad
  'macrosector': 'macro_sector', 'sector': 'macro_sector', 'segmento': 'macro_sector',
  'actividad': 'actividad', 'actividadeconomica': 'actividad', 'descripcionactividad': 'actividad',
  'codigoactividad': 'actividad_codigo', 'actividadcodigo': 'actividad_codigo', 'ciu': 'actividad_codigo', 'ciiu': 'actividad_codigo', 'codigociu': 'actividad_codigo',
  // Ubicaci\u00f3n
  'direccion': 'direccion', 'domicilio': 'direccion',
  'departamento': 'departamento', 'depto': 'departamento',
  'ciudad': 'ciudad', 'municipio': 'ciudad',
  'codigociudad': 'codigo_ciudad', 'codciudad': 'codigo_ciudad', 'codmunicipio': 'codigo_ciudad',
  'pais': 'pais',
  'codigopais': 'codigo_pais', 'codpais': 'codigo_pais', 'isopais': 'codigo_pais',
  'codigopostal': 'codigo_postal', 'cp': 'codigo_postal',
  // Contacto
  'telefono': 'telefono', 'tel': 'telefono', 'fijo': 'telefono',
  'nromovil': 'nro_movil', 'movil': 'nro_movil', 'celular': 'nro_movil', 'cel': 'nro_movil', 'whatsapp': 'nro_movil',
  'email': 'email', 'correo': 'email', 'correoelectronico': 'email', 'mail': 'email',
  'sitioweb': 'sitio_web', 'web': 'sitio_web', 'paginaweb': 'sitio_web', 'url': 'sitio_web',
  // Comercial
  'condicionpago': 'condicion_pago', 'condicionesdepago': 'condicion_pago', 'formapago': 'condicion_pago',
  'tipomoneda': 'tipo_moneda', 'moneda': 'tipo_moneda',
  'calificacionpagador': 'calificacion_pagador', 'calificacioncomopagador': 'calificacion_pagador',
  'representantelegal': 'representante_legal', 'replegal': 'representante_legal', 'representante': 'representante_legal',
  'tipocuentacliente': 'tipo_cuenta_cliente', 'tipocuenta': 'tipo_cuenta_cliente', 'tipodecuenta': 'tipo_cuenta_cliente', 'tipocliente': 'tipo_cuenta_cliente', 'clasificacioncliente': 'tipo_cuenta_cliente',
  'clasecliente': 'clase_cliente', 'clasedecliente': 'clase_cliente', 'clase': 'clase_cliente',
  // DIAN
  'autoretenedor': 'autoretenedor', 'autoretencion': 'autoretenedor',
  'agenteretenedor': 'agente_retenedor', 'agentederetencion': 'agente_retenedor',
  'comonosconocio': 'como_nos_conocio', 'origen': 'como_nos_conocio',
  'grancontribuyente': 'gran_contribuyente',
  'regimeniva': 'regimen_iva', 'regimen': 'regimen_iva',
  'clasificaciontributaria': 'clasificacion_tributaria',
  'mescierreanual': 'mes_cierre_anual', 'mescierre': 'mes_cierre_anual',
  'retencionfuentepct': 'retencion_fuente_pct', 'porcentajeretencionfuente': 'retencion_fuente_pct', 'pctretfuente': 'retencion_fuente_pct', 'retfuente': 'retencion_fuente_pct',
  'tiporetencionfuente': 'tipo_retencion_fuente',
  'retencionivapct': 'retencion_iva_pct', 'porcentajeretencioniva': 'retencion_iva_pct', 'pctretiva': 'retencion_iva_pct', 'retiva': 'retencion_iva_pct',
  'tiporetencioniva': 'tipo_retencion_iva',
  'retencionicapct': 'retencion_ica_pct', 'porcentajeretencionica': 'retencion_ica_pct', 'pctretica': 'retencion_ica_pct', 'retica': 'retencion_ica_pct',
  'cupocredito': 'cupo_credito', 'cupo': 'cupo_credito',
  'bancopagos': 'banco_pagos', 'banco': 'banco_pagos',
  'cuentabanco': 'cuenta_banco', 'cuenta': 'cuenta_banco', 'numerocuenta': 'cuenta_banco', 'nrocuenta': 'cuenta_banco',
  'tipocuentabanco': 'tipo_cuenta_banco', 'tipodecuentaenbanco': 'tipo_cuenta_banco',
  'naturalezacuenta': 'naturaleza_cuenta', 'naturaleza': 'naturaleza_cuenta', 'naturalezadelacuenta': 'naturaleza_cuenta',
  // Misc
  'observaciones': 'observaciones', 'obs': 'observaciones', 'notas': 'observaciones', 'comentarios': 'observaciones',
  'fechaingreso': 'fecha_ingreso_cliente', 'fechaingresocliente': 'fecha_ingreso_cliente', 'fechadeingresocomocliente': 'fecha_ingreso_cliente', 'fechavinculacion': 'fecha_ingreso_cliente', 'fechaalta': 'fecha_ingreso_cliente',
}

const today = todayColombia()

const emptyCliente = (codigo: string): Cliente => ({
  id: '', codigo, tipo_identificacion: 'NIT',
  nro_documento: '', digito_verificacion: '', razon_social: '',
  macro_sector: '', actividad: '', actividad_codigo: '',
  direccion: '', departamento: '', ciudad: '', codigo_ciudad: '', pais: 'Colombia', codigo_pais: 'CO', codigo_postal: '', telefono: '', nro_movil: '', email: '', sitio_web: '',
  condicion_pago: 'Contado', tipo_moneda: 'Pesos Colombianos', calificacion_pagador: '', representante_legal: '', tipo_cuenta_cliente: '', clase_cliente: 'Otros Clientes',
  autoretenedor: 'No', agente_retenedor: 'No', como_nos_conocio: '', gran_contribuyente: 'No', regimen_iva: 'No Responsable', clasificacion_tributaria: '', mes_cierre_anual: 'Diciembre',
  retencion_fuente_pct: 0, tipo_retencion_fuente: '', retencion_iva_pct: 0, tipo_retencion_iva: '', retencion_ica_pct: 0,
  cupo_credito: 0, banco_pagos: '', cuenta_banco: '', tipo_cuenta_banco: 'Ahorro', naturaleza_cuenta: '',
  observaciones: '',
  situacion: 'Activo', fecha_registro: today, fecha_ingreso_cliente: '', seguimientos: [], codigo_acceso: generarCodigoAcceso(),
})

export default function ClientesPage() {
  const permisos = usePermisos('clientes')
  const currentUser = useCurrentUserStore(s => s.user)
  const router = useRouter()
  const { clientes, addCliente, updateCliente, deleteCliente } = useClientesStore()
  const contactos = useContactosStore(s => s.contactos)
  const cotizaciones = useCotizacionesStore(s => s.cotizaciones)
  const oportunidades = useOportunidadesStore(s => s.oportunidades)
  const pqrs = usePQRSStore(s => s.pqrs)
  const tarifas = useTarifarioStore(s => s.precios)
  const addPrecio = useTarifarioStore(s => s.addPrecio)
  const updatePrecio = useTarifarioStore(s => s.updatePrecio)
  const deletePrecio = useTarifarioStore(s => s.deletePrecio)
  const [editTarifaId, setEditTarifaId] = useState<string | null>(null)
  const [editTarifaPrecio, setEditTarifaPrecio] = useState(0)
  const [editTarifaFecha, setEditTarifaFecha] = useState('')
  const [editTarifaSituacion, setEditTarifaSituacion] = useState('Activo')
  const productosAll = useProductosStore(s => s.productos).filter(p => p.situacion === 'Activo')
  const refData = useReferenceStore(s => s.data)

  const [selected, setSelected] = useState<Cliente | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<Cliente | null>(null)
  // Mantener viewDetail siempre sincronizado con el store (si editan el cliente, refrescar)
  useEffect(() => {
    if (!viewDetail) return
    const latest = clientes.find(c => c.id === viewDetail.id)
    if (latest && latest !== viewDetail) setViewDetail(latest)
  }, [clientes, viewDetail])
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')
  const [detailTab, setDetailTab] = useState<'info' | 'contactos' | 'cotizaciones' | 'oportunidades' | 'tickets' | 'tarifa'>('info')
  const [showAddTarifa, setShowAddTarifa] = useState(false)
  const [newProductoId, setNewProductoId] = useState('')
  const [newPrecio, setNewPrecio] = useState(0)
  const [newFechaVigencia, setNewFechaVigencia] = useState(today)
  const [newSituacion, setNewSituacion] = useState('Activo')
  const [search, setSearch] = useState('')
  const { pendingSearch, pendingAction, clearPending } = useAsistenteStore()
  useEffect(() => {
    if (pendingSearch) setSearch(pendingSearch)
    if (pendingAction === 'nuevo') { setSelected(emptyCliente(nextConsecutivo('CLI-', clientes.map(c => c.codigo)).codigo)); setIsForm(true) }
    if (pendingSearch || pendingAction) clearPending()
  }, [])

  const filtered = clientes.filter(c =>
    !search || c.razon_social.toLowerCase().includes(search.toLowerCase()) ||
    c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.nro_documento.includes(search)
  )

  const auditParams = () => ({
    usuario: currentUser?.usuario || 'desconocido',
    usuario_nombre: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(),
    rol: currentUser?.rol || '',
    modulo: 'clientes',
  })

  const descargarPlantilla = () => {
    // Plantilla SIN columna codigo/situacion/fecha_registro — el sistema las asigna sola
    const headers = CLIENTE_FIELDS.filter(f => f !== 'codigo' && f !== 'situacion')
    const ws = XLSX.utils.aoa_to_sheet([headers as unknown as string[]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, 'plantilla-clientes.xlsx')
  }

  const importarExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      if (rows.length === 0) { alert('El Excel está vacío.'); return }

      // Mapear encabezados → campos (acepta nombre de campo O sinónimo en español).
      const headerMap: Record<string, keyof Cliente> = {}
      const noReconocidos: string[] = []
      const ignored = new Set<keyof Cliente>(['codigo', 'situacion', 'fecha_registro'])
      Object.keys(rows[0]).forEach(h => {
        const n = norm(h)
        const direct = CLIENTE_FIELDS.find(f => norm(f) === n)
        const synonym = FIELD_SYNONYMS[n]
        const match = direct || synonym
        if (match && !ignored.has(match)) headerMap[h] = match
        else noReconocidos.push(h)
      })
      if (Object.keys(headerMap).length === 0) {
        alert(`No se reconoció ninguna columna.\n\nEncabezados encontrados:\n${Object.keys(rows[0]).join(', ')}\n\nDescarga la Plantilla y usa esos nombres exactos.`)
        return
      }
      const detectados = Object.entries(headerMap).map(([h, f]) => `  "${h}" → ${f}`).join('\n')
      const omitidosCols = noReconocidos.length ? `\n\n⚠️ Columnas IGNORADAS (no reconocidas):\n  ${noReconocidos.join(', ')}` : ''
      const continuar = confirm(`Se detectaron ${Object.keys(headerMap).length} columnas y ${rows.length} filas.\n\n✓ Mapeo detectado:\n${detectados}${omitidosCols}\n\n¿Continuar con la importación?`)
      if (!continuar) return

      const docsExistentes = new Set(clientes.map(c => c.nro_documento).filter(Boolean))
      const docsEnArchivo = new Set<string>()
      let creados = 0, omitidos = 0, errores = 0
      let nro = nextConsecutivo('CLI-', clientes.map(c => c.codigo)).nro

      for (const row of rows) {
        try {
          // Codigo siempre auto-generado, secuencial
          const codigoAuto = `CLI-${String(nro).padStart(5, '0')}`
          const cli = emptyCliente(codigoAuto)

          for (const [header, field] of Object.entries(headerMap)) {
            const raw = row[header]
            if (raw === '' || raw === null || raw === undefined) continue
            if (NUMERIC_FIELDS.has(field)) {
              const n = Number(String(raw).replace(/[^0-9.\-]/g, ''))
              ;(cli as unknown as Record<string, unknown>)[field] = isNaN(n) ? 0 : n
            } else {
              ;(cli as unknown as Record<string, unknown>)[field] = String(raw).trim()
            }
          }

          if (!cli.razon_social) { errores++; continue }
          if (cli.nro_documento && (docsExistentes.has(cli.nro_documento) || docsEnArchivo.has(cli.nro_documento))) { omitidos++; continue }

          // Forzar valores de sistema
          cli.situacion = 'Activo'
          cli.fecha_registro = today

          // Normalizar Departamento contra DIVIPOLA (case-insensitive → versión canónica)
          if (cli.departamento) {
            const dep = (refData.departamento || []).find(d => norm(d.descripcion) === norm(cli.departamento))
            if (dep) cli.departamento = dep.descripcion
          }
          // Normalizar País
          if (cli.pais) {
            const pais = (refData.pais || []).find(p => norm(p.descripcion) === norm(cli.pais))
            if (pais) cli.pais = pais.descripcion
          }
          // Normalizar Ciudad y autocompletar codigo_ciudad si no vino en Excel
          if (cli.ciudad) {
            const candidatas = (refData.ciudad || []).filter(c => norm(c.descripcion) === norm(cli.ciudad))
            const conDepto = cli.departamento ? candidatas.find(c => (c.departamento || '') === cli.departamento) : null
            const ciudadMatch = conDepto || candidatas[0]
            if (ciudadMatch) {
              cli.ciudad = ciudadMatch.descripcion
              if (!cli.codigo_ciudad && ciudadMatch.codigo) cli.codigo_ciudad = ciudadMatch.codigo
              if (!cli.departamento && ciudadMatch.departamento) cli.departamento = ciudadMatch.departamento
            }
          }

          if (cli.nro_documento) docsEnArchivo.add(cli.nro_documento)
          addCliente({ ...cli, id: crypto.randomUUID() })
          nro++
          creados++
        } catch { errores++ }
      }

      alert(`Importación finalizada:\n\n✓ Creados: ${creados}\n⊘ Omitidos (NIT duplicado): ${omitidos}\n✗ Errores (sin Razón Social): ${errores}`)
    } catch (err) {
      alert('Error al leer el Excel: ' + (err as Error).message)
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (selected.id) {
      const _anterior = clientes.find(x => x.id === selected.id);
      const claseAntes = _anterior?.clase_cliente || '(vacío)'
      const claseEnForm = selected.clase_cliente || '(vacío)'
      updateCliente(selected.id, selected);
      logAudit({ ...auditParams(), accion: "MODIFICAR", registro_codigo: selected.codigo, registro_nombre: selected.razon_social, detalle: computarDiff(_anterior as unknown as Record<string, unknown>, selected as unknown as Record<string, unknown>) })
      // Verificar lectura DIRECTA del store después de updateCliente
      const claseEnStore = useClientesStore.getState().clientes.find(c => c.id === selected.id)?.clase_cliente || '(vacío)'
      alert(`🔍 DEBUG GUARDADO:\n\n• Antes (store): "${claseAntes}"\n• En form (lo que envías): "${claseEnForm}"\n• Después (store): "${claseEnStore}"\n\n${claseEnStore === claseEnForm ? '✓ Guardado OK' : '✗ NO se guardó — bug de persistencia'}`)
    } else {
      addCliente({ ...selected, id: crypto.randomUUID() })
    }
    setIsForm(false); setSelected(null)
  }

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Activo': { background: '#4169E1', color: '#ffffff', border: '1px solid #3b82f6' },
      'Inactivo': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
      'Prospecto': { background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' },
    }
    return map[s] || {}
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', boxSizing: 'border-box', height: 38 }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#4169E1' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)' })

  // View detail
  if (viewDetail) {
    const fields = [
      { label: 'Código', value: viewDetail.codigo },
      { label: 'Tipo Documento', value: viewDetail.tipo_identificacion },
      { label: 'Nro. Documento', value: viewDetail.nro_documento },
      { label: 'Dígito Verificación', value: viewDetail.digito_verificacion },
      { label: 'Razón Social', value: viewDetail.razon_social },
      { label: 'Macro Sector', value: viewDetail.macro_sector },
      { label: 'Actividad Económica CIU', value: viewDetail.actividad_codigo ? `${viewDetail.actividad_codigo} — ${viewDetail.actividad}` : viewDetail.actividad },
      { label: 'Teléfono', value: viewDetail.telefono },
      { label: 'Nro Móvil', value: viewDetail.nro_movil },
      { label: 'Correo', value: viewDetail.email },
      { label: 'Sitio Web', value: viewDetail.sitio_web },
      { label: 'Condición de Pago', value: viewDetail.condicion_pago },
      { label: 'Moneda', value: viewDetail.tipo_moneda },
      { label: 'Calificación como Pagador', value: viewDetail.calificacion_pagador || '—' },
      { label: 'Representante Legal', value: viewDetail.representante_legal || '—' },
      { label: 'Tipo de Cuenta', value: viewDetail.tipo_cuenta_cliente || '—' },
      { label: 'Clase de Cliente', value: viewDetail.clase_cliente || '—' },
      { label: 'Situación', value: viewDetail.situacion },
      { label: 'Fecha Registro', value: fDate(viewDetail.fecha_registro) },
      { label: 'Fecha Ingreso Como Cliente', value: viewDetail.fecha_ingreso_cliente ? fDate(viewDetail.fecha_ingreso_cliente) : '' },
      { label: 'Observaciones', value: viewDetail.observaciones },
      { label: 'Cómo nos Conoció', value: viewDetail.como_nos_conocio },
    ]
    const cId = viewDetail.id
    const misContactos = contactos.filter(c => c.cliente_id === cId)
    const misCotizaciones = cotizaciones.filter(c => c.cliente_id === cId)
    const misOportunidades = oportunidades.filter(o => o.cliente_id === cId)
    const misTickets = pqrs.filter(p => p.cliente_id === cId)
    const misTarifas = tarifas.filter(t => t.cliente_id === cId && t.situacion === 'Activo')
    const calcTotalCot = (det: Array<{ subtotal: number }>, pct: number) => {
      const sub = det.reduce((s, d) => s + d.subtotal, 0); return sub + sub * (pct / 100)
    }
    const prioColor: Record<string, string> = { 'Urgente': '#fca5a5', 'Alta': '#fcd34d', 'Media': '#93c5fd', 'Baja': '#86efac' }
    const th: React.CSSProperties = { padding: '12px 14px', background: '#1e3a8a', color: '#fff', fontSize: 12, textAlign: 'left' }
    const td: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', fontSize: 13 }
    const tdMono: React.CSSProperties = { ...td, color: '#60a5fa', fontFamily: 'monospace' }

    return (
      <div>
        <button onClick={() => { setViewDetail(null); setDetailTab('info') }} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{viewDetail.razon_social}</h2>

          {/* Sub-tabs vista 360° */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setDetailTab('info')} style={tabBtnStyle(detailTab === 'info')}>🏢 Información</button>
            <button onClick={() => setDetailTab('contactos')} style={tabBtnStyle(detailTab === 'contactos')}>👤 Ver Contactos ({misContactos.length})</button>
            <button onClick={() => setDetailTab('cotizaciones')} style={tabBtnStyle(detailTab === 'cotizaciones')}>📄 Ver Cotizaciones ({misCotizaciones.length})</button>
            <button onClick={() => setDetailTab('oportunidades')} style={tabBtnStyle(detailTab === 'oportunidades')}>🎯 Ver Oportunidades ({misOportunidades.length})</button>
            <button onClick={() => setDetailTab('tickets')} style={tabBtnStyle(detailTab === 'tickets')}>🎫 Ver Tickets ({misTickets.length})</button>
            <button onClick={() => setDetailTab('tarifa')} style={tabBtnStyle(detailTab === 'tarifa')}>💲 Ver Productos Precios ({misTarifas.length})</button>
          </div>

          {detailTab === 'contactos' && (
            <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Nombre', 'Cargo', 'Correo', 'Celular', 'Situación'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {misContactos.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <td style={{ ...td, color: '#fff', fontWeight: 600 }}>{c.nombre} {c.apellido}</td>
                      <td style={td}>{c.cargo}</td>
                      <td style={td}>{c.email}</td>
                      <td style={td}>{c.celular || '—'}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.situacion === 'Activo' ? 'rgba(59,130,246,0.2)' : 'rgba(156,163,175,0.2)', color: c.situacion === 'Activo' ? '#93c5fd' : '#d1d5db' }}>{c.situacion}</span></td>
                    </tr>
                  ))}
                  {misContactos.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Este cliente no tiene contactos registrados</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'cotizaciones' && (
            <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Código', 'Emisión', 'Vencimiento', 'Total', 'Situación'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {misCotizaciones.map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <td style={tdMono}>{c.codigo}</td>
                      <td style={td}>{fDate(c.fecha_emision)}</td>
                      <td style={td}>{fDate(c.fecha_vencimiento)}</td>
                      <td style={{ ...td, color: '#93c5fd', fontWeight: 700 }}>${fmtMoney(calcTotalCot(c.detalles || [], c.pct_impuesto || 0))}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>{c.situacion}</span></td>
                    </tr>
                  ))}
                  {misCotizaciones.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Este cliente no tiene cotizaciones</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'oportunidades' && (
            <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Nombre', 'Etapa', 'Valor Estimado', 'Situación'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {misOportunidades.map((o, i) => (
                    <tr key={o.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <td style={{ ...td, color: '#fff', fontWeight: 600 }}>{o.nombre}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(168,85,247,0.2)', color: '#d8b4fe' }}>{o.etapa}</span></td>
                      <td style={{ ...td, color: '#93c5fd', fontWeight: 700 }}>${fmtMoney(o.valor_estimado || 0)}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>{o.situacion}</span></td>
                    </tr>
                  ))}
                  {misOportunidades.length === 0 && <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Este cliente no tiene oportunidades</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'tarifa' && (
            <>
              {/* Botón Agregar Producto a Cliente */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                {!showAddTarifa ? (
                  <button onClick={() => { setShowAddTarifa(true); setNewProductoId(''); setNewPrecio(0); setNewFechaVigencia(today); setNewSituacion('Activo') }} style={{ ...btnStyle, background: '#172554', color: '#ffffff', border: '1px solid #3b82f6' }}>+ Agregar Producto a Cliente</button>
                ) : (
                  <button onClick={() => { setShowAddTarifa(false); setNewProductoId(''); setNewPrecio(0); setNewFechaVigencia(today); setNewSituacion('Activo') }} style={{ ...btnStyle, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>✕ Cerrar</button>
                )}
              </div>

              {/* Form inline */}
              {showAddTarifa && (() => {
                // Productos ya asociados al cliente (no permitir repetir código ni descripción)
                const codigosUsados = new Set(tarifas.filter(t => t.cliente_id === viewDetail.id).map(t => t.producto_codigo.toLowerCase()))
                const descripcionesUsadas = new Set(tarifas.filter(t => t.cliente_id === viewDetail.id).map(t => t.producto_descripcion.toLowerCase()))
                const productosDisponibles = productosAll.filter(p =>
                  !codigosUsados.has(p.codigo.toLowerCase()) &&
                  !descripcionesUsadas.has(p.descripcion.toLowerCase())
                )
                const prodSeleccionado = productosDisponibles.find(p => p.id === newProductoId)
                const guardar = () => {
                  if (!prodSeleccionado) { alert('Selecciona un Producto'); return }
                  if (newPrecio <= 0) { alert('Precio debe ser mayor a cero'); return }
                  if (!newFechaVigencia) { alert('Fecha de Vigencia es obligatoria'); return }
                  // Doble validacion: que no exista ya por código o descripción
                  if (codigosUsados.has(prodSeleccionado.codigo.toLowerCase())) {
                    alert(`Este cliente ya tiene una tarifa con código de producto "${prodSeleccionado.codigo}". No se puede duplicar.`)
                    return
                  }
                  if (descripcionesUsadas.has(prodSeleccionado.descripcion.toLowerCase())) {
                    alert(`Este cliente ya tiene una tarifa con descripción "${prodSeleccionado.descripcion}". No se puede duplicar.`)
                    return
                  }
                  // updatePrecio se importa para futuras ediciones desde /tarifario
                  void updatePrecio
                  const nuevo: PrecioCliente = {
                    id: crypto.randomUUID(),
                    cliente_id: viewDetail.id,
                    cliente_codigo: viewDetail.codigo,
                    cliente_nombre: viewDetail.razon_social,
                    producto_id: prodSeleccionado.id,
                    producto_codigo: prodSeleccionado.codigo,
                    producto_descripcion: prodSeleccionado.descripcion,
                    precio: Math.round(newPrecio),
                    fecha_inicio_vigencia: newFechaVigencia,
                    fecha_fin_vigencia: '',
                    situacion: newSituacion,
                    observaciones: 'Agregado desde vista 360° del Cliente',
                    fecha_registro: todayColombia(),
                    seguimientos: [],
                  }
                  addPrecio(nuevo)
                  setShowAddTarifa(false)
                  setNewProductoId('')
                  setNewPrecio(0)
                  setNewFechaVigencia(today)
                  setNewSituacion('Activo')
                }
                return (
                  <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                    <p style={{ color: '#93c5fd', fontSize: 12, fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>NUEVA TARIFA PARA {viewDetail.razon_social.toUpperCase()}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 12 }}>
                      Productos disponibles: {productosDisponibles.length} de {productosAll.length}. Los ya asignados a este cliente no aparecen.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                      <div>
                        <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código Producto *</label>
                        <select value={newProductoId} onChange={e => setNewProductoId(e.target.value)} style={inputStyle}>
                          <option value="">Seleccionar...</option>
                          {productosDisponibles.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.descripcion}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Descripción</label>
                        <input value={prodSeleccionado?.descripcion || ''} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
                      </div>
                      <div>
                        <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Unid. Medida</label>
                        <input value={prodSeleccionado?.unidad_medida || ''} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
                      </div>
                      <div>
                        <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Empaque</label>
                        <input value={prodSeleccionado?.tipo_empaque || ''} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
                      </div>
                      <div>
                        <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Precio Unitario *</label>
                        <input type="number" step="1" min="0" value={newPrecio || ''} onChange={e => setNewPrecio(parseFloat(e.target.value) || 0)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Vigencia *</label>
                        <input type="date" value={newFechaVigencia} onChange={e => setNewFechaVigencia(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situación</label>
                        <select value={newSituacion} onChange={e => setNewSituacion(e.target.value)} style={inputStyle}>
                          <option value="Activo">Activo</option>
                          <option value="Inactivo">Inactivo</option>
                        </select>
                      </div>
                      <button onClick={guardar} style={{ ...btnStyle, background: '#172554', color: '#ffffff', border: '1px solid #3b82f6', height: 38 }}>Guardar</button>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 10 }}>
                      No se permite repetir el código de producto ni la descripción del producto para un mismo cliente.
                    </p>
                  </div>
                )
              })()}

              {/* Tabla de tarifas — vista distinta según Clase de Cliente */}
              {(() => {
                const claseLower = (viewDetail.clase_cliente || '').toLowerCase().trim()
                const esEspecial = claseLower === 'especiales' || claseLower === 'especial' || claseLower === 'cliente especial' || claseLower === 'clientes especiales'
                const headerBg = esEspecial ? 'linear-gradient(90deg, #581c87 0%, #7c3aed 100%)' : '#1e3a8a'
                const accentColor = esEspecial ? '#d8b4fe' : '#93c5fd'
                const banner = esEspecial
                  ? { color: '#c084fc', bg: 'linear-gradient(90deg, rgba(88,28,135,0.30) 0%, rgba(124,58,237,0.20) 100%)', border: 'rgba(168,85,247,0.5)', titulo: '💲 Productos y Precios — Cliente Especiales' }
                  : { color: '#93c5fd', bg: 'linear-gradient(90deg, rgba(30,58,138,0.30) 0%, rgba(59,130,246,0.18) 100%)', border: 'rgba(59,130,246,0.5)', titulo: '💲 Productos y Precios — Clase Cliente Otros Clientes' }
                const headers = esEspecial
                  ? ['Código', 'Descripción', 'Unid/Medida', 'Empaque', 'Costo', 'Vr.TRM', 'Conversion COP', 'Valor US$', 'Precio', 'Acción']
                  : ['Código', 'Nombre', 'Uni/Medida', 'Empaque', 'Costo', 'Margen Contribución', 'Margen Cálculo', 'Precio', 'Acción']
                const thStyled: React.CSSProperties = { padding: '14px 14px', color: '#fff', fontSize: 11, fontWeight: 800, textAlign: 'left', letterSpacing: 0.4, textTransform: 'uppercase' }
                const tdNum: React.CSSProperties = { ...td, textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontWeight: 600 }
                return (
                  <>
                    {/* Título grande de la vista — cambia según Clase de Cliente */}
                    <div style={{ background: banner.bg, border: `2px solid ${banner.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 14, boxShadow: '0 6px 18px rgba(0,0,0,0.25)' }}>
                      <h2 style={{ color: banner.color, fontWeight: 900, fontSize: 20, letterSpacing: 0.4, margin: 0 }}>{banner.titulo}</h2>
                      {!viewDetail.clase_cliente && (
                        <p style={{ color: '#fca5a5', fontSize: 12, margin: '6px 0 0 0', fontWeight: 700 }}>⚠️ Este cliente no tiene Clase asignada. Edítalo y selecciona "Especiales" u "Otros Clientes" en el form.</p>
                      )}
                    </div>

                    <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: headerBg }}>
                            {headers.map(h => <th key={h} style={thStyled}>{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {misTarifas.map((t, i) => {
                            const prod = productosAll.find(p => p.id === t.producto_id)
                            return (
                              <tr key={t.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                                <td style={tdMono}>{t.producto_codigo}</td>
                                <td style={{ ...td, color: '#fff', fontWeight: 700 }}>{t.producto_descripcion}</td>
                                <td style={td}>{prod?.unidad_medida || '—'}</td>
                                <td style={td}>{prod?.tipo_empaque || '—'}</td>
                                {esEspecial ? (
                                  <>
                                    <td style={tdNum}>${fmtMoney(prod?.costo_producto || 0)}</td>
                                    <td style={tdNum}>${fmtMoney(prod?.valor_trm || 0)}</td>
                                    <td style={tdNum}>${fmtMoney(prod?.conversion_cop || 0)}</td>
                                    <td style={{ ...tdNum, color: '#d8b4fe' }}>US$ {fmtMoney(prod?.valor_usd || 0)}</td>
                                    <td style={{ ...tdNum, color: accentColor, fontSize: 14, fontWeight: 800 }}>${fmtMoney(t.precio)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td style={tdNum}>${fmtMoney(prod?.costo_producto || 0)}</td>
                                    <td style={{ ...tdNum, color: '#86efac' }}>{(prod?.margen_contribucion_pct || 0).toFixed(2)}%</td>
                                    <td style={{ ...tdNum, color: '#fcd34d' }}>{(prod?.margen_calculo_pct || 0).toFixed(2)}%</td>
                                    <td style={{ ...tdNum, color: accentColor, fontSize: 14, fontWeight: 800 }}>${fmtMoney(t.precio)}</td>
                                  </>
                                )}
                                <td style={td}>
                                  {editTarifaId === t.id ? (
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                      <input type="number" step="1" min="0" value={editTarifaPrecio || ''} onChange={e => setEditTarifaPrecio(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, width: 90, padding: '4px 6px', height: 28, fontSize: 11 }} placeholder="Precio" />
                                      <input type="date" value={editTarifaFecha} onChange={e => setEditTarifaFecha(e.target.value)} style={{ ...inputStyle, width: 130, padding: '4px 6px', height: 28, fontSize: 11 }} />
                                      <select value={editTarifaSituacion} onChange={e => setEditTarifaSituacion(e.target.value)} style={{ ...inputStyle, width: 90, padding: '4px 6px', height: 28, fontSize: 11 }}>
                                        <option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                      </select>
                                      <button type="button" onClick={() => {
                                        if (editTarifaPrecio <= 0) { alert('Precio debe ser mayor a cero'); return }
                                        if (!editTarifaFecha) { alert('Fecha de Vigencia es obligatoria'); return }
                                        updatePrecio(t.id, { precio: Math.round(editTarifaPrecio), fecha_inicio_vigencia: editTarifaFecha, situacion: editTarifaSituacion })
                                        setEditTarifaId(null)
                                      }} style={{ ...btnStyle, padding: '4px 8px', fontSize: 11, background: '#059669', color: '#fff', border: '1px solid #10b981', height: 28 }} title="Guardar">✓</button>
                                      <button type="button" onClick={() => setEditTarifaId(null)} style={{ ...btnStyle, padding: '4px 8px', fontSize: 11, background: '#64748b', color: '#fff', height: 28 }} title="Cancelar">✕</button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button onClick={() => {
                                        setShowAddTarifa(true); setNewProductoId(''); setNewPrecio(0); setNewFechaVigencia(today); setNewSituacion('Activo')
                                      }} style={{ ...btnStyle, padding: '4px 10px', fontSize: 11, background: '#059669', color: '#fff', border: '1px solid #10b981' }} title="Agregar nuevo producto al tarifario">➕ Agregar</button>
                                      <button onClick={() => {
                                        setEditTarifaId(t.id)
                                        setEditTarifaPrecio(t.precio)
                                        setEditTarifaFecha(t.fecha_inicio_vigencia)
                                        setEditTarifaSituacion(t.situacion)
                                      }} style={{ ...btnStyle, padding: '4px 10px', fontSize: 11, background: '#2563eb', color: '#fff', border: '1px solid #3b82f6' }}>✏️ Editar</button>
                                      <button onClick={() => {
                                        if (!confirm(`¿Eliminar la tarifa del producto "${t.producto_descripcion}" para ${viewDetail.razon_social}?\n\nEsta acción no se puede deshacer.`)) return
                                        deletePrecio(t.id)
                                      }} style={{ ...btnStyle, padding: '4px 10px', fontSize: 11, background: '#b91c1c', color: '#fff', border: '1px solid #dc2626' }}>🗑️ Eliminar</button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                          {misTarifas.length === 0 && (
                            <tr>
                              <td colSpan={headers.length} style={{ padding: 40, textAlign: 'center' }}>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>Este cliente no tiene tarifas activas registradas</p>
                                <button onClick={() => { setShowAddTarifa(true); setNewProductoId(''); setNewPrecio(0); setNewFechaVigencia(today); setNewSituacion('Activo') }} style={{ ...btnStyle, padding: '10px 20px', fontSize: 13, background: '#059669', color: '#fff', border: '1px solid #10b981', fontWeight: 700 }}>➕ Agregar Primer Producto</button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              })()}
            </>
          )}

          {detailTab === 'tickets' && (
            <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Código', 'Tipo', 'Prioridad', 'Asunto', 'Situación'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {misTickets.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <td style={tdMono}>{p.codigo}</td>
                      <td style={td}>{p.tipo}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: prioColor[p.prioridad] || '#fff' }}>{p.prioridad}</span></td>
                      <td style={td}>{p.asunto}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: p.situacion === 'Cerrada' ? 'rgba(156,163,175,0.2)' : 'rgba(239,68,68,0.2)', color: p.situacion === 'Cerrada' ? '#d1d5db' : '#fca5a5' }}>{p.situacion}</span></td>
                    </tr>
                  ))}
                  {misTickets.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Este cliente no tiene tickets</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {detailTab === 'info' && (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.label}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Ubicación */}
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ color: '#ffffff', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Ubicación</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Dirección', value: viewDetail.direccion },
                { label: 'Departamento', value: viewDetail.departamento },
                { label: 'Ciudad', value: viewDetail.ciudad },
                { label: 'Código Ciudad', value: viewDetail.codigo_ciudad },
                { label: 'País', value: viewDetail.pais },
                { label: 'Código País', value: viewDetail.codigo_pais },
                { label: 'Código Postal', value: viewDetail.codigo_postal },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                  <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Datos DIAN */}
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(59,130,246,0.06)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.25)' }}>
            <h3 style={{ color: '#ffffff', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Datos Importantes Solicitados por DIAN</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Autoretenedor', value: viewDetail.autoretenedor },
                { label: 'Agente Retenedor', value: viewDetail.agente_retenedor },
                { label: 'Gran Contribuyente', value: viewDetail.gran_contribuyente },
                { label: 'Régimen IVA', value: viewDetail.regimen_iva },
                { label: 'Clasificación Tributaria', value: viewDetail.clasificacion_tributaria || '—' },
                { label: 'Mes Cierre Anual', value: viewDetail.mes_cierre_anual || '—' },
                { label: '% Retención Fuente', value: `${viewDetail.retencion_fuente_pct || 0}%` },
                { label: 'Tipo Retención Fuente', value: viewDetail.tipo_retencion_fuente || '—' },
                { label: '% Retención IVA', value: `${viewDetail.retencion_iva_pct || 0}%` },
                { label: 'Tipo Retención IVA', value: viewDetail.tipo_retencion_iva || '—' },
                { label: 'Naturaleza de la Cuenta', value: viewDetail.naturaleza_cuenta || '—' },
                { label: '% Retención ICA', value: `${viewDetail.retencion_ica_pct || 0}%` },
                { label: 'Cupo de Crédito', value: `$${(viewDetail.cupo_credito || 0).toLocaleString('es-CO')}` },
                { label: 'Banco para Pagos', value: viewDetail.banco_pagos },
                { label: 'Cuenta', value: viewDetail.cuenta_banco },
                { label: 'Tipo de Cuenta en Banco', value: viewDetail.tipo_cuenta_banco },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                  <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Código de acceso PQRS */}
          {viewDetail.codigo_acceso && (
            <div style={{ marginTop: 16, padding: 16, background: 'rgba(234,88,12,0.1)', borderRadius: 12, border: '1px solid rgba(234,88,12,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#f97316', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Código de Acceso para PQRS Público</p>
                <p style={{ color: '#ffffff', fontSize: 20, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 2 }}>{viewDetail.codigo_acceso}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(viewDetail.codigo_acceso); alert('Código copiado al portapapeles') }}
                style={{ ...btnStyle, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316', fontSize: 12 }}>Copiar</button>
            </div>
          )}
          </>
          )}

          <SeguimientoPanel
            seguimientos={viewDetail.seguimientos || []}
            usuario={`${currentUser?.nombre} ${currentUser?.apellido}`}
            situacionActual={viewDetail.situacion}
            situacionOpciones={refData.situacion_cliente.filter(r => r.situacion).map(r => r.descripcion)}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updateCliente(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
          <DocumentosPanel modulo="clientes" registroId={viewDetail.id} />
        </div>
      </div>
    )
  }

  // Form
  if (isForm && selected) {
    const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)
    return (
      <div>
        <button onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nuevo'} Cliente</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código</label>
              <input value={selected.codigo} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Registro</label>
              <input value={fDate(selected.fecha_registro)} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Ingreso Como Cliente</label>
              <input type="date" value={selected.fecha_ingreso_cliente} onChange={e => setSelected({ ...selected, fecha_ingreso_cliente: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Documento</label>
              <select value={selected.tipo_identificacion} onChange={e => setSelected({ ...selected, tipo_identificacion: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('tipo_identificacion').map(o => <option key={o} value={o}>{o}</option>)}
                {selected.tipo_identificacion && !refOptions('tipo_identificacion').includes(selected.tipo_identificacion) && (
                  <option value={selected.tipo_identificacion}>⚠ {selected.tipo_identificacion}</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nro. Documento *</label>
              <input value={selected.nro_documento} onChange={e => setSelected({ ...selected, nro_documento: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Dígito Verificación</label>
              <input value={selected.digito_verificacion} onChange={e => setSelected({ ...selected, digito_verificacion: e.target.value })} maxLength={2} style={inputStyle} placeholder="0-9" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Razón Social *</label>
              <input value={selected.razon_social} onChange={e => setSelected({ ...selected, razon_social: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Macro Sector *</label>
              <select value={selected.macro_sector} onChange={e => setSelected({ ...selected, macro_sector: e.target.value })} required style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('macro_sector').map(o => <option key={o} value={o}>{o}</option>)}
                {selected.macro_sector && !refOptions('macro_sector').includes(selected.macro_sector) && (
                  <option value={selected.macro_sector}>⚠ {selected.macro_sector}</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Actividad Económica CIU</label>
              <select
                value={selected.actividad}
                onChange={e => {
                  const desc = e.target.value
                  const ref = (refData.actividad_cliente || []).find(r => r.descripcion === desc)
                  setSelected({ ...selected, actividad: desc, actividad_codigo: ref?.codigo || '' })
                }}
                style={inputStyle}
              >
                <option value="">Seleccionar...</option>
                {(refData.actividad_cliente || []).filter(r => r.situacion).map(r => (
                  <option key={r.id} value={r.descripcion}>
                    {r.codigo ? `${r.codigo} — ${r.descripcion}` : r.descripcion}
                  </option>
                ))}
                {selected.actividad && !(refData.actividad_cliente || []).some(r => r.descripcion === selected.actividad) && (
                  <option value={selected.actividad}>⚠ {selected.actividad}</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Teléfono</label>
              <input value={selected.telefono} onChange={e => setSelected({ ...selected, telefono: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nro Móvil</label>
              <input value={selected.nro_movil} onChange={e => setSelected({ ...selected, nro_movil: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Correo *</label>
              <input type="email" value={selected.email} onChange={e => setSelected({ ...selected, email: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Sitio Web</label>
              <input value={selected.sitio_web} onChange={e => setSelected({ ...selected, sitio_web: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Condición de Pago</label>
              <select value={selected.condicion_pago} onChange={e => setSelected({ ...selected, condicion_pago: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('condiciones_pago').map(o => <option key={o} value={o}>{o}</option>)}
                {selected.condicion_pago && !refOptions('condiciones_pago').includes(selected.condicion_pago) && (
                  <option value={selected.condicion_pago}>⚠ {selected.condicion_pago}</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Moneda</label>
              <select value={selected.tipo_moneda} onChange={e => setSelected({ ...selected, tipo_moneda: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('tipo_moneda').map(o => <option key={o} value={o}>{o}</option>)}
                {selected.tipo_moneda && !refOptions('tipo_moneda').includes(selected.tipo_moneda) && (
                  <option value={selected.tipo_moneda}>⚠ {selected.tipo_moneda}</option>
                )}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Calificación como Pagador</label>
              <select value={selected.calificacion_pagador} onChange={e => setSelected({ ...selected, calificacion_pagador: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('calificacion_pagador').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Representante Legal</label>
              <input value={selected.representante_legal || ''} onChange={e => setSelected({ ...selected, representante_legal: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo de Cuenta</label>
              <select value={selected.tipo_cuenta_cliente || ''} onChange={e => setSelected({ ...selected, tipo_cuenta_cliente: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('tipo_cuenta_cliente').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#fcd34d', fontSize: 12, fontWeight: 800, display: 'block', marginBottom: 4 }}>⭐ Clase de Cliente *</label>
              <select
                value={(selected.id ? (clientes.find(c => c.id === selected.id)?.clase_cliente) : selected.clase_cliente) || 'Otros Clientes'}
                onChange={e => {
                  const nuevo = e.target.value
                  setSelected({ ...selected, clase_cliente: nuevo })
                  // Guardar al instante en el store si es edición (no esperar a click en Actualizar)
                  if (selected.id) {
                    useClientesStore.setState(s => ({
                      clientes: s.clientes.map(r => r.id === selected.id ? { ...r, clase_cliente: nuevo } : r)
                    }))
                  }
                }}
                style={{ ...inputStyle, border: '2px solid #fcd34d', background: 'rgba(252,211,77,0.1)', fontWeight: 700 }}
              >
                <option value="Otros Clientes">Otros Clientes</option>
                <option value="Especiales">Especiales</option>
              </select>
              <p style={{ color: 'rgba(252,211,77,0.8)', fontSize: 10, margin: '3px 0 0 0' }}>⚡ Se guarda automáticamente al cambiar</p>
            </div>
          </div>

          {/* Ubicación */}
          <div style={{ marginTop: 20, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ color: '#ffffff', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Ubicación</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 4' }}>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Dirección</label>
                <input value={selected.direccion} onChange={e => setSelected({ ...selected, direccion: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Departamento</label>
                <select value={selected.departamento} onChange={e => {
                  const newDep = e.target.value
                  // Solo limpiar ciudad si la actual no pertenece al nuevo departamento
                  const ciudadActualPerteneceADepto = newDep && (refData.ciudad || []).some(c => c.descripcion === selected.ciudad && (c.departamento || '') === newDep)
                  setSelected({ ...selected, departamento: newDep, ciudad: ciudadActualPerteneceADepto ? selected.ciudad : '' })
                }} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {refOptions('departamento').map(o => <option key={o} value={o}>{o}</option>)}
                  {selected.departamento && !refOptions('departamento').includes(selected.departamento) && (
                    <option value={selected.departamento}>⚠ {selected.departamento} (no canónico)</option>
                  )}
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ciudad</label>
                <select value={selected.ciudad} onChange={e => setSelected({ ...selected, ciudad: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {(refData.ciudad || [])
                    .filter(c => c.situacion && (!selected.departamento || (c.departamento || '') === selected.departamento))
                    .map(c => <option key={c.id} value={c.descripcion}>{c.descripcion}</option>)}
                  {selected.ciudad && !(refData.ciudad || []).some(c => c.descripcion === selected.ciudad && (!selected.departamento || (c.departamento || '') === selected.departamento)) && (
                    <option value={selected.ciudad}>⚠ {selected.ciudad} (no en lista oficial)</option>
                  )}
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código Ciudad</label>
                <input value={selected.codigo_ciudad || ''} onChange={e => setSelected({ ...selected, codigo_ciudad: e.target.value })} style={inputStyle} placeholder="Ej. 11001" />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>País</label>
                <select value={selected.pais} onChange={e => setSelected({ ...selected, pais: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {refOptions('pais').map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código País</label>
                <input value={selected.codigo_pais || ''} onChange={e => setSelected({ ...selected, codigo_pais: e.target.value })} style={inputStyle} placeholder="CO, US, MX..." />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código Postal</label>
                <input value={selected.codigo_postal || ''} onChange={e => setSelected({ ...selected, codigo_postal: e.target.value })} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Datos DIAN */}
          <div style={{ marginTop: 20, padding: 16, background: 'rgba(59,130,246,0.06)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.25)' }}>
            <h3 style={{ color: '#ffffff', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Datos Importantes Solicitados por DIAN</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Autoretenedor</label>
                <select value={selected.autoretenedor} onChange={e => setSelected({ ...selected, autoretenedor: e.target.value })} style={inputStyle}>
                  <option value="Si">Sí</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Agente Retenedor</label>
                <select value={selected.agente_retenedor} onChange={e => setSelected({ ...selected, agente_retenedor: e.target.value })} style={inputStyle}>
                  <option value="Si">Sí</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Gran Contribuyente</label>
                <select value={selected.gran_contribuyente} onChange={e => setSelected({ ...selected, gran_contribuyente: e.target.value })} style={inputStyle}>
                  <option value="Si">Sí</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Régimen IVA</label>
                <select value={selected.regimen_iva} onChange={e => setSelected({ ...selected, regimen_iva: e.target.value })} style={inputStyle}>
                  <option value="Responsable">Responsable</option>
                  <option value="No Responsable">No Responsable</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Clasificación Tributaria</label>
                <select value={selected.clasificacion_tributaria} onChange={e => setSelected({ ...selected, clasificacion_tributaria: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {refOptions('clasificacion_tributaria').map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mes Cierre Anual</label>
                <select value={selected.mes_cierre_anual} onChange={e => setSelected({ ...selected, mes_cierre_anual: e.target.value })} style={inputStyle}>
                  {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>% Retención Fuente</label>
                <input type="number" step="0.01" min="0" value={selected.retencion_fuente_pct || ''} onChange={e => setSelected({ ...selected, retencion_fuente_pct: parseFloat(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Retención Fuente</label>
                <select value={selected.tipo_retencion_fuente} onChange={e => setSelected({ ...selected, tipo_retencion_fuente: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {refOptions('tipo_retencion_fuente').map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>% Retención IVA</label>
                <input type="number" step="0.01" min="0" value={selected.retencion_iva_pct || ''} onChange={e => setSelected({ ...selected, retencion_iva_pct: parseFloat(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Retención IVA</label>
                <select value={selected.tipo_retencion_iva} onChange={e => setSelected({ ...selected, tipo_retencion_iva: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {refOptions('tipo_retencion_iva').map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Naturaleza de la Cuenta</label>
                <select value={selected.naturaleza_cuenta} onChange={e => setSelected({ ...selected, naturaleza_cuenta: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {refOptions('naturaleza_cuenta').map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>% Retención ICA</label>
                <input type="number" step="0.01" min="0" value={selected.retencion_ica_pct || ''} onChange={e => setSelected({ ...selected, retencion_ica_pct: parseFloat(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cupo de Crédito</label>
                <input type="number" step="1" min="0" value={selected.cupo_credito || ''} onChange={e => setSelected({ ...selected, cupo_credito: parseFloat(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Banco para Pagos</label>
                <input value={selected.banco_pagos} onChange={e => setSelected({ ...selected, banco_pagos: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cuenta</label>
                <input value={selected.cuenta_banco} onChange={e => setSelected({ ...selected, cuenta_banco: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo de Cuenta en Banco</label>
                <select value={selected.tipo_cuenta_banco} onChange={e => setSelected({ ...selected, tipo_cuenta_banco: e.target.value })} style={inputStyle}>
                  <option value="">Seleccione...</option>
                  {(refData.tipo_cuenta || []).filter(r => r.situacion).map(r => (
                    <option key={r.id} value={r.descripcion}>{r.descripcion}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Código de acceso PQRS */}
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(234,88,12,0.08)', borderRadius: 12, border: '1px solid rgba(234,88,12,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#ffffff', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Código de Acceso PQRS Público</label>
                <input value={selected.codigo_acceso || ''} readOnly style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: 2, opacity: 0.8 }} />
              </div>
              <button type="button" onClick={() => setSelected({ ...selected, codigo_acceso: generarCodigoAcceso() })}
                style={{ ...btnStyle, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316', fontSize: 12, marginTop: 18 }}>Regenerar</button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6 }}>Este código permite al cliente radicar PQRS desde el formulario público</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observaciones</label>
              <textarea value={selected.observaciones} onChange={e => setSelected({ ...selected, observaciones: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cómo nos Conoció</label>
              <textarea value={selected.como_nos_conocio || ''} onChange={e => setSelected({ ...selected, como_nos_conocio: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {refOptions('situacion_cliente').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ ...btnStyle, background: selected.id ? '#059669' : '#172554', color: '#ffffff', border: selected.id ? '1px solid #10b981' : 'none' }}>
              {selected.id ? '🔄 Actualizar Cliente' : '+ Guardar Cliente'}
            </button>
            <button type="button" onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#64748b', color: '#ffffff' }}>Cancelar</button>
          </div>
        </form>
      </div>
    )
  }

  // Report data
  const reportColumns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Razón Social', key: 'razon_social', width: 25 },
    { header: 'NIT/Doc', key: 'nro_documento', width: 14 },
    { header: 'DV', key: 'digito_verificacion', width: 6 },
    { header: 'Ciudad', key: 'ciudad', width: 12 },
    { header: 'Teléfono', key: 'telefono', width: 12 },
    { header: 'Correo', key: 'email', width: 18 },
    { header: 'Macro Sector', key: 'macro_sector', width: 14 },
    { header: 'Cód. CIU', key: 'actividad_codigo', width: 10 },
    { header: 'Actividad CIU', key: 'actividad', width: 18 },
    { header: 'Clase Cliente', key: 'clase_cliente', width: 14 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(c => ({
    codigo: c.codigo, razon_social: c.razon_social, nro_documento: c.nro_documento,
    digito_verificacion: c.digito_verificacion || '',
    ciudad: c.ciudad, telefono: c.telefono, email: c.email,
    macro_sector: c.macro_sector, actividad_codigo: c.actividad_codigo, actividad: c.actividad,
    clase_cliente: c.clase_cliente || '',
    situacion: c.situacion,
  }))
  const reportFilters = [
    { label: 'Situación', key: 'situacion', options: [...new Set(clientes.map(c => c.situacion).filter(Boolean))] },
    { label: 'Ciudad', key: 'ciudad', options: [...new Set(clientes.map(c => c.ciudad).filter(Boolean))] },
    { label: 'Macro Sector', key: 'macro_sector', options: [...new Set(clientes.map(c => c.macro_sector).filter(Boolean))] },
    { label: 'Actividad CIU', key: 'actividad', options: [...new Set(clientes.map(c => c.actividad).filter(Boolean))] },
    { label: 'Clase Cliente', key: 'clase_cliente', options: [...new Set(clientes.map(c => c.clase_cliente).filter(Boolean))] },
  ]

  // Reporte: Datos Cliente Variables DIAN
  const dianColumns = [
    { header: 'Razón Social', key: 'razon_social', width: 28 },
    { header: 'Tipo Documento', key: 'tipo_identificacion', width: 14 },
    { header: 'Número', key: 'nro_documento', width: 14 },
    { header: 'Dígito Validador', key: 'digito_verificacion', width: 10 },
    { header: 'Tipo Ret. Fuente', key: 'tipo_retencion_fuente', width: 14 },
    { header: 'Tipo Ret. IVA', key: 'tipo_retencion_iva', width: 14 },
    { header: 'Naturaleza Cuenta', key: 'naturaleza_cuenta', width: 14 },
    { header: 'Clasif. Tributaria', key: 'clasificacion_tributaria', width: 16 },
    { header: 'Responsable IVA', key: 'regimen_iva', width: 14 },
    { header: 'Auto Retenedor', key: 'autoretenedor', width: 12 },
    { header: 'Gran Contribuyente', key: 'gran_contribuyente', width: 14 },
  ]
  const dianRows = filtered.map(c => ({
    razon_social: c.razon_social,
    tipo_identificacion: c.tipo_identificacion || '',
    nro_documento: c.nro_documento,
    digito_verificacion: c.digito_verificacion || '',
    tipo_retencion_fuente: c.tipo_retencion_fuente || '',
    tipo_retencion_iva: c.tipo_retencion_iva || '',
    naturaleza_cuenta: c.naturaleza_cuenta || '',
    clasificacion_tributaria: c.clasificacion_tributaria || '',
    regimen_iva: c.regimen_iva || '',
    autoretenedor: c.autoretenedor || '',
    gran_contribuyente: c.gran_contribuyente || '',
  }))
  const dianFilters = [
    { label: 'Clase Cliente', key: 'clase_cliente', options: [...new Set(clientes.map(c => c.clase_cliente).filter(Boolean))] },
    { label: 'Responsable IVA', key: 'regimen_iva', options: [...new Set(clientes.map(c => c.regimen_iva).filter(Boolean))] },
    { label: 'Clasif. Tributaria', key: 'clasificacion_tributaria', options: [...new Set(clientes.map(c => c.clasificacion_tributaria).filter(Boolean))] },
    { label: 'Gran Contribuyente', key: 'gran_contribuyente', options: [...new Set(clientes.map(c => c.gran_contribuyente).filter(Boolean))] },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Clientes</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Gestión de clientes comerciales</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {permisos.esAdmin && clientes.length > 0 && tab === 'registros' && (
            <button
              onClick={() => {
                if (!confirm(`⚠️ ATENCIÓN\n\nSe eliminarán TODOS los ${clientes.length} clientes de forma permanente.\n\nEsta acción NO se puede deshacer.\n\n¿Continuar?`)) return
                const confirmTxt = prompt('Para confirmar, escribe: ELIMINAR TODOS')
                if (confirmTxt !== 'ELIMINAR TODOS') { alert('Cancelado. No se eliminó nada.'); return }
                useClientesStore.setState({ clientes: [] })
                alert('Base de Clientes eliminada.')
              }}
              style={{ ...btnStyle, background: '#b91c1c', color: '#ffffff', border: '1px solid #dc2626' }}
              title="Solo administradores"
            >
              🗑️ Eliminar Base ({clientes.length})
            </button>
          )}
          {permisos.editar && tab === 'registros' && (
            <>
              <button onClick={descargarPlantilla} style={{ ...btnStyle, background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)' }} title="Descargar plantilla Excel con los encabezados">📋 Plantilla</button>
              <label style={{ ...btnStyle, background: '#059669', color: '#ffffff', border: '1px solid #10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Importar clientes desde Excel">
                📥 Importar Excel
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return
                  await importarExcel(f)
                  e.target.value = ''
                }} />
              </label>
              <button onClick={() => { setSelected(emptyCliente(nextConsecutivo('CLI-', clientes.map(c => c.codigo)).codigo)); setIsForm(true) }} style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>+ Nuevo Cliente</button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Registros</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {tab === 'registros' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, código o documento..."
            style={{ ...inputStyle, maxWidth: 400, marginBottom: 16 }} />

          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Código', 'Razón Social', 'Tipo Documento', 'Nro Documento', 'DV', 'Dirección', 'Ciudad', 'País', 'Teléfono', 'Situación', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', background: '#1e3a8a', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', fontSize: 13, fontFamily: 'monospace' }}>{c.codigo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{c.razon_social}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.tipo_identificacion}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.nro_documento}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' }}>{c.digito_verificacion || '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.direccion}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.ciudad}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.pais}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.telefono}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(c.situacion) }}>{c.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewDetail(c)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                        {permisos.editar && <button onClick={() => { setSelected(c); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>}
                        {permisos.eliminar && <button onClick={() => { if (confirm(`¿Eliminar cliente "${c.razon_social}"?`)) deleteCliente(c.id); logAudit({ ...auditParams(), accion: "ELIMINAR", registro_codigo: c.codigo, registro_nombre: c.razon_social }) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay clientes registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ background: '#dc2626', color: '#fff', padding: '20px', borderRadius: 12, fontSize: 18, fontWeight: 900, textAlign: 'center', border: '4px solid #fbbf24' }}>
            🚨 DEPLOY DIAGNÓSTICO v3 — Si ves este banner ROJO, el código nuevo SÍ está activo. Haz scroll completo hacia abajo para ver el reporte DIAN debajo del panel general.
          </div>
          <ReportPanel title="Reporte de Clientes" columns={reportColumns} rows={reportRows} filters={reportFilters} />
          <div style={{ height: 4, background: '#fbbf24' }} />
          <div style={{ background: 'rgba(220,38,38,0.15)', border: '3px solid #dc2626', borderRadius: 12, padding: 16 }}>
            <h2 style={{ color: '#fbbf24', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>📋 DATOS CLIENTE VARIABLES DIAN ⬇️</h2>
            <ReportPanel title="Datos Cliente Variables DIAN" columns={dianColumns} rows={dianRows} filters={dianFilters} />
          </div>
        </div>
      )}
    </div>
  )
}
