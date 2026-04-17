'use client'
import { useState } from 'react'
import { Seguimiento } from '@/shared/types/seguimiento'
import { todayColombia } from '@/shared/lib/format-date'

interface Props {
  seguimientos: Seguimiento[]
  usuario: string
  situacionActual: string
  situacionOpciones?: string[]
  onAdd: (seg: Seguimiento) => void
  readOnly?: boolean
}

function fDate(d: string) {
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return d
    return dt.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + dt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  } catch { return d }
}

export default function SeguimientoPanel({ seguimientos, usuario, situacionActual, situacionOpciones, onAdd, readOnly }: Props) {
  const [fecha, setFecha] = useState(todayColombia())
  const [detalle, setDetalle] = useState('')
  const [personaActividad, setPersonaActividad] = useState('')
  const [situacion, setSituacion] = useState(situacionActual)

  const handleAdd = () => {
    if (!detalle.trim()) return
    onAdd({
      id: crypto.randomUUID(),
      fecha: new Date(fecha + 'T12:00:00').toISOString(),
      detalle: detalle.trim(),
      persona_actividad: personaActividad.trim(),
      situacion,
      usuario,
    })
    setDetalle('')
    setPersonaActividad('')
    setFecha(todayColombia())
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: 13, outline: 'none' }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const thStyle: React.CSSProperties = { padding: '10px 14px', background: '#1e3a5f', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }

  const sorted = [...seguimientos].reverse()

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.08)', marginTop: 20 }}>
      <h3 style={{ color: '#ffffff', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Bitacora de Seguimiento ({seguimientos.length})</h3>

      {/* Form to add */}
      {!readOnly && (
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr auto', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Detalle</label>
            <input value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Describir seguimiento..."
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }} style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Persona Hace Seguimiento</label>
            <input value={personaActividad} onChange={e => setPersonaActividad(e.target.value)} placeholder="Nombre..." style={inputStyle} />
          </div>
          <div>
            <label style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situacion</label>
            <select value={situacion} onChange={e => setSituacion(e.target.value)} style={inputStyle}>
              {(situacionOpciones || [situacionActual]).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>
          <button onClick={handleAdd} disabled={!detalle.trim()} style={{ ...btnStyle, background: '#000000', color: '#ffffff', height: 38, whiteSpace: 'nowrap' }}>+ Agregar</button>
        </div>
      )}

      {/* Tabla de bitacora */}
      {sorted.length > 0 ? (
        <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', maxHeight: 350, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 140 }}>Fecha</th>
                <th style={thStyle}>Detalle</th>
                <th style={{ ...thStyle, width: 180 }}>Persona Seguimiento</th>
                <th style={{ ...thStyle, width: 130 }}>Situacion</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                    {fDate(s.fecha)}
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#ffffff', fontSize: 13, lineHeight: 1.5 }}>
                    {s.detalle}
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#4ade80', fontSize: 12, fontWeight: 600 }}>
                    {s.persona_actividad || s.usuario || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.25)' }}>
                      {s.situacion}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin seguimientos registrados</p>
      )}
    </div>
  )
}
