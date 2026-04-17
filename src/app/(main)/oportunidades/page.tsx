'use client'
import { useState } from 'react'
import { useOportunidadesStore, Oportunidad } from '@/features/oportunidades/store/oportunidades-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { fmtMoney } from '@/shared/lib/format-number'
import { fDate, todayColombia } from '@/shared/lib/format-date'
import { nextConsecutivo } from '@/shared/lib/consecutivo'
import ReportPanel from '@/shared/components/report-panel'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import { Seguimiento } from '@/shared/types/seguimiento'

const today = todayColombia()

const emptyOportunidad = (codigo: string, responsable: string): Oportunidad => ({
  id: '', codigo, nombre: '', cliente_id: '', cliente_nombre: '',
  contacto_id: '', contacto_nombre: '', valor_estimado: 0, tipo_moneda: 'Pesos Colombianos',
  probabilidad: 50, etapa: 'Prospección', origen: '', fecha_cierre_estimada: '',
  responsable, observaciones: '', situacion: 'Abierta', fecha_registro: today, seguimientos: [],
})

export default function OportunidadesPage() {
  const permisos = usePermisos('oportunidades')
  const currentUser = useCurrentUserStore(s => s.user)
  const { oportunidades, addOportunidad, updateOportunidad, deleteOportunidad } = useOportunidadesStore()
  const clientes = useClientesStore(s => s.clientes).filter(c => c.situacion === 'Activo')
  const allContactos = useContactosStore(s => s.contactos).filter(c => c.situacion === 'Activo')
  const refData = useReferenceStore(s => s.data)

  const [selected, setSelected] = useState<Oportunidad | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<Oportunidad | null>(null)
  const [tab, setTab] = useState<'registros' | 'pipeline' | 'reportes'>('registros')
  const [search, setSearch] = useState('')

  const filtered = oportunidades.filter(o =>
    !search || o.nombre.toLowerCase().includes(search.toLowerCase()) ||
    o.codigo.toLowerCase().includes(search.toLowerCase()) ||
    o.cliente_nombre.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const cli = clientes.find(c => c.id === selected.cliente_id)
    const con = allContactos.find(c => c.id === selected.contacto_id)
    const toSave = { ...selected, cliente_nombre: cli?.razon_social || selected.cliente_nombre, contacto_nombre: con ? `${con.nombre} ${con.apellido}` : selected.contacto_nombre }
    if (toSave.id) { updateOportunidad(toSave.id, toSave) }
    else { addOportunidad({ ...toSave, id: crypto.randomUUID() }) }
    setIsForm(false); setSelected(null)
  }

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Abierta': { background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' },
      'En Negociación': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
      'Ganada': { background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' },
      'Perdida': { background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' },
    }
    return map[s] || {}
  }

  const probColor = (p: number) => p >= 75 ? '#86efac' : p >= 50 ? '#fcd34d' : p >= 25 ? '#fdba74' : '#fca5a5'

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none' }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#1e3a8a' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.2)' })
  const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)

  const contactosDelCliente = selected ? allContactos.filter(c => c.cliente_id === selected.cliente_id) : []

  // View detail
  if (viewDetail) {
    const fields = [
      { label: 'Código', value: viewDetail.codigo },
      { label: 'Nombre', value: viewDetail.nombre },
      { label: 'Empresa', value: viewDetail.cliente_nombre },
      { label: 'Contacto', value: viewDetail.contacto_nombre },
      { label: 'Valor Estimado', value: `$${fmtMoney(viewDetail.valor_estimado)}` },
      { label: 'Moneda', value: viewDetail.tipo_moneda },
      { label: 'Probabilidad', value: `${viewDetail.probabilidad}%` },
      { label: 'Etapa', value: viewDetail.etapa },
      { label: 'Origen', value: viewDetail.origen },
      { label: 'Cierre Estimado', value: fDate(viewDetail.fecha_cierre_estimada) },
      { label: 'Responsable', value: viewDetail.responsable },
      { label: 'Situación', value: viewDetail.situacion },
      { label: 'Fecha Registro', value: fDate(viewDetail.fecha_registro) },
      { label: 'Observaciones', value: viewDetail.observaciones },
    ]
    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{viewDetail.nombre}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.label}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
              </div>
            ))}
          </div>
          {permisos.editar && (
            <button onClick={() => { setSelected(viewDetail); setIsForm(true); setViewDetail(null) }} style={{ ...btnStyle, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a', marginTop: 16 }}>Editar</button>
          )}
          <SeguimientoPanel
            seguimientos={viewDetail.seguimientos || []}
            usuario={`${currentUser?.nombre} ${currentUser?.apellido}`}
            situacionActual={viewDetail.situacion}
            situacionOpciones={refData.situacion_oportunidad.filter(r => r.situacion).map(r => r.descripcion)}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updateOportunidad(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
        </div>
      </div>
    )
  }

  // Form
  if (isForm && selected) {
    return (
      <div>
        <button onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nueva'} Oportunidad</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código</label>
              <input value={selected.codigo} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre Oportunidad *</label>
              <input value={selected.nombre} onChange={e => setSelected({ ...selected, nombre: e.target.value })} required style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Empresa *</label>
              <select value={selected.cliente_id} onChange={e => {
                const cli = clientes.find(c => c.id === e.target.value)
                setSelected({ ...selected, cliente_id: e.target.value, cliente_nombre: cli?.razon_social || '', contacto_id: '', contacto_nombre: '' })
              }} required style={inputStyle}>
                <option value="">Seleccionar empresa...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contacto</label>
              <select value={selected.contacto_id} onChange={e => {
                const con = contactosDelCliente.find(c => c.id === e.target.value)
                setSelected({ ...selected, contacto_id: e.target.value, contacto_nombre: con ? `${con.nombre} ${con.apellido}` : '' })
              }} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {contactosDelCliente.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor Estimado *</label>
              <input type="number" step="0.01" min="0" value={selected.valor_estimado || ''} onChange={e => setSelected({ ...selected, valor_estimado: parseFloat(e.target.value) || 0 })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Moneda</label>
              <select value={selected.tipo_moneda} onChange={e => setSelected({ ...selected, tipo_moneda: e.target.value })} style={inputStyle}>
                {refOptions('tipo_moneda').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Probabilidad (%): {selected.probabilidad}%</label>
              <input type="range" min="0" max="100" step="5" value={selected.probabilidad} onChange={e => setSelected({ ...selected, probabilidad: parseInt(e.target.value) })} style={{ width: '100%', accentColor: probColor(selected.probabilidad) }} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Etapa</label>
              <select value={selected.etapa} onChange={e => setSelected({ ...selected, etapa: e.target.value })} style={inputStyle}>
                {refOptions('etapa_oportunidad').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Origen</label>
              <select value={selected.origen} onChange={e => setSelected({ ...selected, origen: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('origen_oportunidad').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Cierre Estimada</label>
              <input type="date" value={selected.fecha_cierre_estimada} onChange={e => setSelected({ ...selected, fecha_cierre_estimada: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Responsable</label>
              <input value={selected.responsable} onChange={e => setSelected({ ...selected, responsable: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {refOptions('situacion_oportunidad').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observaciones</label>
              <textarea value={selected.observaciones} onChange={e => setSelected({ ...selected, observaciones: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ ...btnStyle, background: '#0f1b3d', color: '#ffffff' }}>Guardar</button>
            <button type="button" onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#64748b', color: '#ffffff' }}>Cancelar</button>
          </div>
        </form>
      </div>
    )
  }

  // Pipeline view
  const etapas = refOptions('etapa_oportunidad')
  const pipelineData = etapas.map(e => ({
    etapa: e,
    items: oportunidades.filter(o => o.etapa === e && o.situacion === 'Abierta'),
    total: oportunidades.filter(o => o.etapa === e && o.situacion === 'Abierta').reduce((s, o) => s + o.valor_estimado, 0),
  }))

  // Report data
  const reportColumns = [
    { header: 'Código', key: 'codigo', width: 10 },
    { header: 'Nombre', key: 'nombre', width: 20 },
    { header: 'Empresa', key: 'cliente_nombre', width: 18 },
    { header: 'Valor', key: 'valor', width: 14 },
    { header: 'Prob.', key: 'probabilidad', width: 8 },
    { header: 'Etapa', key: 'etapa', width: 12 },
    { header: 'Cierre Est.', key: 'cierre', width: 10 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(o => ({
    codigo: o.codigo, nombre: o.nombre, cliente_nombre: o.cliente_nombre,
    valor: `$${fmtMoney(o.valor_estimado)}`, probabilidad: `${o.probabilidad}%`,
    etapa: o.etapa, cierre: fDate(o.fecha_cierre_estimada), situacion: o.situacion,
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Oportunidades</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Pipeline de ventas</p>
        </div>
        {permisos.editar && tab !== 'reportes' && (
          <button onClick={() => { setSelected(emptyOportunidad(nextConsecutivo('OPO-', oportunidades.map(o => o.codigo)).codigo, `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`)); setIsForm(true) }} style={{ ...btnStyle, background: '#0f1b3d', color: '#ffffff' }}>+ Nueva Oportunidad</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Registros</button>
        <button onClick={() => setTab('pipeline')} style={tabBtnStyle(tab === 'pipeline')}>🎯 Pipeline</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {/* PIPELINE VIEW */}
      {tab === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${etapas.length}, 1fr)`, gap: 12, overflow: 'auto' }}>
          {pipelineData.map(col => (
            <div key={col.etapa} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', padding: 12, minWidth: 180 }}>
              <div style={{ marginBottom: 12, textAlign: 'center' }}>
                <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{col.etapa}</p>
                <p style={{ color: '#4ade80', fontSize: 12 }}>{col.items.length} | ${fmtMoney(col.total)}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.items.map(o => (
                  <div key={o.id} onClick={() => setViewDetail(o)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)', transition: 'background 0.2s' }}>
                    <p style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{o.nombre}</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{o.cliente_nombre}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ color: '#34d399', fontSize: 11, fontWeight: 600 }}>${fmtMoney(o.valor_estimado)}</span>
                      <span style={{ color: probColor(o.probabilidad), fontSize: 11 }}>{o.probabilidad}%</span>
                    </div>
                  </div>
                ))}
                {col.items.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', padding: 16 }}>Sin oportunidades</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {tab === 'registros' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, código o empresa..."
            style={{ ...inputStyle, maxWidth: 400, marginBottom: 16 }} />
          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Código', 'Nombre', 'Empresa', 'Valor', 'Prob.', 'Etapa', 'Situación', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', background: '#1e3a5f', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={o.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#4ade80', fontSize: 13, fontFamily: 'monospace' }}>{o.codigo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{o.nombre}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{o.cliente_nombre}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#34d399', fontSize: 13, fontWeight: 600 }}>${fmtMoney(o.valor_estimado)}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: probColor(o.probabilidad), fontSize: 13, fontWeight: 600 }}>{o.probabilidad}%</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{o.etapa}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(o.situacion) }}>{o.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewDetail(o)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                        {permisos.editar && <button onClick={() => { setSelected(o); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>Editar</button>}
                        {permisos.eliminar && <button onClick={() => { if (confirm(`¿Eliminar "${o.nombre}"?`)) deleteOportunidad(o.id) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay oportunidades registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <ReportPanel title="Reporte de Oportunidades" columns={reportColumns} rows={reportRows}
          filters={[
            { label: 'Situación', key: 'situacion', options: [...new Set(oportunidades.map(o => o.situacion).filter(Boolean))] },
            { label: 'Etapa', key: 'etapa', options: [...new Set(oportunidades.map(o => o.etapa).filter(Boolean))] },
          ]} />
      )}
    </div>
  )
}
