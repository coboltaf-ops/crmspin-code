'use client'
import { logAudit, computarDiff } from '@/shared/lib/audit'
import { useState, useEffect } from 'react'
import { useProductosStore, Producto } from '@/features/productos/store/productos-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import * as XLSX from 'xlsx'

const PRODUCTO_FIELDS: (keyof Producto)[] = [
  'codigo', 'descripcion', 'razon_social', 'tipo_empaque', 'tipo_formula', 'porcentaje_iva',
  'tipo_precio', 'precio_unitario', 'fecha_vigencia_precio', 'observaciones',
  'costo_producto', 'margen_contribucion_pct', 'margen_calculo_pct',
  'valor_trm', 'conversion_cop', 'valor_usd',
  'unidad_medida', 'existencia_actual', 'valor_permanente_stock', 'costo_inventario',
  'situacion',
]
const NUMERIC_PRODUCTO_FIELDS = new Set<keyof Producto>([
  'precio_unitario', 'costo_producto', 'margen_contribucion_pct', 'margen_calculo_pct',
  'valor_trm', 'conversion_cop', 'valor_usd',
  'existencia_actual', 'valor_permanente_stock', 'costo_inventario',
])
const norm = (s: string) => s.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

const FIELD_SYNONYMS_PROD: Record<string, keyof Producto> = {
  // Código
  'cod': 'codigo', 'codigoproducto': 'codigo', 'codigodelproducto': 'codigo',
  // Descripción / Nombre
  'nombre': 'descripcion', 'producto': 'descripcion', 'nombreproducto': 'descripcion', 'nombredelproducto': 'descripcion', 'descripciondelproducto': 'descripcion',
  // Razón social / cliente
  'cliente': 'razon_social', 'razonsocial': 'razon_social', 'razonsocialcliente': 'razon_social', 'razonsocialdelcliente': 'razon_social', 'nombrecliente': 'razon_social',
  // Empaque
  'empaque': 'tipo_empaque', 'tipoempaque': 'tipo_empaque', 'tipodeempaque': 'tipo_empaque',
  // Fórmula
  'formula': 'tipo_formula', 'tipoformula': 'tipo_formula', 'tipodeformula': 'tipo_formula',
  // IVA
  'iva': 'porcentaje_iva', 'porcentajeiva': 'porcentaje_iva', 'porciva': 'porcentaje_iva', 'porcentajedeiva': 'porcentaje_iva',
  // Tipo de precio
  'tipoprecio': 'tipo_precio', 'tipodeprecio': 'tipo_precio',
  // Precio
  'precio': 'precio_unitario', 'preciounitario': 'precio_unitario', 'preciovta': 'precio_unitario', 'preciodeventa': 'precio_unitario', 'precioventa': 'precio_unitario',
  // Fecha vigencia
  'fechavigencia': 'fecha_vigencia_precio', 'vigencia': 'fecha_vigencia_precio', 'fechavigenciaprecio': 'fecha_vigencia_precio', 'fechadevigencia': 'fecha_vigencia_precio',
  // Unidad
  'unidad': 'unidad_medida', 'unidadmedida': 'unidad_medida', 'unidmedida': 'unidad_medida', 'unidaddemedida': 'unidad_medida', 'um': 'unidad_medida',
  // Costo
  'costo': 'costo_producto', 'costoproducto': 'costo_producto', 'costodelproducto': 'costo_producto',
  // Márgenes
  'margen': 'margen_contribucion_pct',
  'margencontribucion': 'margen_contribucion_pct', 'margendecontribucion': 'margen_contribucion_pct', 'margendecontribucionpct': 'margen_contribucion_pct', 'margencontribucionpct': 'margen_contribucion_pct',
  'margencalc': 'margen_calculo_pct', 'margencalculo': 'margen_calculo_pct', 'margenparacalculo': 'margen_calculo_pct', 'margenparaelcalculo': 'margen_calculo_pct', 'margenparacalculopct': 'margen_calculo_pct', 'margencalculopct': 'margen_calculo_pct',
  // TRM / USD / COP
  'trm': 'valor_trm', 'valortrm': 'valor_trm',
  'conversioncop': 'conversion_cop', 'cop': 'conversion_cop',
  'usd': 'valor_usd', 'valorusd': 'valor_usd', 'valorenusd': 'valor_usd',
  // Inventario
  'existencia': 'existencia_actual', 'stock': 'existencia_actual', 'existenciaactual': 'existencia_actual',
  'valorstock': 'valor_permanente_stock', 'valorpermanentestock': 'valor_permanente_stock', 'valorpermanentedestock': 'valor_permanente_stock',
  'costoinventario': 'costo_inventario', 'costodeinventario': 'costo_inventario',
  // Otros
  'observaciones': 'observaciones', 'obs': 'observaciones',
  'situacion': 'situacion', 'estado': 'situacion',
}
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { fmtMoney } from '@/shared/lib/format-number'
import { todayColombia, fDate } from '@/shared/lib/format-date'
import ReportPanel from '@/shared/components/report-panel'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import DocumentosPanel from '@/shared/components/documentos-panel'
import { useAsistenteStore } from '@/shared/stores/asistente-store'
import { Seguimiento } from '@/shared/types/seguimiento'

