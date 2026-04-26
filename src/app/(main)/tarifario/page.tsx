'use client'
import { useState, useEffect, useMemo } from 'react'
import { useTarifarioStore, PrecioCliente } from '@/features/tarifario/store/tarifario-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useProductosStore } from '@/features/productos/store/productos-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { fmtMoney } from '@/shared/lib/format-number'
import { fDate, todayColombia } from '@/shared/lib/format-date'
import ReportPanel from '@/shared/components/report-panel'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import { Seguimiento } from '@/shared/types/seguimiento'

const today = todayColombia()

const emptyPrecio = (): PrecioCliente => ({
  id: '', cliente_id: '', cliente_codigo: '', cliente_nombre: '',
  producto_id: '', producto_codigo: '', producto_descripcion: '',
  precio: 0, fecha_inicio_vigencia: today, fecha_fin_vigencia: '',
  situacion: 'Activo', observaciones: '', fecha_registro: today, seguimientos: [],
})

export default function TarifarioPage() {
  const permisos = usePermisos('tarifario')
  const currentUser = useCurrentUserStore(s => s.user)
  const { precios, addPrecio, updatePrecio, deletePrecio } = useTarifarioStore()
  const clientes = useClientesStore(s => s.clientes).filter(c => c.situacion === 'Activo')
  const productos = useProductosStore(s => s.productos).filter(p => p.situacion === 'Activo')
  const refData = useReferenceStore(s => s.data)

  const [selected, setSelected] = useState<PrecioCliente | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<PrecioCliente | null>(null)
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')
  const [search, setSearch] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)

  const filtered = useMemo(() => {
    return precios.filter(p => {
      if (soloActivos && p.situacion !== 'Activo') return false
      if (filtroCliente && p.cliente_id !== filtroCliente) return false
      if (search) {
        const s = search.toLowerCase()
        return p.cliente_nombre.toLowerCase().includes(s) ||
          p.producto_codigo.toLowerCase().includes(s) ||
          p.producto_descripcion.toLowerCase().includes(s)
      }
      return true
    }).sort((a, b) => a.cliente_nombre.localeCompare(b.cliente_nombre) || a.producto_codigo.localeCompare(b.producto_codigo))
  }, [precios, search, filtroCliente, soloActivos])

  useEffect(() => {
    // no pending actions
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const cli = clientes.find(c => c.id === selected.cliente_id)
    const prod = productos.find(p => p.id === selected.producto_id)
    if (!cli) { alert('Selecciona un Cliente válido'); return }
    if (!prod) { alert('Selecciona un Producto válido'); return }
    if (selected.precio <= 0) { alert('Precio debe ser mayor a cero'); return }

    // Regla: un cliente+producto no puede tener 2 Activos simultáneamente
    const duplicado = precios.find(p =>
      p.cliente_id === selected.cliente_id &&
      p.producto_id === selected.producto_id &&
      p.situacion === 'Activo' &&
      p.id !== selected.id
    )
    if (duplicado && selected.situacion === 'Activo') {
      if (!confirm(`Ya existe una tarifa Activa para ${cli.razon_social} — ${prod.codigo}. ¿Desactivar la anterior y crear esta como nueva vigencia?`)) return
      updatePrecio(duplicado.id, { situacion: 'Inactivo', fecha_fin_vigencia: selected.fecha_inicio_vigencia })
    }

    const toSave: PrecioCliente = {
      ...selected,
      cliente_codigo: cli.codigo,
      cliente_nombre: cli.razon_social,
      producto_codigo: prod.codigo,
      producto_descripcion: prod.descripcion,
      precio: Math.round(selected.precio),
    }
    if (toSave.id) { updatePrecio(toSave.id, toSave) }
    else { addPrecio({ ...toSave, id: crypto.randomUUID() }) }
    setIsForm(false); setSelected(null)
  }

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Activo': { background: '#4169E1', color: '#ffffff', border: '1px solid #3b82f6' },
      'Inactivo': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
    }
    return map[s] || {}
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', boxSizing: 'border-box', height: 38 }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#4169E1' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)' })
  const labelStyle: React.CSSProperties = { color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }

  // ─── VIEW DETAIL ───
  if (viewDetail) {
    const fields = [
      { label: 'Cliente', value: `${viewDetail.cliente_codigo} — ${viewDetail.cliente_nombre}` },
      { label: 'Producto', value: `${viewDetail.producto_codigo} — ${viewDetail.producto_descripcion}` },
      { label: 'Precio', value: `$${fmtMoney(viewDetail.precio)}` },
      { label: 'Inicio Vigencia', value: fDate(viewDetail.fecha_inicio_vigencia) },
      { label: 'Fin Vigencia', value: viewDetail.fecha_fin_vigencia ? fDate(viewDetail.fecha_fin_vigencia) : 'Indefinida' },
      { label: 'Situación', value: viewDetail.situacion },
      { label: 'Fecha Registro', value: fDate(viewDetail.fecha_registro) },
      { label: 'Observaciones', value: viewDetail.observaciones },
    ]
    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Tarifa: {viewDetail.cliente_nombre}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.label}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
              </div>
            ))}
          </div>
          {permisos.editar && (
            <button onClick={() => { setSelected(viewDetail); setIsForm(true); setViewDetail(null) }} style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6', marginTop: 16 }}>Editar</button>
          )}
          <SeguimientoPanel
            seguimientos={viewDetail.seguimientos || []}
            usuario={`${currentUser?.nombre} ${currentUser?.apellido}`}
            situacionActual={viewDetail.situacion}
            situacionOpciones={['Activo', 'Inactivo']}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updatePrecio(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
        </div>
      </div>
    )
  }

  // ─── FORM ───
  if (isForm && selected) {
    const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)
    return (
      <div>
        <button onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nueva'} Tarifa</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Fecha Registro</label>
              <input value={fDate(selected.fecha_registro)} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
            <div style={{ gridColumn: 'span 1' }}></div>
            <div>
              <label style={labelStyle}>Cliente *</label>
              <select value={selected.cliente_id} onChange={e => setSelected({ ...selected, cliente_id: e.target.value })} required style={inputStyle}>
                <option value="">Seleccionar...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Producto *</label>
              <select value={selected.producto_id} onChange={e => setSelected({ ...selected, producto_id: e.target.value })} required style={inputStyle}>
                <option value="">Seleccionar...</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.descripcion}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Precio *</label>
              <input type="number" step="1" min="0" value={selected.precio || ''} onChange={e => setSelected({ ...selected, precio: parseFloat(e.target.value) || 0 })} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Inicio Vigencia *</label>
              <input type="date" value={selected.fecha_inicio_vigencia} onChange={e => setSelected({ ...selected, fecha_inicio_vigencia: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fin Vigencia (opcional)</label>
              <input type="date" value={selected.fecha_fin_vigencia} onChange={e => setSelected({ ...selected, fecha_fin_vigencia: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Observaciones</label>
              <textarea value={selected.observaciones} onChange={e => setSelected({ ...selected, observaciones: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical', height: 'auto' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>Guardar</button>
            <button type="button" onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#64748b', color: '#ffffff' }}>Cancelar</button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 10 }}>
            Regla: un mismo Cliente + Producto no puede tener 2 tarifas Activas simultáneamente. Si existe una Activa, se te preguntará si quieres desactivarla automáticamente al crear esta.
          </p>
        </form>
      </div>
    )
  }

  // ─── REPORT DATA ───
  const reportColumns = [
    { header: 'Cliente', key: 'cliente', width: 28 },
    { header: 'Producto', key: 'producto', width: 28 },
    { header: 'Precio', key: 'precio', width: 14 },
    { header: 'Inicio Vig.', key: 'inicio', width: 12 },
    { header: 'Fin Vig.', key: 'fin', width: 12 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(p => ({
    cliente: `${p.cliente_codigo} — ${p.cliente_nombre}`,
    producto: `${p.producto_codigo} — ${p.producto_descripcion}`,
    precio: `$${fmtMoney(p.precio)}`,
    inicio: fDate(p.fecha_inicio_vigencia),
    fin: p.fecha_fin_vigencia ? fDate(p.fecha_fin_vigencia) : 'Indefinida',
    situacion: p.situacion,
  }))

  // ─── MAIN ───
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Tarifario por Cliente</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Precios negociados por cliente-producto con vigencia</p>
        </div>
        {permisos.editar && tab === 'registros' && (
          <button onClick={() => { setSelected(emptyPrecio()); setIsForm(true) }} style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>+ Nueva Tarifa</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Registros</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {tab === 'registros' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente o producto..." style={{ ...inputStyle, flex: 1, minWidth: 250, maxWidth: 400 }} />
            <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }}>
              <option value="">Todos los clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.razon_social}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ffffff', fontSize: 13, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} /> Solo Activos
            </label>
          </div>

          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Cliente', 'Producto', 'Unid. Medida', 'Empaque', 'Precio', 'Inicio Vig.', 'Fin Vig.', 'Situación', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', background: '#1e3a8a', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const prod = productos.find(x => x.id === p.producto_id)
                  return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>
                      <div style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 11 }}>{p.cliente_codigo}</div>
                      {p.cliente_nombre}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>
                      <div style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 11 }}>{p.producto_codigo}</div>
                      {p.producto_descripcion}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{prod?.unidad_medida || '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{prod?.tipo_empaque || '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', fontSize: 13, fontWeight: 700 }}>${fmtMoney(p.precio)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{fDate(p.fecha_inicio_vigencia)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.fecha_fin_vigencia ? fDate(p.fecha_fin_vigencia) : '—'}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(p.situacion) }}>{p.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewDetail(p)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                        {permisos.editar && <button onClick={() => { setSelected(p); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>}
                        {permisos.eliminar && <button onClick={() => { if (confirm(`¿Eliminar tarifa de ${p.cliente_nombre} — ${p.producto_codigo}?`)) deletePrecio(p.id) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Sin tarifas registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <ReportPanel title="Tarifario por Cliente" columns={reportColumns} rows={reportRows}
          filters={[
            { label: 'Cliente', key: 'cliente', options: [...new Set(precios.map(p => `${p.cliente_codigo} — ${p.cliente_nombre}`))] },
            { label: 'Situación', key: 'situacion', options: ['Activo', 'Inactivo'] },
          ]} />
      )}
    </div>
  )
}
