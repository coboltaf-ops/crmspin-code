'use client'
import { useState } from 'react'
import { useFlujosStore, Flujo, Condicion, Accion, MODULOS_FLUJO, TRIGGERS, OPERADORES, TIPOS_ACCION } from '@/features/flujos/store/flujos-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'

function todayCO() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) }
function fDateTime(d: string) {
  try { const dt = new Date(d); return dt.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}

// Campos disponibles por modulo
const CAMPOS_MODULO: Record<string, { id: string; label: string }[]> = {
  clientes: [{ id: 'situacion', label: 'Situación' }, { id: 'ciudad', label: 'Ciudad' }, { id: 'actividad', label: 'Actividad' }, { id: 'condicion_pago', label: 'Condición Pago' }],
  contactos: [{ id: 'situacion', label: 'Situación' }, { id: 'cargo', label: 'Cargo' }, { id: 'nivel_influencia', label: 'Nivel Influencia' }],
  oportunidades: [{ id: 'situacion', label: 'Situación' }, { id: 'etapa', label: 'Etapa' }, { id: 'probabilidad', label: 'Probabilidad' }, { id: 'valor_estimado', label: 'Valor Estimado' }],
  cotizaciones: [{ id: 'situacion', label: 'Situación' }, { id: 'tipo_moneda', label: 'Tipo Moneda' }],
  prospectos: [{ id: 'situacion', label: 'Situación' }, { id: 'origen_prospecto', label: 'Origen' }],
  pqrs: [{ id: 'situacion', label: 'Situación' }, { id: 'tipo', label: 'Tipo' }, { id: 'prioridad', label: 'Prioridad' }],
  tareas: [{ id: 'situacion', label: 'Situación' }, { id: 'persona_ejecuta', label: 'Persona Ejecuta' }],
}

type Vista = 'lista' | 'constructor' | 'detalle'

export default function FlujosPage() {
  const user = useCurrentUserStore(s => s.user)
  const { flujos, addFlujo, updateFlujo, deleteFlujo, toggleActivo, duplicarFlujo } = useFlujosStore()
  const vendedores = useReferenceStore(s => s.vendedores)

  const [vista, setVista] = useState<Vista>('lista')
  const [editing, setEditing] = useState<Flujo | null>(null)
  const [viewDetail, setViewDetail] = useState<Flujo | null>(null)
  const [search, setSearch] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  if (!user) return null

  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', width: '100%' }
  const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, display: 'block' }
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.1)' }
  const nodeStyle = (color: string): React.CSSProperties => ({ background: `${color}15`, border: `2px solid ${color}40`, borderRadius: 12, padding: '16px 20px', position: 'relative' as const })
  const connectorStyle: React.CSSProperties = { width: 2, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 auto' }

  const moduloLabel = (id: string) => MODULOS_FLUJO.find(m => m.id === id)?.label || id
  const triggerLabel = (id: string) => TRIGGERS.find(t => t.id === id)?.label || id
  const accionLabel = (id: string) => TIPOS_ACCION.find(a => a.id === id)?.label || id
  const accionIcon = (id: string) => TIPOS_ACCION.find(a => a.id === id)?.icon || '⚡'

  const filtered = flujos.filter(f => {
    if (filtroModulo && f.modulo !== filtroModulo) return false
    if (filtroEstado === 'activo' && !f.activo) return false
    if (filtroEstado === 'inactivo' && f.activo) return false
    if (search) {
      const s = search.toLowerCase()
      return f.nombre.toLowerCase().includes(s) || f.codigo.toLowerCase().includes(s) || f.descripcion.toLowerCase().includes(s)
    }
    return true
  })

  const abrirNuevo = () => {
    setEditing({
      id: '', codigo: `FLJ-${String(flujos.length + 1).padStart(3, '0')}`,
      nombre: '', descripcion: '', modulo: 'clientes', trigger: 'record_created',
      trigger_campo: '', fecha_programada: '', hora_programada: '', ejecutado_programado: false,
      condiciones_operador: 'AND', condiciones: [], acciones: [],
      activo: false, fecha_creacion: todayCO(), creado_por: `${user.nombre} ${user.apellido}`, ejecuciones: [],
    })
    setVista('constructor')
  }

  const abrirEditar = (f: Flujo) => { setEditing({ ...f, condiciones: [...f.condiciones], acciones: [...f.acciones] }); setVista('constructor') }

  const addCondicion = () => {
    if (!editing) return
    const campos = CAMPOS_MODULO[editing.modulo] || []
    setEditing({ ...editing, condiciones: [...editing.condiciones, { id: crypto.randomUUID(), campo: campos[0]?.id || 'situacion', operador: 'equals', valor: '' }] })
  }

  const updateCondicion = (idx: number, data: Partial<Condicion>) => {
    if (!editing) return
    const conds = [...editing.condiciones]
    conds[idx] = { ...conds[idx], ...data }
    setEditing({ ...editing, condiciones: conds })
  }

  const removeCondicion = (idx: number) => {
    if (!editing) return
    setEditing({ ...editing, condiciones: editing.condiciones.filter((_, i) => i !== idx) })
  }

  const addAccion = () => {
    if (!editing) return
    setEditing({ ...editing, acciones: [...editing.acciones, { id: crypto.randomUUID(), tipo: 'send_email', modulo_destino: editing.modulo, config: {} }] })
  }

  const updateAccion = (idx: number, data: Partial<Accion>) => {
    if (!editing) return
    const acts = [...editing.acciones]
    acts[idx] = { ...acts[idx], ...data }
    setEditing({ ...editing, acciones: acts })
  }

  const updateAccionConfig = (idx: number, key: string, value: string) => {
    if (!editing) return
    const acts = [...editing.acciones]
    acts[idx] = { ...acts[idx], config: { ...acts[idx].config, [key]: value } }
    setEditing({ ...editing, acciones: acts })
  }

  const removeAccion = (idx: number) => {
    if (!editing) return
    setEditing({ ...editing, acciones: editing.acciones.filter((_, i) => i !== idx) })
  }

  const guardar = () => {
    if (!editing) return
    if (!editing.nombre.trim()) { alert('El nombre es obligatorio'); return }
    if (editing.acciones.length === 0) { alert('Agregue al menos una acción'); return }
    if (editing.id) {
      updateFlujo(editing.id, editing)
    } else {
      addFlujo({ ...editing, id: crypto.randomUUID() })
    }
    setEditing(null); setVista('lista')
  }

  // Personas para selects
  const personas = vendedores.filter(v => v.situacion).map(v => `${v.nombre} ${v.apellido}`)

  // ═══════════ DETALLE (Log de ejecuciones) ═══════════
  if (vista === 'detalle' && viewDetail) {
    const totalExitosas = viewDetail.ejecuciones.filter(e => e.estado === 'exitoso').length
    const totalErrores = viewDetail.ejecuciones.filter(e => e.estado === 'error').length
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => { setViewDetail(null); setVista('lista') }} style={{ ...btnStyle, background: '#000', color: '#fff', border: '1px solid #333' }}>← Volver</button>
          <button onClick={() => abrirEditar(viewDetail)} style={{ ...btnStyle, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>Editar</button>
          <button onClick={() => { toggleActivo(viewDetail.id); setViewDetail({ ...viewDetail, activo: !viewDetail.activo }) }}
            style={{ ...btnStyle, background: viewDetail.activo ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: viewDetail.activo ? '#ef4444' : '#22c55e', border: `1px solid ${viewDetail.activo ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}` }}>
            {viewDetail.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{viewDetail.nombre}</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>{viewDetail.codigo} · {moduloLabel(viewDetail.modulo)} · {triggerLabel(viewDetail.trigger)}</p>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: viewDetail.activo ? 'rgba(34,197,94,0.15)' : 'rgba(156,163,175,0.15)', color: viewDetail.activo ? '#22c55e' : '#9ca3af', border: `1px solid ${viewDetail.activo ? 'rgba(34,197,94,0.3)' : 'rgba(156,163,175,0.3)'}` }}>
              {viewDetail.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Ejecuciones</p>
              <p style={{ color: '#3b82f6', fontSize: 28, fontWeight: 800 }}>{viewDetail.ejecuciones.length}</p>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Exitosas</p>
              <p style={{ color: '#22c55e', fontSize: 28, fontWeight: 800 }}>{totalExitosas}</p>
            </div>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Errores</p>
              <p style={{ color: '#ef4444', fontSize: 28, fontWeight: 800 }}>{totalErrores}</p>
            </div>
          </div>
          {/* Acciones del flujo */}
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Acciones ({viewDetail.acciones.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {viewDetail.acciones.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 18 }}>{accionIcon(a.tipo)}</span>
                <span style={{ color: '#fff', fontSize: 13 }}>{i + 1}. {accionLabel(a.tipo)}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>→ {moduloLabel(a.modulo_destino)}</span>
              </div>
            ))}
          </div>
          {/* Log de ejecuciones */}
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Historial de Ejecuciones</h3>
          {viewDetail.ejecuciones.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin ejecuciones registradas</p>
          ) : (
            <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', maxHeight: 350, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '10px 14px', background: '#1e3a5f', color: '#fff', fontSize: 11, textAlign: 'left' }}>Fecha</th>
                    <th style={{ padding: '10px 14px', background: '#1e3a5f', color: '#fff', fontSize: 11, textAlign: 'left' }}>Registro</th>
                    <th style={{ padding: '10px 14px', background: '#1e3a5f', color: '#fff', fontSize: 11, textAlign: 'left' }}>Estado</th>
                    <th style={{ padding: '10px 14px', background: '#1e3a5f', color: '#fff', fontSize: 11, textAlign: 'left' }}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {[...viewDetail.ejecuciones].reverse().map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '8px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{fDateTime(e.fecha)}</td>
                      <td style={{ padding: '8px 14px', color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>{e.registro_codigo}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: e.estado === 'exitoso' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: e.estado === 'exitoso' ? '#22c55e' : '#ef4444' }}>{e.estado}</span>
                      </td>
                      <td style={{ padding: '8px 14px', color: 'rgba(255,255,255,0.6)', fontSize: 11, maxWidth: 300 }}>{e.detalle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ═══════════ CONSTRUCTOR ═══════════
  if (vista === 'constructor' && editing) {
    const camposModulo = CAMPOS_MODULO[editing.modulo] || []
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => { setEditing(null); setVista('lista') }} style={{ ...btnStyle, background: '#000', color: '#fff', border: '1px solid #333' }}>← Cancelar</button>
          <button onClick={guardar} style={{ ...btnStyle, background: '#22c55e', color: '#fff', border: '1px solid #16a34a' }}>Guardar Flujo</button>
        </div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 20 }}>{editing.id ? 'Editar' : 'Nuevo'} Flujo de Automatización</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Columna izquierda: Datos + Visual */}
          <div>
            {/* Datos basicos */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Datos del Flujo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Nombre *</label>
                  <input value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} placeholder="Ej: Notificar PQRS Urgente" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Módulo *</label>
                  <select value={editing.modulo} onChange={e => setEditing({ ...editing, modulo: e.target.value, condiciones: [], trigger_campo: '' })} style={inputStyle}>
                    {MODULOS_FLUJO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Código</label>
                  <input value={editing.codigo} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Descripción</label>
                  <input value={editing.descripcion} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} placeholder="Describir qué hace este flujo..." style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Vista visual del flujo */}
            <div style={cardStyle}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Vista del Flujo</h3>
              {/* Trigger node */}
              <div style={nodeStyle('#3b82f6')}>
                <p style={{ color: '#60a5fa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Trigger</p>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{triggerLabel(editing.trigger)}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Módulo: {moduloLabel(editing.modulo)}</p>
                {editing.trigger === 'field_changed' && editing.trigger_campo && (
                  <p style={{ color: '#60a5fa', fontSize: 11 }}>Campo: {editing.trigger_campo}</p>
                )}
                {editing.trigger === 'scheduled' && (
                  <p style={{ color: '#60a5fa', fontSize: 11 }}>Programado: {editing.fecha_programada || '—'} {editing.hora_programada || ''}</p>
                )}
              </div>
              <div style={connectorStyle} />
              {/* Condiciones */}
              {editing.condiciones.length > 0 && (
                <>
                  <div style={nodeStyle('#eab308')}>
                    <p style={{ color: '#eab308', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Condiciones ({editing.condiciones_operador})</p>
                    {editing.condiciones.map(c => {
                      const campoLabel = camposModulo.find(cm => cm.id === c.campo)?.label || c.campo
                      const opLabel = OPERADORES.find(o => o.id === c.operador)?.label || c.operador
                      return <p key={c.id} style={{ color: '#fff', fontSize: 12, marginBottom: 2 }}>{campoLabel} {opLabel} "{c.valor}"</p>
                    })}
                  </div>
                  <div style={connectorStyle} />
                </>
              )}
              {/* Acciones */}
              {editing.acciones.map((a, i) => (
                <div key={a.id}>
                  <div style={nodeStyle('#22c55e')}>
                    <p style={{ color: '#22c55e', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Acción {i + 1}</p>
                    <p style={{ color: '#fff', fontSize: 13 }}>{accionIcon(a.tipo)} {accionLabel(a.tipo)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>→ {moduloLabel(a.modulo_destino)}</p>
                  </div>
                  {i < editing.acciones.length - 1 && <div style={connectorStyle} />}
                </div>
              ))}
              {editing.acciones.length === 0 && (
                <div style={{ ...nodeStyle('#9ca3af'), textAlign: 'center' as const }}>
                  <p style={{ color: '#9ca3af', fontSize: 12 }}>Sin acciones configuradas</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: Trigger + Condiciones + Acciones */}
          <div>
            {/* Trigger */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <h3 style={{ color: '#60a5fa', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚡ Trigger (Cuándo se dispara)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Evento</label>
                  <select value={editing.trigger} onChange={e => setEditing({ ...editing, trigger: e.target.value, trigger_campo: '' })} style={inputStyle}>
                    {TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                {editing.trigger === 'field_changed' && (
                  <div>
                    <label style={labelStyle}>Campo que cambia</label>
                    <select value={editing.trigger_campo} onChange={e => setEditing({ ...editing, trigger_campo: e.target.value })} style={inputStyle}>
                      <option value="">Seleccionar...</option>
                      {camposModulo.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                )}
                {editing.trigger === 'scheduled' && (
                  <>
                    <div>
                      <label style={labelStyle}>Fecha Programada *</label>
                      <input type="date" value={editing.fecha_programada || ''} onChange={e => setEditing({ ...editing, fecha_programada: e.target.value, ejecutado_programado: false })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Hora Programada</label>
                      <input type="time" value={editing.hora_programada || ''} onChange={e => setEditing({ ...editing, hora_programada: e.target.value, ejecutado_programado: false })} style={inputStyle} />
                    </div>
                  </>
                )}
              </div>
              {editing.trigger === 'scheduled' && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8 }}>
                  El flujo se ejecutará automáticamente al llegar la fecha y hora indicada. Si no indica hora, se ejecutará al inicio del día.
                </p>
              )}
            </div>

            {/* Condiciones */}
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ color: '#eab308', fontSize: 14, fontWeight: 700, margin: 0 }}>🔍 Condiciones</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select value={editing.condiciones_operador} onChange={e => setEditing({ ...editing, condiciones_operador: e.target.value as 'AND' | 'OR' })}
                    style={{ ...inputStyle, width: 80, fontSize: 11, padding: '4px 8px' }}>
                    <option value="AND">Y (AND)</option>
                    <option value="OR">O (OR)</option>
                  </select>
                  <button onClick={addCondicion} style={{ ...btnStyle, padding: '5px 12px', fontSize: 11, background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.3)' }}>+ Condición</button>
                </div>
              </div>
              {editing.condiciones.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', padding: 12 }}>Sin condiciones (se ejecuta siempre)</p>
              )}
              {editing.condiciones.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  <select value={c.campo} onChange={e => updateCondicion(i, { campo: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                    {camposModulo.map(cm => <option key={cm.id} value={cm.id}>{cm.label}</option>)}
                  </select>
                  <select value={c.operador} onChange={e => updateCondicion(i, { operador: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                    {OPERADORES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <input value={c.valor} onChange={e => updateCondicion(i, { valor: e.target.value })} placeholder="Valor..." style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => removeCondicion(i)} style={{ ...btnStyle, padding: '5px 10px', fontSize: 14, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>×</button>
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ color: '#22c55e', fontSize: 14, fontWeight: 700, margin: 0 }}>🎯 Acciones</h3>
                <button onClick={addAccion} style={{ ...btnStyle, padding: '5px 12px', fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>+ Acción</button>
              </div>
              {editing.acciones.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', padding: 12 }}>Agregue al menos una acción</p>
              )}
              {editing.acciones.map((a, i) => (
                <div key={a.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                    <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>Acción {i + 1}</span>
                    <select value={a.tipo} onChange={e => updateAccion(i, { tipo: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                      {TIPOS_ACCION.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                    </select>
                    <select value={a.modulo_destino} onChange={e => updateAccion(i, { modulo_destino: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                      {MODULOS_FLUJO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                    <button onClick={() => removeAccion(i)} style={{ ...btnStyle, padding: '5px 10px', fontSize: 14, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>×</button>
                  </div>
                  {/* Config segun tipo */}
                  {a.tipo === 'send_email' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div><label style={labelStyle}>Para (email)</label><input value={a.config.to || ''} onChange={e => updateAccionConfig(i, 'to', e.target.value)} placeholder="{{correo}} o email fijo" style={inputStyle} /></div>
                      <div><label style={labelStyle}>Nombre destino</label><input value={a.config.nombre_destino || ''} onChange={e => updateAccionConfig(i, 'nombre_destino', e.target.value)} placeholder="{{nombre}}" style={inputStyle} /></div>
                      <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Asunto</label><input value={a.config.asunto || ''} onChange={e => updateAccionConfig(i, 'asunto', e.target.value)} placeholder="Asunto del email" style={inputStyle} /></div>
                      <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Contenido HTML</label><textarea value={a.config.contenido || ''} onChange={e => updateAccionConfig(i, 'contenido', e.target.value)} placeholder="<p>Hola {{nombre}}...</p>" style={{ ...inputStyle, minHeight: 80 }} /></div>
                    </div>
                  )}
                  {a.tipo === 'create_tarea' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div><label style={labelStyle}>Persona Asigna</label>
                        <select value={a.config.persona_asigna || ''} onChange={e => updateAccionConfig(i, 'persona_asigna', e.target.value)} style={inputStyle}>
                          <option value="Sistema">Sistema</option>
                          {personas.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Persona Ejecuta</label>
                        <select value={a.config.persona_ejecuta || ''} onChange={e => updateAccionConfig(i, 'persona_ejecuta', e.target.value)} style={inputStyle}>
                          <option value="">Seleccionar...</option>
                          {personas.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Días de plazo</label><input type="number" value={a.config.dias_plazo || ''} onChange={e => updateAccionConfig(i, 'dias_plazo', e.target.value)} placeholder="3" style={inputStyle} /></div>
                      <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Descripción tarea</label><input value={a.config.descripcion || ''} onChange={e => updateAccionConfig(i, 'descripcion', e.target.value)} placeholder="Seguimiento a {{codigo}}" style={inputStyle} /></div>
                    </div>
                  )}
                  {a.tipo === 'update_field' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div><label style={labelStyle}>Campo</label>
                        <select value={a.config.campo || ''} onChange={e => updateAccionConfig(i, 'campo', e.target.value)} style={inputStyle}>
                          <option value="">Seleccionar...</option>
                          {(CAMPOS_MODULO[a.modulo_destino] || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Nuevo valor</label><input value={a.config.valor || ''} onChange={e => updateAccionConfig(i, 'valor', e.target.value)} placeholder="Valor o {{variable}}" style={inputStyle} /></div>
                    </div>
                  )}
                  {a.tipo === 'add_seguimiento' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Detalle del seguimiento</label><input value={a.config.detalle || ''} onChange={e => updateAccionConfig(i, 'detalle', e.target.value)} placeholder="Acción automática: {{codigo}}" style={inputStyle} /></div>
                      <div><label style={labelStyle}>Situación</label><input value={a.config.situacion || ''} onChange={e => updateAccionConfig(i, 'situacion', e.target.value)} placeholder="{{situacion}}" style={inputStyle} /></div>
                    </div>
                  )}
                  {a.tipo === 'create_record' && (
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8 }}>Configure los campos del nuevo registro. Use {'{{campo}}'} para tomar valores del registro origen.</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {(CAMPOS_MODULO[a.modulo_destino] || []).map(c => (
                          <div key={c.id}><label style={labelStyle}>{c.label}</label><input value={a.config[c.id] || ''} onChange={e => updateAccionConfig(i, c.id, e.target.value)} placeholder={`{{${c.id}}} o valor fijo`} style={inputStyle} /></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════ LISTA PRINCIPAL ═══════════
  const stats = [
    { label: 'Total Flujos', value: flujos.length, color: '#3b82f6' },
    { label: 'Activos', value: flujos.filter(f => f.activo).length, color: '#22c55e' },
    { label: 'Inactivos', value: flujos.filter(f => !f.activo).length, color: '#9ca3af' },
    { label: 'Ejecuciones', value: flujos.reduce((s, f) => s + f.ejecuciones.length, 0), color: '#a78bfa' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚡</div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Flujos de Automatización</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Automatice acciones entre módulos del CRM</p>
          </div>
        </div>
        <button onClick={abrirNuevo} style={{ ...btnStyle, background: '#22c55e', color: '#fff', border: '1px solid #16a34a' }}>+ Nuevo Flujo</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar flujo..." style={{ ...inputStyle, flex: 1, maxWidth: 350 }} />
        <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">Todos los módulos</option>
          {MODULOS_FLUJO.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>⚡</p>
          <p style={{ fontSize: 15 }}>No hay flujos creados</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Cree un flujo para automatizar acciones entre módulos</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {filtered.map(f => (
            <div key={f.id} style={{ ...cardStyle, cursor: 'pointer' }} onClick={() => { setViewDetail(f); setVista('detalle') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{f.nombre}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>{f.codigo} · {f.fecha_creacion}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleActivo(f.id) }}
                  style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: f.activo ? 'rgba(34,197,94,0.15)' : 'rgba(156,163,175,0.15)', color: f.activo ? '#22c55e' : '#9ca3af' }}>
                  {f.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>
              {f.descripcion && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 }}>{f.descripcion}</p>}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>{moduloLabel(f.modulo)}</span>
                <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>{triggerLabel(f.trigger)}</span>
                <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{f.acciones.length} acción(es)</span>
                {f.ejecuciones.length > 0 && (
                  <span style={{ padding: '3px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>{f.ejecuciones.length} ejecución(es)</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={e => { e.stopPropagation(); abrirEditar(f) }}
                  style={{ ...btnStyle, flex: 1, padding: '6px 10px', fontSize: 11, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>Editar</button>
                <button onClick={e => { e.stopPropagation(); duplicarFlujo(f.id) }}
                  style={{ ...btnStyle, padding: '6px 10px', fontSize: 11, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>Duplicar</button>
                <button onClick={e => { e.stopPropagation(); if (confirm('Eliminar flujo?')) deleteFlujo(f.id) }}
                  style={{ ...btnStyle, padding: '6px 10px', fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
