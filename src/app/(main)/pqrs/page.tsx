'use client'
import { logAudit, computarDiff } from '@/shared/lib/audit'
import { useState, useEffect } from 'react'
import { usePQRSStore, PQRS } from '@/features/pqrs/store/pqrs-store'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import DocumentosPanel from '@/shared/components/documentos-panel'
import { useAsistenteStore } from '@/shared/stores/asistente-store'
import { Seguimiento } from '@/shared/types/seguimiento'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { fDate, todayColombia } from '@/shared/lib/format-date'
import { nextConsecutivo } from '@/shared/lib/consecutivo'
import ReportPanel from '@/shared/components/report-panel'

interface PQRSExterna {
  id: string; radicado: string; fecha: string; tipo: string; prioridad: string
  cliente_id: string; cliente_codigo: string; cliente_nombre: string
  fecha_aviso: string; hora_aviso: string; persona_avisa: string; movil_avisa: string
  detalle_incidencia: string; fecha_registro: string; hora_registro: string; importada: boolean
}

const today = todayColombia()

const emptyPQRS = (codigo: string, nro: number, responsable: string): PQRS => ({
  id: '', codigo, nro, tipo: 'Petición',
  prioridad: 'Media', cliente_id: '', cliente_nombre: '', contacto_id: '', contacto_nombre: '',
  asunto: '', descripcion: '',
  fecha_aviso: today, hora_aviso: '', persona_avisa: '', movil_avisa: '',
  persona_caso: responsable, movil_caso: '', detalle_incidencia: '',
  responsable, fecha_registro: today, fecha_cierre: '',
  seguimientos: [], situacion: 'Abierta',
})

