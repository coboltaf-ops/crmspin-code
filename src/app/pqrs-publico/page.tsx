'use client'
import { useState } from 'react'

type ClienteInfo = { cliente_id: string; cliente_codigo: string; cliente_nombre: string }

type FormData = {
  fecha: string
  tipo: string
  cliente_id: string
  cliente_codigo: string
  cliente_nombre: string
  fecha_aviso: string
  hora_aviso: string
  persona_avisa: string
  movil_avisa: string
  detalle_incidencia: string
  prioridad: string
}

const todayCO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })

const initial: FormData = {
  fecha: todayCO(), tipo: '', cliente_id: '', cliente_codigo: '', cliente_nombre: '',
  fecha_aviso: todayCO(), hora_aviso: '', persona_avisa: '', movil_avisa: '',
  detalle_incidencia: '', prioridad: 'Media',
}

const tipos = [
  { id: 'Petición', icon: '📝' }, { id: 'Queja', icon: '😤' },
  { id: 'Reclamo', icon: '⚠️' }, { id: 'Sugerencia', icon: '💡' },
]

const prioridades = [
  { id: 'Baja', color: '#22c55e' }, { id: 'Media', color: '#eab308' },
  { id: 'Alta', color: '#f97316' }, { id: 'Urgente', color: '#ef4444' },
]

