'use client'
import { useState, useEffect, useCallback } from 'react'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'

interface CorreoLog {
  id: string
  fecha: string
  hora: string
  de: string
  para: string
  asunto: string
  modulo: string
  referencia: string
  estado: 'Enviado' | 'Error'
  detalle_error?: string
}

const moduloLabels: Record<string, string> = {
  cotizaciones: 'Cotizaciones',
  prospectos: 'Prospectos',
  pqrs: 'PQRS',
  clientes: 'Empresas',
  oportunidades: 'Oportunidades',
  'email-marketing': 'Email Marketing',
}

export default function CorreosPage() {
  const user = useCurrentUserStore(s => s.user)
  const [correos, setCorreos] = useState<CorreoLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [viewDetail, setViewDetail] = useState<CorreoLog | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/correos-log')
      const data = await res.json()
      setCorreos(data.correos || [])
    } catch { setCorreos([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 15000)
    return () => clearInterval(id)
  }, [cargar])

  if (!user) return null

  const isAdmin = user.rol.toLowerCase() === 'admin'

  const eliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este registro de correo?')) return
    try {
      await fetch('/api/correos-log', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    } catch { /* silent */ }
    setCorreos(prev => prev.filter(c => c.id !== id))
    if (viewDetail?.id === id) setViewDetail(null)
  }

  const filtered = correos.filter(c => {
    if (filtroModulo && c.modulo !== filtroModulo) return false
    if (filtroEstado && c.estado !== filtroEstado) return false
    if (search) {
      const s = search.toLowerCase()
      return c.para.toLowerCase().includes(s) || c.asunto.toLowerCase().includes(s) || c.referencia.toLowerCase().includes(s)
    }
    return true
  })

  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none' }

  const estadoBadge = (estado: string): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: estado === 'Enviado' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
    color: estado === 'Enviado' ? '#22c55e' : '#ef4444',
    border: `1px solid ${estado === 'Enviado' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
  })

  const moduloBadge = (modulo: string): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)',
  })

  // ═══════════ VISTA DETALLE ═══════════
  if (viewDetail) {
    const fields = [
      { label: 'Fecha', value: viewDetail.fecha },
      { label: 'Hora', value: viewDetail.hora },
      { label: 'De', value: viewDetail.de },
      { label: 'Para', value: viewDetail.para },
      { label: 'Asunto', value: viewDetail.asunto },
      { label: 'Módulo', value: moduloLabels[viewDetail.modulo] || viewDetail.modulo },
      { label: 'Referencia', value: viewDetail.referencia },
      { label: 'Estado', value: viewDetail.estado },
    ]
    if (viewDetail.detalle_error) {
      fields.push({ label: 'Detalle Error', value: viewDetail.detalle_error })
    }
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333' }}>← Volver</button>
          {isAdmin && (
            <button onClick={() => eliminar(viewDetail.id)} style={{ ...btnStyle, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>
          )}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📧</div>
            <div>
              <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, margin: 0 }}>{viewDetail.asunto}</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>Enviado a {viewDetail.para}</p>
            </div>
            <span style={estadoBadge(viewDetail.estado)}>{viewDetail.estado}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.label} style={f.label === 'Detalle Error' ? { gridColumn: 'span 3' } : undefined}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════ LISTA PRINCIPAL ═══════════
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📧</div>
          <div>
            <h1 style={{ color: '#ffffff', fontSize: 22, fontWeight: 800, margin: 0 }}>Correos Enviados</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Historial de correos enviados desde el sistema</p>
          </div>
        </div>
        <button onClick={cargar} style={{ ...btnStyle, background: '#1e3a8a', color: '#ffffff', border: '1px solid #2563eb' }}>
          🔄 Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por destinatario, asunto o referencia..."
          style={{ ...inputStyle, flex: 1, minWidth: 250 }} />
        <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)} style={inputStyle}>
          <option value="">Todos los módulos</option>
          <option value="cotizaciones">Cotizaciones</option>
          <option value="prospectos">Prospectos</option>
          <option value="pqrs">PQRS</option>
          <option value="clientes">Empresas</option>
          <option value="oportunidades">Oportunidades</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={inputStyle}>
          <option value="">Todos los estados</option>
          <option value="Enviado">Enviado</option>
          <option value="Error">Error</option>
        </select>
      </div>

      {/* Estadísticas rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Enviados', value: correos.filter(c => c.estado === 'Enviado').length, color: '#3b82f6' },
          { label: 'Cotizaciones', value: correos.filter(c => c.modulo === 'cotizaciones').length, color: '#8b5cf6' },
          { label: 'Prospectos', value: correos.filter(c => c.modulo === 'prospectos').length, color: '#22c55e' },
          { label: 'Errores', value: correos.filter(c => c.estado === 'Error').length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40 }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p style={{ fontSize: 15 }}>No hay correos registrados</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Los correos aparecerán aquí cuando se envíen desde Cotizaciones, Prospectos o PQRS</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.08)' }}>
                {['Fecha', 'Hora', 'Para', 'Asunto', 'Módulo', 'Referencia', 'Estado', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 14px', color: '#ffffff', fontSize: 13 }}>{c.fecha}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.hora}</td>
                  <td style={{ padding: '10px 14px', color: '#ffffff', fontSize: 13, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.para}</td>
                  <td style={{ padding: '10px 14px', color: '#ffffff', fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.asunto}</td>
                  <td style={{ padding: '10px 14px' }}><span style={moduloBadge(c.modulo)}>{moduloLabels[c.modulo] || c.modulo}</span></td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{c.referencia || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><span style={estadoBadge(c.estado)}>{c.estado}</span></td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setViewDetail(c)}
                        style={{ ...btnStyle, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '5px 12px', fontSize: 12 }}>
                        Ver
                      </button>
                      {isAdmin && (
                        <button onClick={() => eliminar(c.id)}
                          style={{ ...btnStyle, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '5px 12px', fontSize: 12 }}>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 16 }}>
        Mostrando {filtered.length} de {correos.length} correos
      </p>
    </div>
  )
}
