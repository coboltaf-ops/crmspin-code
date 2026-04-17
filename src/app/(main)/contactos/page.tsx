'use client'
import { useState, useEffect } from 'react'
import { useContactosStore, Contacto } from '@/features/contactos/store/contactos-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { fDate, todayColombia } from '@/shared/lib/format-date'
import { nextConsecutivo } from '@/shared/lib/consecutivo'
import ReportPanel from '@/shared/components/report-panel'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import DocumentosPanel from '@/shared/components/documentos-panel'
import { useAsistenteStore } from '@/shared/stores/asistente-store'
import { Seguimiento } from '@/shared/types/seguimiento'

const today = todayColombia()

const emptyContacto = (codigo: string): Contacto => ({
  id: '', codigo, cliente_id: '', cliente_nombre: '',
  nombre: '', apellido: '', cargo: '', departamento: '', telefono: '', celular: '',
  email: '', fecha_nacimiento: '', nivel_influencia: '', es_principal: false, observaciones: '', situacion: 'Activo', fecha_registro: today, seguimientos: [],
})

export default function ContactosPage() {
  const permisos = usePermisos('contactos')
  const currentUser = useCurrentUserStore(s => s.user)
  const { contactos, addContacto, updateContacto, deleteContacto } = useContactosStore()
  const clientes = useClientesStore(s => s.clientes).filter(c => c.situacion === 'Activo')
  const refData = useReferenceStore(s => s.data)

  const [selected, setSelected] = useState<Contacto | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<Contacto | null>(null)
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')
  const [search, setSearch] = useState('')
  const [filterCliente, setFilterCliente] = useState('')
  const { pendingSearch, pendingAction, clearPending } = useAsistenteStore()
  useEffect(() => {
    if (pendingSearch) setSearch(pendingSearch)
    if (pendingAction === 'nuevo') { setSelected(emptyContacto(nextConsecutivo('CON-', contactos.map(c => c.codigo)).codigo)); setIsForm(true) }
    if (pendingSearch || pendingAction) clearPending()
  }, [])

  const filtered = contactos.filter(c => {
    const matchSearch = !search || c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.apellido.toLowerCase().includes(search.toLowerCase()) || c.codigo.toLowerCase().includes(search.toLowerCase())
    const matchCliente = !filterCliente || c.cliente_id === filterCliente
    return matchSearch && matchCliente
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const cli = clientes.find(c => c.id === selected.cliente_id)
    const toSave = { ...selected, cliente_nombre: cli?.razon_social || selected.cliente_nombre }
    if (toSave.id) {
      updateContacto(toSave.id, toSave)
    } else {
      addContacto({ ...toSave, id: crypto.randomUUID() })
    }
    setIsForm(false); setSelected(null)
  }

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Activo': { background: '#1e3a8a', color: '#ffffff', border: '1px solid #2563eb' },
      'Inactivo': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
    }
    return map[s] || {}
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none' }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#1e3a8a' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.2)' })

  // View detail
  if (viewDetail) {
    const fields = [
      { label: 'Código', value: viewDetail.codigo },
      { label: 'Empresa', value: viewDetail.cliente_nombre },
      { label: 'Nombre', value: viewDetail.nombre },
      { label: 'Apellido', value: viewDetail.apellido },
      { label: 'Cargo', value: viewDetail.cargo },
      { label: 'Departamento', value: viewDetail.departamento },
      { label: 'Teléfono', value: viewDetail.telefono },
      { label: 'Celular', value: viewDetail.celular },
      { label: 'Email', value: viewDetail.email },
      { label: 'Fecha Nacimiento', value: viewDetail.fecha_nacimiento ? fDate(viewDetail.fecha_nacimiento) : '' },
      { label: 'Nivel de Influencia', value: viewDetail.nivel_influencia },
      { label: 'Contacto Principal', value: viewDetail.es_principal ? 'Sí' : 'No' },
      { label: 'Situación', value: viewDetail.situacion },
      { label: 'Fecha Registro', value: fDate(viewDetail.fecha_registro) },
      { label: 'Observaciones', value: viewDetail.observaciones },
    ]
    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{viewDetail.nombre} {viewDetail.apellido}</h2>
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
            situacionOpciones={refData.situacion_contacto.filter(r => r.situacion).map(r => r.descripcion)}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updateContacto(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
          <DocumentosPanel modulo="contactos" registroId={viewDetail.id} />
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
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nuevo'} Contacto</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código</label>
              <input value={selected.codigo} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Empresa *</label>
              <select value={selected.cliente_id} onChange={e => {
                const cli = clientes.find(c => c.id === e.target.value)
                setSelected({ ...selected, cliente_id: e.target.value, cliente_nombre: cli?.razon_social || '' })
              }} required style={inputStyle}>
                <option value="">Seleccionar empresa...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre *</label>
              <input value={selected.nombre} onChange={e => setSelected({ ...selected, nombre: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Apellido *</label>
              <input value={selected.apellido} onChange={e => setSelected({ ...selected, apellido: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cargo</label>
              <input value={selected.cargo} onChange={e => setSelected({ ...selected, cargo: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Departamento</label>
              <input value={selected.departamento} onChange={e => setSelected({ ...selected, departamento: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Teléfono</label>
              <input value={selected.telefono} onChange={e => setSelected({ ...selected, telefono: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Celular</label>
              <input value={selected.celular} onChange={e => setSelected({ ...selected, celular: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</label>
              <input type="email" value={selected.email} onChange={e => setSelected({ ...selected, email: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Nacimiento</label>
              <input type="date" value={selected.fecha_nacimiento} onChange={e => setSelected({ ...selected, fecha_nacimiento: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nivel de Influencia</label>
              <select value={selected.nivel_influencia} onChange={e => setSelected({ ...selected, nivel_influencia: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('nivel_influencia').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {refOptions('situacion_contacto').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
              <input type="checkbox" checked={selected.es_principal} onChange={e => setSelected({ ...selected, es_principal: e.target.checked })} style={{ accentColor: '#22c55e' }} />
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Contacto Principal</label>
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

  // Report data
  const reportColumns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Nombre', key: 'nombre_completo', width: 20 },
    { header: 'Empresa', key: 'cliente_nombre', width: 22 },
    { header: 'Cargo', key: 'cargo', width: 14 },
    { header: 'Teléfono', key: 'telefono', width: 12 },
    { header: 'Email', key: 'email', width: 18 },
    { header: 'Principal', key: 'principal', width: 8 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(c => ({
    codigo: c.codigo, nombre_completo: `${c.nombre} ${c.apellido}`, cliente_nombre: c.cliente_nombre,
    cargo: c.cargo, telefono: c.telefono, email: c.email, principal: c.es_principal ? 'Sí' : 'No', situacion: c.situacion,
  }))
  const reportFilters = [
    { label: 'Situación', key: 'situacion', options: [...new Set(contactos.map(c => c.situacion).filter(Boolean))] },
    { label: 'Empresa', key: 'cliente_nombre', options: [...new Set(contactos.map(c => c.cliente_nombre).filter(Boolean))] },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Contactos</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Personas de contacto por empresa</p>
        </div>
        {permisos.editar && tab === 'registros' && (
          <button onClick={() => { setSelected(emptyContacto(nextConsecutivo('CON-', contactos.map(c => c.codigo)).codigo)); setIsForm(true) }} style={{ ...btnStyle, background: '#0f1b3d', color: '#ffffff' }}>+ Nuevo Contacto</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Registros</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {tab === 'registros' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o código..." style={{ ...inputStyle, maxWidth: 300 }} />
            <select value={filterCliente} onChange={e => setFilterCliente(e.target.value)} style={{ ...inputStyle, maxWidth: 250 }}>
              <option value="">Todas las empresas</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          </div>

          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Código', 'Nombre', 'Empresa', 'Cargo', 'Teléfono', 'Email', 'Situación', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', background: '#1e3a5f', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#4ade80', fontSize: 13, fontFamily: 'monospace' }}>{c.codigo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>
                      {c.nombre} {c.apellido}
                      {c.es_principal && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 8, fontSize: 9, background: 'rgba(251,191,36,0.2)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.3)' }}>Principal</span>}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.cliente_nombre}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.cargo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.telefono || c.celular}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.email}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(c.situacion) }}>{c.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewDetail(c)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                        {permisos.editar && <button onClick={() => { setSelected(c); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>Editar</button>}
                        {permisos.eliminar && <button onClick={() => { if (confirm(`¿Eliminar contacto "${c.nombre} ${c.apellido}"?`)) deleteContacto(c.id) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay contactos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <ReportPanel title="Reporte de Contactos" columns={reportColumns} rows={reportRows} filters={reportFilters} />
      )}
    </div>
  )
}
