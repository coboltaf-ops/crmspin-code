'use client'
import { useState, useEffect, useCallback } from 'react'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { useUsuariosStore } from '@/features/usuarios-gestion/store/usuarios-store'
import ReportPanel from '@/shared/components/report-panel'

interface AuditEvent {
  id: string
  fecha: string
  fecha_dia: string
  hora: string
  usuario: string
  usuario_nombre: string
  rol: string
  modulo: string
  accion: string
  registro_codigo: string
  registro_nombre: string
  detalle?: string
  campo?: string
  valor_anterior?: string
  valor_nuevo?: string
}

const MODULOS = ['clientes', 'contactos', 'prospectos', 'oportunidades', 'cotizaciones', 'pqrs', 'productos', 'tareas', 'usuarios', 'referencias', 'auth']
const ACCIONES = ['CREAR', 'MODIFICAR', 'ELIMINAR', 'ANULAR', 'ENVIAR_EMAIL', 'IMPORTAR', 'CONVERTIR', 'SEGUIMIENTO', 'LOGIN', 'LOGOUT', 'OTRO']

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AuditoriaPage() {
  const user = useCurrentUserStore(s => s.user)
  const usuariosSistema = useUsuariosStore(s => s.usuarios)
  const [eventos, setEventos] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [mes, setMes] = useState(currentMonth())
  const [filtroModulo, setFiltroModulo] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroCodigo, setFiltroCodigo] = useState('')
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ mes })
      if (filtroModulo) params.set('modulo', filtroModulo)
      if (filtroAccion) params.set('accion', filtroAccion)
      if (filtroUsuario) params.set('usuario', filtroUsuario)
      if (filtroCodigo) params.set('codigo', filtroCodigo)
      const res = await fetch(`/api/audit-log?${params.toString()}`)
      const data = await res.json()
      setEventos(data.eventos || [])
    } catch { setEventos([]) }
    finally { setLoading(false) }
  }, [mes, filtroModulo, filtroAccion, filtroUsuario, filtroCodigo])

  useEffect(() => { cargar() }, [cargar])

  if (!user) return null
  const isAdmin = user.rol.toLowerCase() === 'admin'

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1 style={{ color: '#ffffff', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Acceso restringido</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Solo los administradores pueden ver la auditoría del sistema.</p>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13, outline: 'none' }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#1e3a8a' : 'rgba(255,255,255,0.15)', color: active ? '#fff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)' })

  const accionColor: Record<string, string> = {
    CREAR: '#86efac', MODIFICAR: '#93c5fd', ELIMINAR: '#fca5a5', ANULAR: '#fcd34d',
    ENVIAR_EMAIL: '#a78bfa', IMPORTAR: '#34d399', CONVERTIR: '#60a5fa',
    SEGUIMIENTO: '#d8b4fe', LOGIN: '#4ade80', LOGOUT: '#fca5a5', OTRO: '#d1d5db',
  }

  // Generar últimos 12 meses como opciones
  const mesOpciones: string[] = []
  const d = new Date()
  for (let i = 0; i < 12; i++) {
    const nd = new Date(d.getFullYear(), d.getMonth() - i, 1)
    mesOpciones.push(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`)
  }

  const reportColumns = [
    { header: 'Fecha', key: 'fecha_dia', width: 10 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Usuario', key: 'usuario_nombre', width: 16 },
    { header: 'Rol', key: 'rol', width: 10 },
    { header: 'Módulo', key: 'modulo', width: 12 },
    { header: 'Acción', key: 'accion', width: 12 },
    { header: 'Código', key: 'registro_codigo', width: 12 },
    { header: 'Registro', key: 'registro_nombre', width: 18 },
    { header: 'Campo', key: 'campo', width: 12 },
    { header: 'Anterior', key: 'valor_anterior', width: 14 },
    { header: 'Nuevo', key: 'valor_nuevo', width: 14 },
    { header: 'Detalle', key: 'detalle', width: 20 },
  ]
  const reportRows = eventos.map(e => ({
    fecha_dia: e.fecha_dia, hora: e.hora, usuario_nombre: e.usuario_nombre, rol: e.rol,
    modulo: e.modulo, accion: e.accion, registro_codigo: e.registro_codigo,
    registro_nombre: e.registro_nombre, campo: e.campo || '',
    valor_anterior: e.valor_anterior || '', valor_nuevo: e.valor_nuevo || '', detalle: e.detalle || '',
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 4 }}>🔍 Auditoría del Sistema</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Trazabilidad completa de acciones de todos los usuarios</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>EVENTOS DEL MES</p>
          <p style={{ color: '#4ade80', fontSize: 28, fontWeight: 800, margin: 0 }}>{eventos.length}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Bitácora</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 16 }}>
        <div>
          <label style={{ color: '#fff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mes</label>
          <select value={mes} onChange={e => setMes(e.target.value)} style={inputStyle}>
            {mesOpciones.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#fff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Módulo</label>
          <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} style={inputStyle}>
            <option value="">Todos</option>
            {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#fff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Acción</label>
          <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)} style={inputStyle}>
            <option value="">Todas</option>
            {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#fff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Usuario</label>
          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} style={inputStyle}>
            <option value="">Todos los usuarios</option>
            {(() => {
              const logins = new Set<string>()
              usuariosSistema.forEach(u => logins.add(u.usuario))
              eventos.forEach(e => { if (e.usuario) logins.add(e.usuario) })
              const lista = Array.from(logins).sort()
              return lista.map(login => {
                const u = usuariosSistema.find(x => x.usuario === login)
                const label = u ? `${u.nombre} ${u.apellido} (${login})` : login
                return <option key={login} value={login}>{label}</option>
              })
            })()}
          </select>
        </div>
        <div>
          <label style={{ color: '#fff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Código</label>
          <input value={filtroCodigo} onChange={e => setFiltroCodigo(e.target.value)} placeholder="CLI-, COT-..." style={inputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={cargar} style={{ ...btnStyle, background: '#1e3a8a', color: '#fff', border: '1px solid #3b82f6', height: 38 }}>🔄 Refrescar</button>
        </div>
      </div>

      {tab === 'registros' ? (
        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Fecha', 'Hora', 'Usuario', 'Rol', 'Módulo', 'Acción', 'Código', 'Registro', 'Detalle'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', background: '#1e3a8a', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Cargando...</td></tr>}
              {!loading && eventos.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'monospace' }}>{e.fecha_dia}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'monospace' }}>{e.hora}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, fontWeight: 600 }}>{e.usuario_nombre}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{e.rol}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>{e.modulo}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: accionColor[e.accion] || '#fff', background: 'rgba(0,0,0,0.25)', border: `1px solid ${(accionColor[e.accion] || '#fff') + '55'}` }}>{e.accion}</span>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#4ade80', fontSize: 12, fontFamily: 'monospace' }}>{e.registro_codigo || '—'}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>{e.registro_nombre || '—'}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.detalle || (e.campo ? `${e.campo}: ${e.valor_anterior || '—'} → ${e.valor_nuevo || '—'}` : '—')}</td>
                </tr>
              ))}
              {!loading && eventos.length === 0 && <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Sin eventos registrados con estos filtros</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <ReportPanel
          title="Auditoría del Sistema"
          columns={reportColumns}
          rows={reportRows}
          filters={[
            { label: 'Módulo', key: 'modulo', options: [...new Set(eventos.map(e => e.modulo).filter(Boolean))] },
            { label: 'Acción', key: 'accion', options: [...new Set(eventos.map(e => e.accion).filter(Boolean))] },
            { label: 'Usuario', key: 'usuario_nombre', options: [...new Set(eventos.map(e => e.usuario_nombre).filter(Boolean))] },
          ]}
        />
      )}

      <div style={{ marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
        <p style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700, margin: 0, letterSpacing: 0.3 }}>🔒 REGISTRO INMUTABLE</p>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: '4px 0 0 0' }}>Los eventos de auditoría no pueden eliminarse ni modificarse. El sistema particiona automáticamente por mes para optimizar rendimiento.</p>
      </div>
    </div>
  )
}
