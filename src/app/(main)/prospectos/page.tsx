'use client'
import { useState, useEffect } from 'react'
import { useProspectosStore, Prospecto } from '@/features/prospectos/store/prospectos-store'
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

interface ProspectoExterno {
  id: string; nombre: string; apellido: string; empresa: string; correo: string
  nro_movil: string; descripcion_requerimiento: string; fecha_registro: string
  hora_registro: string; importado: boolean
}

const emptyProspecto = (codigo: string): Prospecto => ({
  id: '', codigo, nombre: '', apellido: '', empresa: '', correo: '', nro_movil: '',
  origen_prospecto: '', detalle_requerimiento: '', actividad: '', ciudad: '', pais: 'Colombia',
  situacion: 'Nuevo', fecha_registro: today, seguimientos: [],
})

export default function ProspectosPage() {
  const permisos = usePermisos('prospectos')
  const currentUser = useCurrentUserStore(s => s.user)
  const { prospectos, addProspecto, updateProspecto, deleteProspecto } = useProspectosStore()
  const refData = useReferenceStore(s => s.data)

  const [selected, setSelected] = useState<Prospecto | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<Prospecto | null>(null)
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')
  const [search, setSearch] = useState('')
  const { pendingSearch, pendingAction, clearPending } = useAsistenteStore()

  // ── Prospectos externos ──
  const [externas, setExternas] = useState<ProspectoExterno[]>([])
  const [showExternas, setShowExternas] = useState(false)

  const loadExternas = async () => {
    try {
      const res = await fetch('/api/prospectos-externo')
      const data = await res.json()
      const lista: ProspectoExterno[] = data.prospectos || []
      setExternas(lista)
      if (lista.length > 0) setShowExternas(true)
    } catch (err) {
      console.error('[prospectos] Error cargando externos:', err)
    }
  }

  useEffect(() => {
    if (pendingSearch) setSearch(pendingSearch)
    if (pendingAction === 'nuevo') { setSelected(emptyProspecto(nextConsecutivo('PRS-', prospectos.map(p => p.codigo)).codigo)); setIsForm(true) }
    if (pendingSearch || pendingAction) clearPending()
    loadExternas()
    const intervalId = setInterval(loadExternas, 15000)
    return () => clearInterval(intervalId)
  }, [])

  const importarProspecto = async (ext: ProspectoExterno) => {
    const codigo = nextConsecutivo('PRS-', prospectos.map(p => p.codigo)).codigo
    addProspecto({
      id: crypto.randomUUID(), codigo, nombre: ext.nombre, apellido: ext.apellido,
      empresa: ext.empresa, correo: ext.correo, nro_movil: ext.nro_movil,
      origen_prospecto: 'Formulario Web', detalle_requerimiento: ext.descripcion_requerimiento,
      actividad: '', ciudad: '', pais: 'Colombia', situacion: 'Sin Contactar',
      fecha_registro: ext.fecha_registro || today, seguimientos: [{
        id: crypto.randomUUID(), fecha: today, detalle: `Prospecto importado desde formulario web. Registrado el ${ext.fecha_registro} a las ${ext.hora_registro}.`,
        persona_actividad: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(), situacion: 'Sin Contactar', usuario: currentUser?.nombre || 'Sistema',
      }],
    })
    try { await fetch('/api/prospectos-externo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [ext.id] }) }) } catch { /* silent */ }
    setExternas(prev => prev.filter(e => e.id !== ext.id))
  }

  const importarTodas = async () => {
    for (const ext of externas) {
      const codigo = nextConsecutivo('PRS-', [...prospectos.map(p => p.codigo)]).codigo
      addProspecto({
        id: crypto.randomUUID(), codigo, nombre: ext.nombre, apellido: ext.apellido,
        empresa: ext.empresa, correo: ext.correo, nro_movil: ext.nro_movil,
        origen_prospecto: 'Formulario Web', detalle_requerimiento: ext.descripcion_requerimiento,
        actividad: '', ciudad: '', pais: 'Colombia', situacion: 'Sin Contactar',
        fecha_registro: ext.fecha_registro || today, seguimientos: [{
          id: crypto.randomUUID(), fecha: today, detalle: `Prospecto importado desde formulario web. Registrado el ${ext.fecha_registro} a las ${ext.hora_registro}.`,
          persona_actividad: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(), situacion: 'Sin Contactar', usuario: currentUser?.nombre || 'Sistema',
        }],
      })
    }
    try { await fetch('/api/prospectos-externo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: externas.map(e => e.id) }) }) } catch { /* silent */ }
    setExternas([])
    setShowExternas(false)
  }

  const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)

  const filtered = prospectos.filter(p => {
    const s = search.toLowerCase()
    return !s || p.nombre.toLowerCase().includes(s) || p.apellido.toLowerCase().includes(s) ||
      p.empresa.toLowerCase().includes(s) || p.codigo.toLowerCase().includes(s)
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (selected.id) {
      updateProspecto(selected.id, selected)
    } else {
      addProspecto({ ...selected, id: crypto.randomUUID() })
    }
    setIsForm(false); setSelected(null)
  }

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Nuevo': { background: '#1e3a8a', color: '#ffffff', border: '1px solid #2563eb' },
      'Contactado': { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' },
      'Calificado': { background: 'rgba(34,197,94,0.2)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' },
      'En Negociación': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
      'Convertido': { background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' },
      'Descartado': { background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' },
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
      { label: 'Nombre', value: viewDetail.nombre },
      { label: 'Apellido', value: viewDetail.apellido },
      { label: 'Empresa', value: viewDetail.empresa },
      { label: 'Correo', value: viewDetail.correo },
      { label: 'Nro Móvil', value: viewDetail.nro_movil },
      { label: 'Origen Prospecto', value: viewDetail.origen_prospecto },
      { label: 'Actividad', value: viewDetail.actividad },
      { label: 'Ciudad', value: viewDetail.ciudad },
      { label: 'País', value: viewDetail.pais },
      { label: 'Situación', value: viewDetail.situacion },
      { label: 'Fecha Registro', value: fDate(viewDetail.fecha_registro) },
      { label: 'Detalle Requerimiento', value: viewDetail.detalle_requerimiento },
    ]
    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{viewDetail.nombre} {viewDetail.apellido}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.label} style={f.label === 'Detalle Requerimiento' ? { gridColumn: 'span 3' } : undefined}>
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
            situacionOpciones={refOptions('situacion_prospecto')}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updateProspecto(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
          <DocumentosPanel modulo="prospectos" registroId={viewDetail.id} />
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
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nuevo'} Prospecto</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código</label>
              <input value={selected.codigo} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
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
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Empresa</label>
              <input value={selected.empresa} onChange={e => setSelected({ ...selected, empresa: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Correo *</label>
              <input type="email" value={selected.correo} onChange={e => setSelected({ ...selected, correo: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nro Móvil</label>
              <input value={selected.nro_movil} onChange={e => setSelected({ ...selected, nro_movil: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Origen Prospecto *</label>
              <select value={selected.origen_prospecto} onChange={e => setSelected({ ...selected, origen_prospecto: e.target.value })} required style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('origen_prospecto').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Actividad</label>
              <select value={selected.actividad} onChange={e => setSelected({ ...selected, actividad: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('actividad_cliente').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {refOptions('situacion_prospecto').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ciudad</label>
              <select value={selected.ciudad} onChange={e => setSelected({ ...selected, ciudad: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('ciudad').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>País</label>
              <select value={selected.pais} onChange={e => setSelected({ ...selected, pais: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('pais').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Detalle Requerimiento</label>
              <textarea value={selected.detalle_requerimiento} onChange={e => setSelected({ ...selected, detalle_requerimiento: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
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
    { header: 'Código', key: 'codigo', width: 10 },
    { header: 'Nombre', key: 'nombre_completo', width: 18 },
    { header: 'Empresa', key: 'empresa', width: 16 },
    { header: 'Correo', key: 'correo', width: 18 },
    { header: 'Móvil', key: 'nro_movil', width: 10 },
    { header: 'Origen', key: 'origen_prospecto', width: 10 },
    { header: 'Ciudad', key: 'ciudad', width: 10 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(p => ({
    codigo: p.codigo, nombre_completo: `${p.nombre} ${p.apellido}`, empresa: p.empresa,
    correo: p.correo, nro_movil: p.nro_movil, origen_prospecto: p.origen_prospecto,
    ciudad: p.ciudad, situacion: p.situacion,
  }))
  const reportFilters = [
    { label: 'Situación', key: 'situacion', options: [...new Set(prospectos.map(p => p.situacion).filter(Boolean))] },
    { label: 'Origen', key: 'origen_prospecto', options: [...new Set(prospectos.map(p => p.origen_prospecto).filter(Boolean))] },
    { label: 'Ciudad', key: 'ciudad', options: [...new Set(prospectos.map(p => p.ciudad).filter(Boolean))] },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Prospectos</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Gestión de prospectos comerciales</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {tab === 'registros' && externas.length > 0 && (
            <button onClick={() => setShowExternas(!showExternas)}
              style={{ ...btnStyle, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316', position: 'relative' }}>
              Prospectos Web
              <span style={{ position: 'absolute', top: -8, right: -8, background: '#dc2626', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{externas.length}</span>
            </button>
          )}
          {permisos.editar && tab === 'registros' && (
            <button onClick={() => { setSelected(emptyProspecto(nextConsecutivo('PRS-', prospectos.map(p => p.codigo)).codigo)); setIsForm(true) }} style={{ ...btnStyle, background: '#0f1b3d', color: '#ffffff' }}>+ Nuevo Prospecto</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Registros</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {tab === 'registros' && (
        <>
          {/* Panel prospectos externos */}
          {showExternas && externas.length > 0 && (
            <div style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ color: '#f97316', fontSize: 15, fontWeight: 700, margin: 0 }}>Prospectos desde Formulario Web ({externas.length})</h3>
                <button onClick={importarTodas} style={{ ...btnStyle, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a', fontSize: 12 }}>Importar Todas</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {externas.map(ext => (
                  <div key={ext.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, margin: 0 }}>{ext.nombre} {ext.apellido}</p>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '2px 0' }}>{ext.empresa || 'Sin empresa'} | {ext.correo} | {ext.nro_movil || 'Sin móvil'}</p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>{ext.descripcion_requerimiento?.substring(0, 120)}{(ext.descripcion_requerimiento?.length || 0) > 120 ? '...' : ''}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '4px 0 0' }}>{ext.fecha_registro} {ext.hora_registro}</p>
                    </div>
                    <button onClick={() => importarProspecto(ext)} style={{ ...btnStyle, background: '#1e3a8a', color: '#ffffff', border: '1px solid #2563eb', fontSize: 11, marginLeft: 12 }}>Importar al CRM</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, empresa o código..." style={{ ...inputStyle, maxWidth: 400 }} />
          </div>

          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Código', 'Nombre', 'Empresa', 'Correo', 'Móvil', 'Origen', 'Situación', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', background: '#1e3a5f', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#4ade80', fontSize: 13, fontFamily: 'monospace' }}>{p.codigo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{p.nombre} {p.apellido}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.empresa}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.correo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.nro_movil}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.origen_prospecto}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(p.situacion) }}>{p.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewDetail(p)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                        {permisos.editar && <button onClick={() => { setSelected(p); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>Editar</button>}
                        {permisos.eliminar && <button onClick={() => { if (confirm(`¿Eliminar prospecto "${p.nombre} ${p.apellido}"?`)) deleteProspecto(p.id) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay prospectos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <ReportPanel title="Reporte de Prospectos" columns={reportColumns} rows={reportRows} filters={reportFilters} />
      )}
    </div>
  )
}