const today = todayColombia()

const emptyProducto = (): Producto => ({
  id: '',
  codigo: '',
  descripcion: '',
  razon_social: '',
  tipo_empaque: '',
  tipo_formula: '',
  porcentaje_iva: '',
  tipo_precio: '',
  precio_unitario: 0,
  fecha_vigencia_precio: today,
  situacion: 'Activo',
  observaciones: '',
  fecha_registro: today,
  costo_producto: 0,
  margen_contribucion_pct: 0,
  margen_calculo_pct: 0,
  valor_trm: 0,
  conversion_cop: 0,
  valor_usd: 0,
  unidad_medida: 'Unidad',
  existencia_actual: 0,
  valor_permanente_stock: 0,
  costo_inventario: 0,
  seguimientos: [],
})

export default function ProductosPage() {
  const permisos = usePermisos('productos')
  const currentUser = useCurrentUserStore(s => s.user)
  const { productos, addProducto, updateProducto, deleteProducto } = useProductosStore()
  const clientes = useClientesStore(s => s.clientes)
  const refData = useReferenceStore(s => s.data)

  const [selected, setSelected] = useState<Producto | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<Producto | null>(null)
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')
  const [search, setSearch] = useState('')
  const { pendingSearch, pendingAction, clearPending } = useAsistenteStore()
  useEffect(() => {
    if (pendingSearch) setSearch(pendingSearch)
    if (pendingAction === 'nuevo') { setSelected(emptyProducto()); setIsForm(true) }
    if (pendingSearch || pendingAction) clearPending()
  }, [])

  const filtered = productos.filter(p =>
    !search || p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo.toLowerCase().includes(search.toLowerCase())
  )

  const descargarPlantilla = () => {
    const headers = PRODUCTO_FIELDS.filter(f => f !== 'situacion')
    const ws = XLSX.utils.aoa_to_sheet([headers as unknown as string[]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla-productos.xlsx')
  }

  const importarExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      if (rows.length === 0) { alert('El Excel está vacío.'); return }

      const headerMap: Record<string, keyof Producto> = {}
      const ignoradas: string[] = []
      const noReconocidos: string[] = []
      const ignored = new Set<keyof Producto>(['situacion', 'fecha_registro'])
      Object.keys(rows[0]).forEach(h => {
        const n = norm(h)
        const direct = PRODUCTO_FIELDS.find(f => norm(f) === n)
        const synonym = FIELD_SYNONYMS_PROD[n]
        const match = direct || synonym
        if (match && !ignored.has(match)) headerMap[h] = match
        else if (match && ignored.has(match)) ignoradas.push(h)
        else noReconocidos.push(h)
      })
      if (Object.keys(headerMap).length === 0) {
        alert(`No se reconoció ninguna columna.\n\nEncabezados encontrados:\n${Object.keys(rows[0]).join(', ')}\n\nDescarga la Plantilla y usa esos nombres exactos.`)
        return
      }
      const detectados = Object.entries(headerMap).map(([h, f]) => `  "${h}" → ${f}`).join('\n')
      const ignoradasMsg = ignoradas.length ? `\n\nℹ️ Columnas que el sistema asigna sola (no se importan):\n  ${ignoradas.join(', ')}` : ''
      const omitidosCols = noReconocidos.length ? `\n\n⚠️ Columnas NO reconocidas (se ignoran):\n  ${noReconocidos.join(', ')}` : ''
      if (!confirm(`Se detectaron ${Object.keys(headerMap).length} columnas y ${rows.length} filas.\n\n✓ Mapeo:\n${detectados}${ignoradasMsg}${omitidosCols}\n\n¿Continuar con la importación?`)) return

      let creados = 0, sinCodigo = 0, sinDescripcion = 0, duplicados = 0, errores = 0
      const codigosExistentes = new Set(productos.map(p => p.codigo))
      const codigosEnArchivo = new Set<string>()

      for (const row of rows) {
        try {
          const prod = emptyProducto()

          for (const [header, field] of Object.entries(headerMap)) {
            const raw = row[header]
            if (raw === '' || raw === null || raw === undefined) continue
            if (NUMERIC_PRODUCTO_FIELDS.has(field)) {
              const n = Number(String(raw).replace(/[^0-9.\-]/g, ''))
              ;(prod as unknown as Record<string, unknown>)[field] = isNaN(n) ? 0 : n
            } else {
              ;(prod as unknown as Record<string, unknown>)[field] = String(raw).trim()
            }
          }

          if (!prod.codigo) { sinCodigo++; continue }
          if (!prod.descripcion) { sinDescripcion++; continue }
          if (codigosExistentes.has(prod.codigo) || codigosEnArchivo.has(prod.codigo)) { duplicados++; continue }

          prod.situacion = 'Activo'
          prod.fecha_registro = today

          addProducto({ ...prod, id: crypto.randomUUID() })
          codigosEnArchivo.add(prod.codigo)
          creados++
        } catch { errores++ }
      }

      alert(`Importación finalizada:\n\n✓ Creados: ${creados}\n✗ Sin Código: ${sinCodigo}\n✗ Sin Descripción: ${sinDescripcion}\n⊘ Código duplicado (ya existe): ${duplicados}\n✗ Otros errores: ${errores}`)
    } catch (err) {
      alert('Error al leer el Excel: ' + (err as Error).message)
    }
  }

  const auditParams = () => ({
    usuario: currentUser?.usuario || 'desconocido',
    usuario_nombre: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(),
    rol: currentUser?.rol || '',
    modulo: 'productos',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (!selected.codigo.trim()) { alert('El código es obligatorio'); return }
    const duplicado = productos.find(p => p.codigo.toLowerCase() === selected.codigo.toLowerCase() && p.id !== selected.id)
    if (duplicado) { alert(`Ya existe un producto con el código "${selected.codigo}"`); return }
    if (selected.id) { const _anterior = productos.find(x => x.id === selected.id); updateProducto(selected.id, selected); logAudit({ ...auditParams(), accion: "MODIFICAR", registro_codigo: selected.codigo, registro_nombre: selected.descripcion, detalle: computarDiff(_anterior as unknown as Record<string, unknown>, selected as unknown as Record<string, unknown>) }) }
    else { addProducto({ ...selected, id: crypto.randomUUID() }) }
    setIsForm(false); setSelected(null)
  }

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Activo': { background: '#4169E1', color: '#ffffff', border: '1px solid #3b82f6' },
      'Inactivo': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
      'Descontinuado': { background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' },
    }
    return map[s] || {}
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', boxSizing: 'border-box', height: 38 }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#4169E1' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)' })
  const labelStyle: React.CSSProperties = { color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }
  const sectionStyle: React.CSSProperties = { marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)' }
  const sectionTitleStyle: React.CSSProperties = { color: '#60a5fa', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }
  const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)

  if (viewDetail) {
    const fields: Array<{ label: string; value: string; section?: string }> = [
      { label: 'Código', value: viewDetail.codigo },
      { label: 'Descripción', value: viewDetail.descripcion },
      { label: 'Tipo Empaque', value: viewDetail.tipo_empaque },
      { label: 'Tipo Fórmula', value: viewDetail.tipo_formula },
      { label: 'Porcentaje IVA', value: viewDetail.porcentaje_iva },
      { label: 'Tipo Precio', value: viewDetail.tipo_precio },
      { label: 'Precio', value: `$${fmtMoney(viewDetail.precio_unitario)}` },
      { label: 'Fecha Vigencia Precio', value: fDate(viewDetail.fecha_vigencia_precio) },
      { label: 'Situación', value: viewDetail.situacion },
    ]
    const calcVenta = [
      { label: 'Costo producto', value: `$${fmtMoney(viewDetail.costo_producto)}` },
      { label: 'Margen Contribución %', value: `${viewDetail.margen_contribucion_pct}%` },
      { label: 'Margen para Cálculo %', value: `${viewDetail.margen_calculo_pct}%` },
    ]
    const calcEspecial = [
      { label: 'Valor TRM', value: `$${fmtMoney(viewDetail.valor_trm)}` },
      { label: 'Conversión COP', value: `$${fmtMoney(viewDetail.conversion_cop)}` },
      { label: 'Valor US$', value: `$${fmtMoney(viewDetail.valor_usd)}` },
    ]
    const invent = [
      { label: 'Unidad Medida', value: viewDetail.unidad_medida },
      { label: 'Existencia Actual', value: String(viewDetail.existencia_actual) },
      { label: 'Valor Permanente de Stock', value: `$${fmtMoney(viewDetail.valor_permanente_stock)}` },
    ]

    const detailGrid = (items: Array<{ label: string; value: string }>) => (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {items.map(f => (
          <div key={f.label}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
            <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
          </div>
        ))}
      </div>
    )

    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{viewDetail.descripcion}</h2>
          {detailGrid(fields)}

          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Variables para Cálculo Precio Venta Producto</p>
            {detailGrid(calcVenta)}
          </div>
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Variables para Cálculo Precio Clientes Especiales</p>
            {detailGrid(calcEspecial)}
          </div>
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Datos Inventario</p>
            {detailGrid(invent)}
          </div>

          {viewDetail.observaciones && (
            <div style={{ marginTop: 16 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>Observaciones</p>
              <p style={{ color: '#ffffff', fontSize: 14, whiteSpace: 'pre-wrap' }}>{viewDetail.observaciones}</p>
            </div>
          )}

          {permisos.editar && (
            <button onClick={() => { setSelected(viewDetail); setIsForm(true); setViewDetail(null) }} style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6', marginTop: 16 }}>Editar</button>
          )}
          <SeguimientoPanel
            seguimientos={viewDetail.seguimientos || []}
            usuario={`${currentUser?.nombre} ${currentUser?.apellido}`}
            situacionActual={viewDetail.situacion}
            situacionOpciones={refData.situacion_lista.filter(r => r.situacion).map(r => r.descripcion)}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updateProducto(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
          <DocumentosPanel modulo="productos" registroId={viewDetail.id} />
        </div>
      </div>
    )
  }

  if (isForm && selected) {
    const numberInput = (value: number, onChange: (n: number) => void, opts: { step?: string; min?: string } = {}) => (
      <input
        type="number"
        step={opts.step ?? '1'}
        min={opts.min ?? '0'}
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={inputStyle}
      />
    )

    return (
      <div>
        <button onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nuevo'} Producto</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Código *</label>
              <input value={selected.codigo} onChange={e => setSelected({ ...selected, codigo: e.target.value })} required style={inputStyle} placeholder="Ej. PRD-001" />
            </div>
            <div>
              <label style={labelStyle}>Descripción *</label>
              <input value={selected.descripcion} onChange={e => setSelected({ ...selected, descripcion: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tipo Empaque</label>
              <select value={selected.tipo_empaque} onChange={e => setSelected({ ...selected, tipo_empaque: e.target.value })} style={inputStyle}>
                <option value="">Seleccione...</option>
                {refOptions('tipo_empaque').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tipo de Fórmula</label>
              <select value={selected.tipo_formula} onChange={e => setSelected({ ...selected, tipo_formula: e.target.value })} style={inputStyle}>
                <option value="">Seleccione...</option>
                {refOptions('tipo_formula').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Unidad Medida</label>
              <select value={selected.unidad_medida} onChange={e => setSelected({ ...selected, unidad_medida: e.target.value })} style={inputStyle}>
                <option value="">Seleccione...</option>
                {refOptions('unidad_medida').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Precio *</label>
              {numberInput(selected.precio_unitario, v => setSelected({ ...selected, precio_unitario: Math.round(v) }), { step: '1' })}
            </div>
            <div>
              <label style={labelStyle}>Fecha Vigencia</label>
              <input type="date" value={selected.fecha_vigencia_precio} onChange={e => setSelected({ ...selected, fecha_vigencia_precio: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>Razón Social</label>
              <select value={selected.razon_social} onChange={e => setSelected({ ...selected, razon_social: e.target.value })} style={inputStyle}>
                <option value="">— Sin asignar —</option>
                {clientes.filter(c => c.situacion === 'Activo').map(c => (
                  <option key={c.id} value={c.razon_social}>{c.razon_social}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tipo de Precio</label>
              <select value={selected.tipo_precio} onChange={e => setSelected({ ...selected, tipo_precio: e.target.value })} style={inputStyle}>
                <option value="">Seleccione...</option>
                {refOptions('tipo_precio').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fecha Registro</label>
              <input value={fDate(selected.fecha_registro)} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
            <div>
              <label style={labelStyle}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {refOptions('situacion_lista').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Variables para Cálculo Precio Venta Producto</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Costo producto</label>
                {numberInput(selected.costo_producto, v => setSelected({ ...selected, costo_producto: v }), { step: '0.01' })}
              </div>
              <div>
                <label style={labelStyle}>Margen de Contribución %</label>
                {numberInput(selected.margen_contribucion_pct, v => setSelected({ ...selected, margen_contribucion_pct: v }), { step: '0.01' })}
              </div>
              <div>
                <label style={labelStyle}>Margen para Cálculo %</label>
                {numberInput(selected.margen_calculo_pct, v => setSelected({ ...selected, margen_calculo_pct: v }), { step: '0.01' })}
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Variables para Cálculo Precio Clientes Especiales</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Valor TRM</label>
                {numberInput(selected.valor_trm, v => setSelected({ ...selected, valor_trm: v }), { step: '0.01' })}
              </div>
              <div>
                <label style={labelStyle}>Conversión COP</label>
                {numberInput(selected.conversion_cop, v => setSelected({ ...selected, conversion_cop: v }), { step: '0.01' })}
              </div>
              <div>
                <label style={labelStyle}>Valor US$</label>
                {numberInput(selected.valor_usd, v => setSelected({ ...selected, valor_usd: v }), { step: '0.01' })}
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>Datos Inventario</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Existencia Actual</label>
                {numberInput(selected.existencia_actual, v => setSelected({ ...selected, existencia_actual: v }), { step: '1' })}
              </div>
              <div>
                <label style={labelStyle}>Valor Permanente de Stock</label>
                {numberInput(selected.valor_permanente_stock, v => setSelected({ ...selected, valor_permanente_stock: v }), { step: '0.01' })}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={labelStyle}>Observaciones</label>
            <textarea value={selected.observaciones} onChange={e => setSelected({ ...selected, observaciones: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>Guardar</button>
            <button type="button" onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#64748b', color: '#ffffff' }}>Cancelar</button>
          </div>
        </form>
      </div>
    )
  }

  const reportColumns = [
    { header: 'Código', key: 'codigo', width: 14 },
    { header: 'Descripción', key: 'descripcion', width: 28 },
    { header: 'Tipo Empaque', key: 'tipo_empaque', width: 14 },
    { header: 'Tipo Precio', key: 'tipo_precio', width: 14 },
    { header: 'Precio', key: 'precio', width: 14 },
    { header: 'Vigencia', key: 'fecha_vigencia_precio', width: 12 },
    { header: 'Existencia', key: 'existencia_actual', width: 12 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(p => ({
    codigo: p.codigo,
    descripcion: p.descripcion,
    tipo_empaque: p.tipo_empaque,
    tipo_precio: p.tipo_precio,
    precio: `$${fmtMoney(p.precio_unitario)}`,
    fecha_vigencia_precio: fDate(p.fecha_vigencia_precio),
    existencia_actual: p.existencia_actual,
    situacion: p.situacion,
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Lista de Productos</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Catálogo de productos y servicios para cotizar</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {permisos.esAdmin && productos.length > 0 && tab === 'registros' && (
            <button
              onClick={() => {
                if (!confirm(`⚠️ ATENCIÓN\n\nSe eliminarán TODOS los ${productos.length} productos de forma permanente.\n\nEsta acción NO se puede deshacer.\n\n¿Continuar?`)) return
                const confirmTxt = prompt('Para confirmar, escribe: ELIMINAR TODOS')
                if (confirmTxt !== 'ELIMINAR TODOS') { alert('Cancelado. No se eliminó nada.'); return }
                useProductosStore.setState({ productos: [] })
                alert('Base de Productos eliminada.')
              }}
              style={{ ...btnStyle, background: '#b91c1c', color: '#ffffff', border: '1px solid #dc2626' }}
              title="Solo administradores"
            >
              🗑️ Eliminar Base ({productos.length})
            </button>
          )}
          {permisos.editar && tab === 'registros' && (
            <>
              <button onClick={descargarPlantilla} style={{ ...btnStyle, background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)' }} title="Descargar plantilla Excel con los encabezados">📋 Plantilla</button>
              <label style={{ ...btnStyle, background: '#059669', color: '#ffffff', border: '1px solid #10b981', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Importar productos desde Excel">
                📥 Importar Excel
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return
                  await importarExcel(f)
                  e.target.value = ''
                }} />
              </label>
              <button onClick={() => { setSelected(emptyProducto()); setIsForm(true) }} style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>+ Nuevo Producto</button>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descripción o código..."
            style={{ ...inputStyle, maxWidth: 400, marginBottom: 16 }} />
          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Código', 'Descripción', 'Razón Social', 'Tipo Empaque', 'Tipo Precio', 'Precio', 'Vigencia', 'Existencia', 'Situación', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', background: '#1e3a8a', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', fontSize: 13, fontFamily: 'monospace' }}>{p.codigo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{p.descripcion}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.razon_social || '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.tipo_empaque}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.tipo_precio}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', fontSize: 13, fontWeight: 600 }}>${fmtMoney(p.precio_unitario)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{fDate(p.fecha_vigencia_precio)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'right' }}>{p.existencia_actual}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(p.situacion) }}>{p.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewDetail(p)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                        {permisos.editar && <button onClick={() => { setSelected(p); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>}
                        {permisos.eliminar && <button onClick={() => { if (confirm(`¿Eliminar "${p.descripcion}"?`)) deleteProducto(p.id); logAudit({ ...auditParams(), accion: "ELIMINAR", registro_codigo: p.codigo, registro_nombre: p.descripcion }) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay productos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <ReportPanel title="Reporte de Productos" columns={reportColumns} rows={reportRows}
          filters={[
            { label: 'Situación', key: 'situacion', options: [...new Set(productos.map(p => p.situacion).filter(Boolean))] },
            { label: 'Tipo Empaque', key: 'tipo_empaque', options: [...new Set(productos.map(p => p.tipo_empaque).filter(Boolean))] },
            { label: 'Tipo Precio', key: 'tipo_precio', options: [...new Set(productos.map(p => p.tipo_precio).filter(Boolean))] },
          ]} />
      )}
    </div>
  )
}
