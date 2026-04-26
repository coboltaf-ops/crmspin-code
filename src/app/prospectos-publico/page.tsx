'use client'
import { useState, useEffect } from 'react'

type FormData = {
  nombre: string
  apellido: string
  empresa: string
  correo: string
  nro_movil: string
  descripcion_requerimiento: string
}

const initial: FormData = {
  nombre: '', apellido: '', empresa: '', correo: '', nro_movil: '', descripcion_requerimiento: '',
}

export default function ProspectosPublicoPage() {
  const [form, setForm] = useState<FormData>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const [salir, setSalir] = useState(false)
  const [empresa, setEmpresa] = useState<{ nombre: string; logo_url: string }>({ nombre: '', logo_url: '' })

  useEffect(() => {
    fetch('/api/empresa-publico')
      .then(r => r.json())
      .then(d => setEmpresa({ nombre: d.nombre || '', logo_url: d.logo_url || '' }))
      .catch(() => {})
  }, [])

  const set = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.nombre.trim()) e.nombre = 'Nombre es obligatorio'
    if (!form.apellido.trim()) e.apellido = 'Apellido es obligatorio'
    if (!form.empresa.trim()) e.empresa = 'Empresa es obligatorio'
    if (!form.correo.trim()) e.correo = 'Correo es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = 'Formato de correo no válido'
    if (!form.nro_movil.trim()) e.nro_movil = 'Nro Móvil es obligatorio'
    if (!form.descripcion_requerimiento.trim()) e.descripcion_requerimiento = 'Descripción es obligatoria'
    if (form.descripcion_requerimiento.length > 2000) e.descripcion_requerimiento = 'Máximo 2000 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/prospectos-externo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, mensaje: data.mensaje })
        setForm(initial)
      } else {
        setResult({ ok: false, mensaje: data.error || 'Error al enviar.' })
      }
    } catch {
      setResult({ ok: false, mensaje: 'Error de conexión. Intente más tarde.' })
    } finally { setSending(false) }
  }

  // ── Estilos ──
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.25)', color: '#ffffff',
    fontSize: 13, outline: 'none', transition: 'border-color 0.2s',
    boxSizing: 'border-box', height: 40,
  }
  const inputErr: React.CSSProperties = { ...inputStyle, borderColor: '#fca5a5', boxShadow: '0 0 0 3px rgba(239,68,68,0.2)' }
  const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }
  const errText: React.CSSProperties = { color: '#fca5a5', fontSize: 11, marginTop: 3 }
  const req: React.CSSProperties = { color: '#fca5a5', marginLeft: 2 }

  // ═══════════ PANTALLA DE ÉXITO ═══════════
  if (result?.ok) {
    return (
      <div style={{ minHeight: '100vh', background: '#002366', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#172554', borderRadius: 16, padding: '36px 32px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 30 }}>✅</div>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Información Recibida</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.7, marginBottom: 22 }}>{result.mensaje}</p>
          <button onClick={() => setResult(null)}
            style={{ padding: '10px 28px', borderRadius: 10, background: '#3b82f6', color: '#ffffff', border: '1px solid #3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Enviar otro prospecto
          </button>
        </div>
      </div>
    )
  }

  // ═══════════ PANTALLA DE SALIDA ═══════════
  if (salir) {
    return (
      <div style={{ minHeight: '100vh', background: '#002366', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#172554', borderRadius: 16, padding: '36px 32px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>👋</div>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Gracias por visitarnos</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>Puede cerrar esta pestaña de forma segura.</p>
          <button onClick={() => setSalir(false)}
            style={{ padding: '10px 28px', borderRadius: 10, background: '#3b82f6', color: '#ffffff', border: '1px solid #3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Volver al formulario
          </button>
        </div>
      </div>
    )
  }

  // ═══════════ FORMULARIO PRINCIPAL ═══════════
  return (
    <div style={{ minHeight: '100vh', background: '#002366', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#172554', borderRadius: 16, padding: '28px 28px', maxWidth: 460, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {empresa.logo_url ? (
              <img src={empresa.logo_url} alt={empresa.nombre || 'Logo'} style={{ maxHeight: 48, maxWidth: 80, objectFit: 'contain', background: '#ffffff', borderRadius: 8, padding: 4 }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤝</div>
            )}
            <div>
              <h1 style={{ color: '#ffffff', fontSize: 17, fontWeight: 800, margin: 0 }}>{empresa.nombre || 'CRM SPIN'} · Prospecto</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>Déjenos sus datos y lo contactaremos</p>
            </div>
          </div>
          <button onClick={() => { window.close(); setTimeout(() => setSalir(true), 300) }}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Salir
          </button>
        </div>

        {/* Error global */}
        {result && !result.ok && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 12 }}>
            {result.mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* 1. Nombre */}
            <div>
              <label style={labelStyle}>Nombre<span style={req}>*</span></label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Ingrese su nombre" style={errors.nombre ? inputErr : inputStyle} />
              {errors.nombre && <p style={errText}>{errors.nombre}</p>}
            </div>

            {/* 2. Apellido */}
            <div>
              <label style={labelStyle}>Apellidos<span style={req}>*</span></label>
              <input value={form.apellido} onChange={e => set('apellido', e.target.value)}
                placeholder="Ingrese sus apellidos" style={errors.apellido ? inputErr : inputStyle} />
              {errors.apellido && <p style={errText}>{errors.apellido}</p>}
            </div>

            {/* 3. Empresa */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Empresa<span style={req}>*</span></label>
              <input value={form.empresa} onChange={e => set('empresa', e.target.value)}
                placeholder="Nombre de la empresa" style={errors.empresa ? inputErr : inputStyle} />
              {errors.empresa && <p style={errText}>{errors.empresa}</p>}
            </div>

            {/* 4. Correo */}
            <div>
              <label style={labelStyle}>Correo<span style={req}>*</span></label>
              <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)}
                placeholder="correo@ejemplo.com" style={errors.correo ? inputErr : inputStyle} />
              {errors.correo && <p style={errText}>{errors.correo}</p>}
            </div>

            {/* 5. Nro Móvil */}
            <div>
              <label style={labelStyle}>Nro Móvil<span style={req}>*</span></label>
              <input value={form.nro_movil} onChange={e => set('nro_movil', e.target.value)}
                placeholder="300 123 4567" style={errors.nro_movil ? inputErr : inputStyle} />
              {errors.nro_movil && <p style={errText}>{errors.nro_movil}</p>}
            </div>

            {/* 6. Descripción Requerimiento */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Descripción Requerimiento<span style={req}>*</span></label>
                <span style={{ fontSize: 10, color: form.descripcion_requerimiento.length > 2000 ? '#fca5a5' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  {form.descripcion_requerimiento.length}/2000
                </span>
              </div>
              <textarea value={form.descripcion_requerimiento} onChange={e => set('descripcion_requerimiento', e.target.value)} rows={3}
                placeholder="Describa lo que necesita..."
                style={{ ...(errors.descripcion_requerimiento ? inputErr : inputStyle), resize: 'vertical', minHeight: 70, height: 'auto' }} />
              {errors.descripcion_requerimiento && <p style={errText}>{errors.descripcion_requerimiento}</p>}
            </div>

          </div>

          {/* Botón enviar */}
          <button type="submit" disabled={sending}
            style={{
              width: '100%', marginTop: 18, padding: '11px 20px', borderRadius: 10,
              background: sending ? 'rgba(255,255,255,0.1)' : '#3b82f6',
              color: '#ffffff', border: sending ? '1px solid rgba(255,255,255,0.2)' : '1px solid #3b82f6', fontSize: 14, fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer',
              boxShadow: sending ? 'none' : '0 4px 14px rgba(37,99,235,0.4)',
            }}>
            {sending ? 'Enviando...' : 'Enviar Información'}
          </button>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 10 }}>
            Los campos marcados con <span style={{ color: '#fca5a5' }}>*</span> son obligatorios
          </p>
        </form>

      </div>
    </div>
  )
}