export default function PQRSPage() {
  const permisos = usePermisos('pqrs')
  const currentUser = useCurrentUserStore(s => s.user)
  const { pqrs, addPQRS, updatePQRS, deletePQRS } = usePQRSStore()
  const clientes = useClientesStore(s => s.clientes).filter(c => c.situacion === 'Activo')
  const allContactos = useContactosStore(s => s.contactos).filter(c => c.situacion === 'Activo')
  const refData = useReferenceStore(s => s.data)

  const [selected, setSelected] = useState<PQRS | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<PQRS | null>(null)
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')
  const [search, setSearch] = useState('')
  const [externas, setExternas] = useState<PQRSExterna[]>([])
  const [showExternas, setShowExternas] = useState(false)
  const [loadingExternas, setLoadingExternas] = useState(false)
  const { pendingSearch, pendingAction, clearPending } = useAsistenteStore()
  useEffect(() => {
    if (pendingSearch) setSearch(pendingSearch)
    if (pendingAction === 'nuevo') { const nc = nextConsecutivo('PQR-', pqrs.map(p => p.codigo)); setSelected(emptyPQRS(nc.codigo, nc.nro, `${currentUser?.nombre} ${currentUser?.apellido}`)); setIsForm(true) }
    if (pendingSearch || pendingAction) clearPending()
  }, [])

  // Cargar PQRS externas pendientes
  const fetchExternas = async () => {
    setLoadingExternas(true)
    try {
      const res = await fetch('/api/pqrs-externo')
      const data = await res.json()
      setExternas(data.pqrs || [])
    } catch { /* silenciar */ }
    finally { setLoadingExternas(false) }
  }

  useEffect(() => { fetchExternas() }, [])

  // Importar una PQRS externa al store interno
  const importarExterna = async (ext: PQRSExterna) => {
    const nc = nextConsecutivo('PQRS-', pqrs.map(p => p.codigo))
    const usuario = `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`
    // Buscar cliente local: primero por id exacto, luego por código (más estable
    // entre dispositivos). Garantiza que el nombre de empresa siempre quede.
    const cliLocal =
      clientes.find(c => c.id === ext.cliente_id) ||
      clientes.find(c => c.codigo === ext.cliente_codigo)
    const empresaNombre = cliLocal?.razon_social || ext.cliente_nombre || '(Externo)'
    const empresaId = cliLocal?.id || ext.cliente_id || ''
    const nueva: PQRS = {
      id: crypto.randomUUID(), codigo: nc.codigo, nro: nc.nro,
      tipo: ext.tipo, prioridad: ext.prioridad,
      cliente_id: empresaId, cliente_nombre: empresaNombre,
      contacto_id: '', contacto_nombre: '',
      asunto: ext.detalle_incidencia.substring(0, 80), descripcion: ext.detalle_incidencia,
      fecha_aviso: ext.fecha_aviso, hora_aviso: ext.hora_aviso,
      persona_avisa: ext.persona_avisa, movil_avisa: ext.movil_avisa,
      persona_caso: usuario, movil_caso: '',
      detalle_incidencia: ext.detalle_incidencia,
      responsable: usuario,
      fecha_registro: todayColombia(), fecha_cierre: '',
      seguimientos: [{
        id: crypto.randomUUID(), fecha: new Date().toISOString(),
        detalle: `PQRS importada desde formulario público. Radicado: ${ext.radicado} | Persona que avisa: ${ext.persona_avisa} | Móvil: ${ext.movil_avisa || 'N/A'}`,
        persona_actividad: ext.persona_avisa,
        situacion: 'En Proceso',
        usuario,
      }],
      situacion: 'En Proceso',
    }
    addPQRS(nueva)
    // Marcar como importada en servidor
    await fetch('/api/pqrs-externo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [ext.id] }) })
    setExternas(prev => prev.filter(e => e.id !== ext.id))
  }

  const importarTodas = async () => {
    for (const ext of externas) { await importarExterna(ext) }
    setShowExternas(false)
  }
  const filtered = pqrs.filter(p =>
    !search || p.codigo.toLowerCase().includes(search.toLowerCase()) ||
    p.cliente_nombre.toLowerCase().includes(search.toLowerCase())
  )

  const auditParams = () => ({
    usuario: currentUser?.usuario || 'desconocido',
    usuario_nombre: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(),
    rol: currentUser?.rol || '',
    modulo: 'pqrs',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const cli = clientes.find(c => c.id === selected.cliente_id)
    const con = allContactos.find(c => c.id === selected.contacto_id)
    const toSave = { ...selected, cliente_nombre: cli?.razon_social || selected.cliente_nombre, contacto_nombre: con ? `${con.nombre} ${con.apellido}` : selected.contacto_nombre }
    if (toSave.id) { const _anterior = pqrs.find(x => x.id === toSave.id); updatePQRS(toSave.id, toSave); logAudit({ ...auditParams(), accion: "MODIFICAR", registro_codigo: toSave.codigo, registro_nombre: toSave.asunto, detalle: computarDiff(_anterior as unknown as Record<string, unknown>, toSave as unknown as Record<string, unknown>) }) }
    else { addPQRS({ ...toSave, id: crypto.randomUUID() }) }
    setIsForm(false); setSelected(null)
  }

  // seguimiento handled by SeguimientoPanel

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Abierta': { background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' },
      'En Proceso': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
      'Cerrada': { background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' },
      'Escalada': { background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' },
    }
    return map[s] || {}
  }

  const prioridadStyle = (p: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Baja': { background: 'rgba(59,130,246,0.15)', color: '#86efac', border: '1px solid rgba(59,130,246,0.2)' },
      'Media': { background: 'rgba(59,130,246,0.15)', color: '#86efac', border: '1px solid rgba(59,130,246,0.2)' },
      'Alta': { background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)' },
      'Urgente': { background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' },
    }
    return map[p] || {}
  }

  const tipoIcon = (t: string) => {
    const map: Record<string, string> = { 'Petición': '📝', 'Queja': '😤', 'Reclamo': '⚠️', 'Sugerencia': '💡' }
    return map[t] || '📩'
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', boxSizing: 'border-box', height: 38 }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#4169E1' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)' })
  const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)
  const contactosDelCliente = selected ? allContactos.filter(c => c.cliente_id === selected.cliente_id) : []

  // ── VIEW DETAIL with timeline ──
  if (viewDetail) {
    const diasAbierto = Math.floor((Date.now() - new Date(viewDetail.fecha_registro).getTime()) / 86400000)
    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          {/* Main info */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{tipoIcon(viewDetail.tipo)}</span>
                  <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700 }}>{viewDetail.codigo}</h2>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(viewDetail.situacion) }}>{viewDetail.situacion}</span>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...prioridadStyle(viewDetail.prioridad) }}>{viewDetail.prioridad}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{diasAbierto} días abierto</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { l: 'Fecha', v: fDate(viewDetail.fecha_registro) }, { l: 'Tipo', v: viewDetail.tipo },
                { l: 'Cliente', v: viewDetail.cliente_nombre }, { l: 'Contacto', v: viewDetail.contacto_nombre },
                { l: 'Fecha Aviso Cliente', v: fDate(viewDetail.fecha_aviso) }, { l: 'Hora Aviso', v: viewDetail.hora_aviso },
                { l: 'Persona que Avisa', v: viewDetail.persona_avisa }, { l: 'Móvil que Avisa', v: viewDetail.movil_avisa },
                { l: 'Persona que Recibe', v: viewDetail.persona_caso }, { l: 'Móvil Recibe', v: viewDetail.movil_caso },
                { l: 'Prioridad', v: viewDetail.prioridad }, { l: 'Situación', v: viewDetail.situacion },
                { l: 'Cierre', v: fDate(viewDetail.fecha_cierre) },
              ].map(f => (
                <div key={f.l}><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{f.l}</p><p style={{ color: '#ffffff', fontSize: 13 }}>{f.v || '—'}</p></div>
              ))}
            </div>

            {viewDetail.detalle_incidencia && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>Detalle de la Incidencia</p>
                <p style={{ color: '#ffffff', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{viewDetail.detalle_incidencia}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              {permisos.editar && viewDetail.situacion !== 'Cerrada' && (
                <button onClick={() => { setSelected(viewDetail); setIsForm(true); setViewDetail(null) }} style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>
              )}
              {permisos.editar && viewDetail.situacion !== 'Cerrada' && (
                <button onClick={() => {
                  const updated = { ...viewDetail, situacion: 'Cerrada', fecha_cierre: today }
                  updatePQRS(viewDetail.id, updated); setViewDetail(updated)
                }} style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Cerrar PQRS</button>
              )}
            </div>
          </div>

          {/* Seguimiento */}
          <div style={{ gridColumn: 'span 2' }}>
            <SeguimientoPanel
              seguimientos={viewDetail.seguimientos || []}
              usuario={`${currentUser?.nombre} ${currentUser?.apellido}`}
              situacionActual={viewDetail.situacion}
              situacionOpciones={refData.situacion_pqrs.filter(r => r.situacion).map(r => r.descripcion)}
              readOnly={viewDetail.situacion === 'Cerrada'}
              onAdd={(seg: Seguimiento) => {
                const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
                updatePQRS(viewDetail.id, updated)
                setViewDetail(updated)
              }}
            />
            <DocumentosPanel modulo="pqrs" registroId={viewDetail.id} />
          </div>
        </div>
      </div>
    )
  }

  // ── FORM ──
  if (isForm && selected) {
    return (
      <div>
        <button onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nueva'} PQRS</h2>
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
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo *</label>
              <select value={selected.tipo} onChange={e => setSelected({ ...selected, tipo: e.target.value })} style={inputStyle}>
                {refOptions('tipo_pqrs').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cliente *</label>
              <select value={selected.cliente_id} onChange={e => {
                const cli = clientes.find(c => c.id === e.target.value)
                setSelected({ ...selected, cliente_id: e.target.value, cliente_nombre: cli?.razon_social || '', contacto_id: '', contacto_nombre: '' })
              }} required style={inputStyle}>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contacto</label>
              <select value={selected.contacto_id} onChange={e => {
                const con = contactosDelCliente.find(c => c.id === e.target.value)
                const nombreCon = con ? `${con.nombre} ${con.apellido}` : ''
                setSelected({
                  ...selected,
                  contacto_id: e.target.value,
                  contacto_nombre: nombreCon,
                })
              }} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {contactosDelCliente.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Aviso Cliente</label>
              <input type="date" value={selected.fecha_aviso} onChange={e => setSelected({ ...selected, fecha_aviso: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Hora Aviso</label>
              <input type="time" value={selected.hora_aviso} onChange={e => setSelected({ ...selected, hora_aviso: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Persona que Avisa</label>
              <input value={selected.persona_avisa} onChange={e => setSelected({ ...selected, persona_avisa: e.target.value })} placeholder="Nombre de quien avisa..." style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Móvil que Avisa</label>
              <input value={selected.movil_avisa} onChange={e => setSelected({ ...selected, movil_avisa: e.target.value })} placeholder="Teléfono móvil..." style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Persona que Recibe</label>
              <input value={selected.persona_caso} onChange={e => setSelected({ ...selected, persona_caso: e.target.value })} placeholder="Nombre de quien recibe..." style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Móvil Recibe</label>
              <input value={selected.movil_caso} onChange={e => setSelected({ ...selected, movil_caso: e.target.value })} placeholder="Teléfono móvil..." style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Detalle de la Incidencia</label>
              <textarea value={selected.detalle_incidencia} onChange={e => setSelected({ ...selected, detalle_incidencia: e.target.value })} rows={4} style={{ ...inputStyle, resize: "vertical", height: "auto" }} placeholder="Describir la incidencia..." />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Prioridad</label>
              <select value={selected.prioridad} onChange={e => setSelected({ ...selected, prioridad: e.target.value })} style={inputStyle}>
                {refOptions('prioridad_pqrs').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {refOptions('situacion_pqrs').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>Guardar</button>
            <button type="button" onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#64748b', color: '#ffffff' }}>Cancelar</button>
          </div>
        </form>
      </div>
    )
  }

  // ── REPORT DATA ──
  const reportColumns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Prioridad', key: 'prioridad', width: 10 },
    { header: 'Cliente', key: 'cliente_nombre', width: 22 },
    { header: 'Responsable', key: 'responsable', width: 14 },
    { header: 'Registro', key: 'registro', width: 10 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(p => ({
    codigo: p.codigo, tipo: p.tipo, prioridad: p.prioridad,
    cliente_nombre: p.cliente_nombre, responsable: p.responsable, registro: fDate(p.fecha_registro), situacion: p.situacion,
  }))

  // ── MAIN VIEW ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>PQRS</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Peticiones, Quejas, Reclamos y Sugerencias</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {permisos.editar && externas.length > 0 && (
            <button onClick={() => setShowExternas(!showExternas)} style={{ ...btnStyle, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316', position: 'relative' }}>
              📩 PQRS Externas
              <span style={{ position: 'absolute', top: -8, right: -8, background: '#dc2626', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{externas.length}</span>
            </button>
          )}
          {permisos.editar && tab === 'registros' && (
            <button onClick={() => { { const nc = nextConsecutivo('PQRS-', pqrs.map(p => p.codigo)); setSelected(emptyPQRS(nc.codigo, nc.nro, `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`)) }; setIsForm(true) }} style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>+ Nueva PQRS</button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Abiertas', count: pqrs.filter(p => p.situacion === 'Abierta').length, color: '#86efac' },
          { label: 'En Proceso', count: pqrs.filter(p => p.situacion === 'En Proceso').length, color: '#fcd34d' },
          { label: 'Escaladas', count: pqrs.filter(p => p.situacion === 'Escalada').length, color: '#fca5a5' },
          { label: 'Cerradas', count: pqrs.filter(p => p.situacion === 'Cerrada').length, color: '#86efac' },
        ].map(c => (
          <div key={c.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.15)', textAlign: 'center' }}>
            <p style={{ color: c.color, fontSize: 28, fontWeight: 800 }}>{c.count}</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Panel PQRS Externas */}
      {showExternas && externas.length > 0 && (
        <div style={{ background: 'rgba(234,88,12,0.1)', borderRadius: 14, padding: 20, border: '1px solid rgba(234,88,12,0.3)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ color: '#f97316', fontSize: 15, fontWeight: 700 }}>📩 PQRS Recibidas desde Formulario Público ({externas.length})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={importarTodas} style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6', fontSize: 12 }}>Importar Todas</button>
              <button onClick={() => setShowExternas(false)} style={{ ...btnStyle, background: 'transparent', color: '#f97316', border: '1px solid rgba(234,88,12,0.3)', fontSize: 12 }}>Cerrar</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {externas.map(ext => (
              <div key={ext.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' }}>{ext.tipo}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>{ext.prioridad}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{fDate(ext.fecha_registro)} {ext.hora_registro}</span>
                  </div>
                  <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{ext.detalle_incidencia.substring(0, 80)}{ext.detalle_incidencia.length > 80 ? '...' : ''}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                    {ext.cliente_nombre} · Avisa: {ext.persona_avisa} {ext.movil_avisa ? `· ${ext.movil_avisa}` : ''} · Rad: {ext.radicado}
                  </p>
                </div>
                <button onClick={() => importarExterna(ext)} style={{ ...btnStyle, background: '#4169E1', color: '#ffffff', border: '1px solid #3b82f6', fontSize: 12, whiteSpace: 'nowrap' }}>Importar al CRM</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Registros</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {tab === 'registros' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código o empresa..."
            style={{ ...inputStyle, maxWidth: 400, marginBottom: 16 }} />
          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Código', 'Tipo', 'Prioridad', 'Cliente', 'Responsable', 'Situación', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', background: '#1e3a8a', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', fontSize: 13, fontFamily: 'monospace' }}>{p.codigo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{tipoIcon(p.tipo)} {p.tipo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...prioridadStyle(p.prioridad) }}>{p.prioridad}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.cliente_nombre}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.responsable}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(p.situacion) }}>{p.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewDetail(p)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                        {permisos.editar && p.situacion !== 'Cerrada' && <button onClick={() => { setSelected(p); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>}
                        {permisos.eliminar && <button onClick={() => { if (confirm(`¿Eliminar ${p.codigo}?`)) deletePQRS(p.id); logAudit({ ...auditParams(), accion: "ELIMINAR", registro_codigo: p.codigo, registro_nombre: p.asunto }) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay PQRS registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <ReportPanel title="Reporte de PQRS" columns={reportColumns} rows={reportRows}
          filters={[
            { label: 'Tipo', key: 'tipo', options: [...new Set(pqrs.map(p => p.tipo).filter(Boolean))] },
            { label: 'Prioridad', key: 'prioridad', options: [...new Set(pqrs.map(p => p.prioridad).filter(Boolean))] },
            { label: 'Situación', key: 'situacion', options: [...new Set(pqrs.map(p => p.situacion).filter(Boolean))] },
          ]} />
      )}
    </div>
  )
}