export default function PQRSPublicoPage() {
  const [codigoAcceso, setCodigoAcceso] = useState('')
  const [validando, setValidando] = useState(false)
  const [clienteInfo, setClienteInfo] = useState<ClienteInfo | null>(null)
  const [errorCodigo, setErrorCodigo] = useState('')

  const [form, setForm] = useState<FormData>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; mensaje: string; radicado?: string } | null>(null)
  const [salir, setSalir] = useState(false)

  const [tiposRef, setTiposRef] = useState<{ id: string; icon: string }[]>(tipos)

  const set = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validarCodigo = async () => {
    const code = codigoAcceso.trim().toUpperCase()
    if (!code) { setErrorCodigo('Ingrese su código de acceso'); return }
    setValidando(true); setErrorCodigo('')
    try {
      const res = await fetch(`/api/clientes-acceso?code=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (data.valid) {
        setClienteInfo({ cliente_id: data.cliente_id, cliente_codigo: data.cliente_codigo, cliente_nombre: data.cliente_nombre })
        setForm(prev => ({ ...prev, cliente_id: data.cliente_id, cliente_codigo: data.cliente_codigo, cliente_nombre: data.cliente_nombre }))
        void loadTipos()
      } else {
        setErrorCodigo(data.error || 'Código no válido')
        setClienteInfo(null)
      }
    } catch {
      setErrorCodigo('Error de conexión. Intente más tarde.')
    } finally { setValidando(false) }
  }

  const loadTipos = async () => {
    try { void tiposRef } catch { /* silent */ }
    setTiposRef(tipos)
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.tipo) e.tipo = 'Seleccione un tipo'
    if (!form.fecha_aviso) e.fecha_aviso = 'Fecha requerida'
    if (!form.persona_avisa.trim()) e.persona_avisa = 'Nombre requerido'
    if (!form.detalle_incidencia.trim()) e.detalle_incidencia = 'Detalle requerido'
    if (form.detalle_incidencia.length > 2000) e.detalle_incidencia = 'Máximo 2000 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/pqrs-externo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, mensaje: data.mensaje, radicado: data.radicado })
        setForm({ ...initial, cliente_id: form.cliente_id, cliente_codigo: form.cliente_codigo, cliente_nombre: form.cliente_nombre, fecha: todayCO(), fecha_aviso: todayCO() })
      } else {
        setResult({ ok: false, mensaje: data.error || 'Error al enviar.' })
      }
    } catch {
      setResult({ ok: false, mensaje: 'Error de conexión.' })
    } finally { setSending(false) }
  }

  // ── Estilos azul oscuro ──
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.25)', color: '#ffffff',
    fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
  }
  const inputErr: React.CSSProperties = { ...inputStyle, borderColor: '#fca5a5', boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' }
  const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }
  const errText: React.CSSProperties = { color: '#fca5a5', fontSize: 11, marginTop: 3 }
  const req: React.CSSProperties = { color: '#fca5a5', marginLeft: 2 }

  // ═══════════ PANTALLA DE ÉXITO ═══════════
  if (result?.ok) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#0f1b3d', borderRadius: 16, padding: '36px 32px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 30 }}>✅</div>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>PQRS Radicada Exitosamente</h2>
          {result.radicado && (
            <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: '14px 18px', margin: '16px 0', border: '1px solid rgba(34,197,94,0.3)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>Su número de radicado es:</p>
              <p style={{ color: '#22c55e', fontSize: 24, fontWeight: 800, fontFamily: 'monospace', letterSpacing: 1 }}>{result.radicado}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 }}>Guarde este número para consultar el estado</p>
            </div>
          )}
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>{result.mensaje}</p>
          <button onClick={() => setResult(null)}
            style={{ padding: '10px 28px', borderRadius: 10, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Radicar otra PQRS
          </button>
        </div>
      </div>
    )
  }

  // ═══════════ PANTALLA DE SALIDA ═══════════
  if (salir) {
    return (
      <div style={{ minHeight: '100vh', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#0f1b3d', borderRadius: 16, padding: '36px 32px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>👋</div>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Gracias por visitarnos</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>Puede cerrar esta pestaña de forma segura.</p>
          <button onClick={() => setSalir(false)}
            style={{ padding: '10px 28px', borderRadius: 10, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Volver al formulario
          </button>
        </div>
      </div>
    )
  }

  // ═══════════ PANTALLA PRINCIPAL ═══════════
  return (
    <div style={{ minHeight: '100vh', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0f1b3d', borderRadius: 16, padding: '28px 28px', maxWidth: 500, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📩</div>
            <div>
              <h1 style={{ color: '#ffffff', fontSize: 17, fontWeight: 800, margin: 0 }}>CRM SPIN · Radicar PQRS</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>Peticiones, Quejas, Reclamos y Sugerencias</p>
            </div>
          </div>
          <button onClick={() => { window.close(); setTimeout(() => setSalir(true), 300) }}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Salir
          </button>
        </div>

        {/* ═══ VALIDACIÓN DE CÓDIGO DE ACCESO ═══ */}
        {!clienteInfo ? (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
              <h2 style={{ color: '#ffffff', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Ingrese su Código de Acceso</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 20 }}>Este código fue proporcionado por su ejecutivo comercial.</p>

              <div style={{ maxWidth: 280, margin: '0 auto' }}>
                <input
                  value={codigoAcceso}
                  onChange={e => { setCodigoAcceso(e.target.value.toUpperCase()); setErrorCodigo('') }}
                  onKeyDown={e => { if (e.key === 'Enter') validarCodigo() }}
                  placeholder="Ej: ACC-7F3K9M"
                  maxLength={10}
                  style={{
                    ...inputStyle, textAlign: 'center', fontSize: 18, fontWeight: 800, fontFamily: 'monospace',
                    letterSpacing: 3, padding: '12px 14px',
                    ...(errorCodigo ? { borderColor: '#fca5a5', boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' } : {}),
                  }}
                />
                {errorCodigo && <p style={errText}>{errorCodigo}</p>}

                <button onClick={validarCodigo} disabled={validando}
                  style={{
                    width: '100%', marginTop: 14, padding: '11px 20px', borderRadius: 10,
                    background: validando ? 'rgba(255,255,255,0.1)' : '#2563eb', color: '#ffffff',
                    border: validando ? '1px solid rgba(255,255,255,0.2)' : '1px solid #3b82f6',
                    fontSize: 14, fontWeight: 700, cursor: validando ? 'not-allowed' : 'pointer',
                  }}>
                  {validando ? 'Validando...' : 'Ingresar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ═══ FORMULARIO PQRS ═══ */
          <div>
            {/* Banner empresa validada */}
            <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <div>
                  <p style={{ color: '#22c55e', fontSize: 12, fontWeight: 700, margin: 0 }}>{clienteInfo.cliente_nombre}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>Código: {clienteInfo.cliente_codigo}</p>
                </div>
              </div>
              <button onClick={() => { setClienteInfo(null); setCodigoAcceso(''); setForm(initial) }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>Cambiar</button>
            </div>

            {/* Error global */}
            {result && !result.ok && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#fca5a5', fontSize: 12 }}>
                {result.mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                {/* 1. Fecha */}
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inputStyle} />
                </div>

                {/* 2. Tipo Incidencia */}
                <div>
                  <label style={labelStyle}>Tipo de Incidencia<span style={req}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {tiposRef.map(t => (
                      <button key={t.id} type="button" onClick={() => set('tipo', t.id)}
                        style={{
                          padding: '6px 4px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                          border: form.tipo === t.id ? '2px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.15)',
                          background: form.tipo === t.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                          color: form.tipo === t.id ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                        }}>
                        {t.icon} {t.id}
                      </button>
                    ))}
                  </div>
                  {errors.tipo && <p style={errText}>{errors.tipo}</p>}
                </div>

                {/* 3. Empresa (readonly) */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Empresa</label>
                  <input value={clienteInfo.cliente_nombre} readOnly style={{ ...inputStyle, background: 'rgba(255,255,255,0.05)', fontWeight: 600, opacity: 0.6 }} />
                </div>

                {/* 4. Fecha Aviso Empresa */}
                <div>
                  <label style={labelStyle}>Fecha Aviso Empresa<span style={req}>*</span></label>
                  <input type="date" value={form.fecha_aviso} onChange={e => set('fecha_aviso', e.target.value)}
                    style={errors.fecha_aviso ? inputErr : inputStyle} />
                  {errors.fecha_aviso && <p style={errText}>{errors.fecha_aviso}</p>}
                </div>

                {/* 5. Hora Aviso */}
                <div>
                  <label style={labelStyle}>Hora Aviso</label>
                  <input type="time" value={form.hora_aviso} onChange={e => set('hora_aviso', e.target.value)} style={inputStyle} />
                </div>

                {/* 6. Persona que Avisa */}
                <div>
                  <label style={labelStyle}>Persona que Avisa<span style={req}>*</span></label>
                  <input value={form.persona_avisa} onChange={e => set('persona_avisa', e.target.value)}
                    placeholder="Nombre completo" style={errors.persona_avisa ? inputErr : inputStyle} />
                  {errors.persona_avisa && <p style={errText}>{errors.persona_avisa}</p>}
                </div>

                {/* 7. Móvil que Avisa */}
                <div>
                  <label style={labelStyle}>Móvil que Avisa</label>
                  <input value={form.movil_avisa} onChange={e => set('movil_avisa', e.target.value)}
                    placeholder="300 123 4567" style={inputStyle} />
                </div>

                {/* 8. Detalle de Incidencia */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={labelStyle}>Detalle de la Incidencia<span style={req}>*</span></label>
                    <span style={{ fontSize: 10, color: form.detalle_incidencia.length > 2000 ? '#fca5a5' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                      {form.detalle_incidencia.length}/2000
                    </span>
                  </div>
                  <textarea value={form.detalle_incidencia} onChange={e => set('detalle_incidencia', e.target.value)} rows={3}
                    placeholder="Describa con detalle la incidencia..."
                    style={{ ...(errors.detalle_incidencia ? inputErr : inputStyle), resize: 'vertical', minHeight: 70 }} />
                  {errors.detalle_incidencia && <p style={errText}>{errors.detalle_incidencia}</p>}
                </div>

                {/* 9. Prioridad */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={labelStyle}>Prioridad</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {prioridades.map(p => (
                      <button key={p.id} type="button" onClick={() => set('prioridad', p.id)}
                        style={{
                          flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                          border: form.prioridad === p.id ? `2px solid ${p.color}` : '1.5px solid rgba(255,255,255,0.15)',
                          background: form.prioridad === p.id ? `${p.color}20` : 'rgba(255,255,255,0.05)',
                          color: form.prioridad === p.id ? p.color : 'rgba(255,255,255,0.4)',
                        }}>
                        {p.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón enviar */}
              <button type="submit" disabled={sending}
                style={{
                  width: '100%', marginTop: 18, padding: '11px 20px', borderRadius: 10,
                  background: sending ? 'rgba(255,255,255,0.1)' : '#2563eb',
                  color: '#ffffff', border: sending ? '1px solid rgba(255,255,255,0.2)' : '1px solid #3b82f6',
                  fontSize: 14, fontWeight: 700,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  boxShadow: sending ? 'none' : '0 4px 14px rgba(37,99,235,0.4)',
                }}>
                {sending ? 'Enviando...' : 'Radicar PQRS'}
              </button>

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 10 }}>
                Los campos marcados con <span style={{ color: '#fca5a5' }}>*</span> son obligatorios
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
