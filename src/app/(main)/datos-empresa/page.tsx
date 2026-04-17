'use client'
import { useState, useRef } from 'react'
import DocumentosPanel from '@/shared/components/documentos-panel'
import { useEmpresaStore, Empresa } from '@/features/empresa/store/empresa-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { nextConsecutivo } from '@/shared/lib/consecutivo'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import { Seguimiento } from '@/shared/types/seguimiento'

export default function DatosEmpresaPage() {
  const permisos = usePermisos('datos-empresa')
  const currentUser = useCurrentUserStore(s => s.user)
  const { empresas, addEmpresa, updateEmpresa, deleteEmpresa } = useEmpresaStore()
  const refData = useReferenceStore(s => s.data)
  const fileRef = useRef<HTMLInputElement>(null)

  const [selected, setSelected] = useState<Empresa | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<Empresa | null>(null)

  if (currentUser?.rol.toLowerCase() !== 'admin') {
    return <div style={{ color: '#fca5a5', padding: 40, textAlign: 'center' }}>No tienes acceso a esta sección</div>
  }

  const emptyEmpresa = (): Empresa => {
    const nc = nextConsecutivo('EMP-', empresas.map(e => e.codigo))
    return {
      id: '', codigo: nc.codigo, nombre: '', tipo_identificacion: 'NIT', nro_documento: '',
      correo: '', telefono: '', nro_movil: '', pagina_web: '', logo_url: '', representante_legal: '',
      direccion: '', ciudad: '', pais: 'Colombia', codigo_postal: '',
      situacion: 'Activo', seguimientos: [],
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (selected.id) {
      updateEmpresa(selected.id, selected)
    } else {
      addEmpresa({ ...selected, id: crypto.randomUUID() })
    }
    setIsForm(false); setSelected(null)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSelected({ ...selected, logo_url: ev.target?.result as string })
    }
    reader.readAsDataURL(file)
  }

  const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none' }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const labelStyle: React.CSSProperties = { color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }

  // ── VIEW DETAIL ──
  if (viewDetail) {
    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
            {viewDetail.logo_url ? (
              <img src={viewDetail.logo_url} alt="Logo" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', padding: 8 }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Sin logo</div>
            )}
            <div>
              <h2 style={{ color: '#ffffff', fontSize: 20, fontWeight: 700 }}>{viewDetail.nombre}</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{viewDetail.codigo}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { label: 'Código', value: viewDetail.codigo },
              { label: 'Tipo Identificación', value: viewDetail.tipo_identificacion },
              { label: 'Nro. Documento', value: viewDetail.nro_documento },
              { label: 'Correo', value: viewDetail.correo },
              { label: 'Teléfono', value: viewDetail.telefono },
              { label: 'Nro Móvil', value: viewDetail.nro_movil },
              { label: 'Página Web', value: viewDetail.pagina_web },
              { label: 'Representante Legal', value: viewDetail.representante_legal },
            ].map(f => (
              <div key={f.label}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Ubicación */}
          <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ color: '#ffffff', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ubicación</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Dirección', value: viewDetail.direccion },
                { label: 'Ciudad', value: viewDetail.ciudad },
                { label: 'País', value: viewDetail.pais },
                { label: 'Código Postal', value: viewDetail.codigo_postal },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                  <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => { setSelected(viewDetail); setIsForm(true); setViewDetail(null) }} style={{ ...btnStyle, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a', marginTop: 16 }}>Editar</button>
          <SeguimientoPanel
            seguimientos={viewDetail.seguimientos || []}
            usuario={`${currentUser?.nombre} ${currentUser?.apellido}`}
            situacionActual={viewDetail.situacion || 'Activo'}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updateEmpresa(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
          <DocumentosPanel modulo="datos-empresa" registroId={viewDetail.id} />
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
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nueva'} Empresa</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Código</label>
              <input value={selected.codigo} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Nombre Empresa *</label>
              <input value={selected.nombre} onChange={e => setSelected({ ...selected, nombre: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tipo Identificación</label>
              <select value={selected.tipo_identificacion} onChange={e => setSelected({ ...selected, tipo_identificacion: e.target.value })} style={inputStyle}>
                {refOptions('tipo_identificacion').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nro. Documento *</label>
              <input value={selected.nro_documento} onChange={e => setSelected({ ...selected, nro_documento: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Correo Empresa</label>
              <input type="email" value={selected.correo} onChange={e => setSelected({ ...selected, correo: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono Empresa</label>
              <input value={selected.telefono} onChange={e => setSelected({ ...selected, telefono: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nro Móvil</label>
              <input value={selected.nro_movil} onChange={e => setSelected({ ...selected, nro_movil: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Página Web</label>
              <input value={selected.pagina_web} onChange={e => setSelected({ ...selected, pagina_web: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Representante Legal</label>
              <input value={selected.representante_legal} onChange={e => setSelected({ ...selected, representante_legal: e.target.value })} style={inputStyle} />
            </div>

            {/* Logo */}
            <div style={{ gridColumn: 'span 3' }}>
              <label style={labelStyle}>Logo de la Empresa</label>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {selected.logo_url ? (
                  <img src={selected.logo_url} alt="Logo" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'contain', background: 'rgba(255,255,255,0.1)', padding: 8 }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Sin logo</div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  <button type="button" onClick={() => fileRef.current?.click()} style={{ ...btnStyle, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>Subir Logo</button>
                  {selected.logo_url && <button type="button" onClick={() => setSelected({ ...selected, logo_url: '' })} style={{ ...btnStyle, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Quitar</button>}
                </div>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div style={{ marginTop: 20, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
            <h3 style={{ color: '#ffffff', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Ubicación</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={labelStyle}>Dirección</label>
                <input value={selected.direccion} onChange={e => setSelected({ ...selected, direccion: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ciudad</label>
                <select value={selected.ciudad} onChange={e => setSelected({ ...selected, ciudad: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {refOptions('ciudad').map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>País</label>
                <select value={selected.pais} onChange={e => setSelected({ ...selected, pais: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {refOptions('pais').map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Código Postal</label>
                <input value={selected.codigo_postal} onChange={e => setSelected({ ...selected, codigo_postal: e.target.value })} style={inputStyle} />
              </div>
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

  // ── MAIN VIEW ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Datos Empresa</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Información de las empresas del sistema</p>
        </div>
        <button onClick={() => { setSelected(emptyEmpresa()); setIsForm(true) }} style={{ ...btnStyle, background: '#0f1b3d', color: '#ffffff' }}>+ Nueva Empresa</button>
      </div>

      <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Logo', 'Código', 'Nombre', 'Documento', 'Correo', 'Teléfono', 'Rep. Legal', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '12px 14px', background: '#1e3a5f', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empresas.map((emp, i) => (
              <tr key={emp.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {emp.logo_url ? (
                    <img src={emp.logo_url} alt="Logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', background: 'rgba(255,255,255,0.1)' }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>—</div>
                  )}
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#4ade80', fontSize: 13, fontFamily: 'monospace' }}>{emp.codigo}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13, fontWeight: 600 }}>{emp.nombre}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{emp.tipo_identificacion} {emp.nro_documento}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{emp.correo}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{emp.telefono}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{emp.representante_legal}</td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setViewDetail(emp)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                    <button onClick={() => { setSelected(emp); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>Editar</button>
                    <button onClick={() => { if (confirm(`¿Eliminar "${emp.nombre}"?`)) deleteEmpresa(emp.id) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay empresas registradas</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
