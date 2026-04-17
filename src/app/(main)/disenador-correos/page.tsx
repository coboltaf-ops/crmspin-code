'use client'
import { useState, useRef } from 'react'
import { useDirenadorStore, PlantillaCorreo } from '@/features/disenador-correos/store/disenador-store'
import { useEmpresaStore } from '@/features/empresa/store/empresa-store'

function todayCO() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) }

const categorias = ['Comercial', 'Marketing', 'Servicio', 'Cobranza', 'Informativo', 'Otro']

const bloques = [
  { id: 'header-azul', label: 'Encabezado Azul', html: `<div style="background:#1e3a8a;padding:28px;border-radius:12px 12px 0 0;text-align:center">\n  <h1 style="color:#fff;margin:0;font-size:24px">Titulo del Correo</h1>\n  <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px">Subtitulo descriptivo</p>\n</div>` },
  { id: 'header-rojo', label: 'Encabezado Rojo', html: `<div style="background:#b91c1c;padding:24px;border-radius:12px 12px 0 0;text-align:center">\n  <h1 style="color:#fff;margin:0;font-size:22px">Titulo Importante</h1>\n</div>` },
  { id: 'header-gradiente', label: 'Encabezado Gradiente', html: `<div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:32px;border-radius:12px 12px 0 0;text-align:center">\n  <h1 style="color:#fff;margin:0;font-size:26px">Titulo Destacado</h1>\n</div>` },
  { id: 'cuerpo', label: 'Cuerpo del Email', html: `<div style="padding:28px;border:1px solid #e5e7eb;background:#ffffff">\n  <p style="font-size:15px;color:#1e293b">Hola <strong>{{nombre}}</strong>,</p>\n  <p style="font-size:14px;color:#475569;line-height:1.7">Escriba aqui el contenido del correo...</p>\n</div>` },
  { id: 'boton', label: 'Boton de Accion', html: `<div style="text-align:center;margin:24px 0">\n  <span style="display:inline-block;background:#1e3a8a;color:#fff;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px">Texto del Boton</span>\n</div>` },
  { id: 'destacado', label: 'Caja Destacada', html: `<div style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0">\n  <p style="font-size:16px;color:#1e3a8a;font-weight:700;margin:0">Informacion Destacada</p>\n  <p style="font-size:14px;color:#64748b;margin:8px 0 0">Detalle adicional aqui</p>\n</div>` },
  { id: 'separador', label: 'Separador', html: `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />` },
  { id: 'firma', label: 'Firma / Cierre', html: `<p style="font-size:14px;color:#475569;margin-top:24px">Cordialmente,<br><strong>{{empresa}}</strong></p>` },
  { id: 'footer', label: 'Pie de Pagina', html: `<p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">{{empresa}} - Todos los derechos reservados</p>` },
  { id: 'imagen', label: 'Imagen', html: `<div style="text-align:center;margin:20px 0">\n  <img src="" alt="Imagen" style="max-width:100%;height:auto;border-radius:8px" />\n</div>` },
]

type Vista = 'lista' | 'editor'

export default function DisenadorCorreosPage() {
  const { plantillas, addPlantilla, updatePlantilla, deletePlantilla, duplicarPlantilla } = useDirenadorStore()
  const empresas = useEmpresaStore(s => s.empresas)
  const empresaNombre = empresas?.[0]?.nombre || 'CRM SPIN'

  const [vista, setVista] = useState<Vista>('lista')
  const [editing, setEditing] = useState<PlantillaCorreo | null>(null)
  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Styles
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', width: '100%' }
  const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, display: 'block' }
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.1)' }

  const filtered = plantillas.filter(p => {
    if (filtroCategoria && p.categoria !== filtroCategoria) return false
    if (search) {
      const s = search.toLowerCase()
      return p.nombre.toLowerCase().includes(s) || p.asunto.toLowerCase().includes(s) || p.categoria.toLowerCase().includes(s)
    }
    return true
  }).sort((a, b) => {
    if (a.favorito && !b.favorito) return -1
    if (!a.favorito && b.favorito) return 1
    return b.fecha_modificacion.localeCompare(a.fecha_modificacion)
  })

  const abrirNueva = () => {
    setEditing({
      id: '', nombre: '', categoria: 'Comercial', asunto: '', contenido: '',
      fecha_creacion: todayCO(), fecha_modificacion: todayCO(), favorito: false,
    })
    setVista('editor')
  }

  const abrirEditar = (p: PlantillaCorreo) => {
    setEditing({ ...p })
    setVista('editor')
  }

  const guardar = () => {
    if (!editing) return
    if (!editing.nombre.trim() || !editing.asunto.trim()) { alert('Nombre y Asunto son obligatorios'); return }
    if (editing.id) {
      updatePlantilla(editing.id, editing)
    } else {
      addPlantilla({ ...editing, id: crypto.randomUUID() })
    }
    setEditing(null)
    setVista('lista')
  }

  const insertarBloque = (html: string) => {
    if (!editing) return
    setEditing({ ...editing, contenido: editing.contenido + '\n' + html })
  }

  const subirImagen = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('modulo', 'disenador-correos')
      fd.append('registroId', editing?.id || 'new')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok && editing) {
        const tag = `<div style="text-align:center;margin:20px 0">\n  <img src="${data.url}" alt="${data.nombre}" style="max-width:100%;height:auto;border-radius:8px" />\n</div>`
        setEditing({ ...editing, contenido: editing.contenido + '\n' + tag })
      }
    } catch { /* silent */ }
    finally { setUploading(false) }
  }

  // ═══════════ EDITOR ═══════════
  if (vista === 'editor' && editing) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => { setEditing(null); setVista('lista') }} style={{ ...btnStyle, background: '#000', color: '#fff', border: '1px solid #333' }}>← Volver</button>
          <button onClick={guardar} style={{ ...btnStyle, background: '#22c55e', color: '#fff', border: '1px solid #16a34a' }}>Guardar Plantilla</button>
        </div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 20 }}>{editing.id ? 'Editar' : 'Nueva'} Plantilla de Correo</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 1fr', gap: 16 }}>
          {/* Columna 1: Bloques */}
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Bloques</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 12 }}>Haga clic para insertar en el HTML</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bloques.map(b => (
                <button key={b.id} onClick={() => insertarBloque(b.html)}
                  style={{ ...btnStyle, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', textAlign: 'left', padding: '10px 12px', fontSize: 12 }}>
                  {b.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) subirImagen(f); e.target.value = '' }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ ...btnStyle, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', width: '100%', fontSize: 12, opacity: uploading ? 0.5 : 1 }}>
                {uploading ? 'Subiendo...' : 'Subir Imagen'}
              </button>
            </div>
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Variables disponibles:</p>
              <p style={{ color: '#60a5fa', fontSize: 11, marginTop: 4 }}>{'{{nombre}}'} - Destinatario</p>
              <p style={{ color: '#60a5fa', fontSize: 11 }}>{'{{empresa}}'} - Su empresa</p>
            </div>
          </div>

          {/* Columna 2: Datos + Editor HTML */}
          <div style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input value={editing.nombre} onChange={e => setEditing({ ...editing, nombre: e.target.value })} placeholder="Ej: Bienvenida Premium" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Categoria</label>
                <select value={editing.categoria} onChange={e => setEditing({ ...editing, categoria: e.target.value })} style={inputStyle}>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Asunto del Correo *</label>
                <input value={editing.asunto} onChange={e => setEditing({ ...editing, asunto: e.target.value })} placeholder="Ej: Bienvenido a {{empresa}}" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Contenido HTML</label>
              <textarea value={editing.contenido} onChange={e => setEditing({ ...editing, contenido: e.target.value })}
                style={{ ...inputStyle, minHeight: 420, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}
                placeholder="Escriba o inserte bloques HTML..." />
            </div>
          </div>

          {/* Columna 3: Vista previa */}
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Vista Previa</h3>
            <div style={{ background: '#ffffff', borderRadius: 8, padding: 0, maxHeight: 520, overflow: 'auto' }}>
              {editing.contenido ? (
                <div dangerouslySetInnerHTML={{ __html: editing.contenido.replace(/\{\{nombre\}\}/g, 'Juan Perez').replace(/\{\{empresa\}\}/g, empresaNombre) }} />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>📧</p>
                  Inserte bloques o escriba HTML para ver la vista previa
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════ LISTA ═══════════
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎨</div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Disenador de Correos</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Cree y guarde plantillas de email reutilizables</p>
          </div>
        </div>
        <button onClick={abrirNueva} style={{ ...btnStyle, background: '#22c55e', color: '#fff', border: '1px solid #16a34a' }}>
          + Nueva Plantilla
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: plantillas.length, color: '#3b82f6' },
          { label: 'Favoritas', value: plantillas.filter(p => p.favorito).length, color: '#eab308' },
          { label: 'Marketing', value: plantillas.filter(p => p.categoria === 'Marketing').length, color: '#a78bfa' },
          { label: 'Comercial', value: plantillas.filter(p => p.categoria === 'Comercial').length, color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar plantilla..." style={{ ...inputStyle, flex: 1, maxWidth: 350 }} />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">Todas las categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid de plantillas */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🎨</p>
          <p style={{ fontSize: 15 }}>No hay plantillas</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Cree su primera plantilla de correo</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ ...cardStyle, position: 'relative', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onClick={() => abrirEditar(p)}>
              {/* Favorito */}
              <button onClick={e => { e.stopPropagation(); updatePlantilla(p.id, { favorito: !p.favorito }) }}
                style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: p.favorito ? 1 : 0.3 }}>
                {p.favorito ? '⭐' : '☆'}
              </button>
              {/* Preview mini */}
              <div style={{ background: '#fff', borderRadius: 6, height: 120, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '285%', height: '285%', pointerEvents: 'none' }}
                  dangerouslySetInnerHTML={{ __html: p.contenido.replace(/\{\{nombre\}\}/g, 'Juan').replace(/\{\{empresa\}\}/g, empresaNombre) }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 4px', paddingRight: 30 }}>{p.nombre}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{p.asunto}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>{p.categoria}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{p.fecha_modificacion}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={e => { e.stopPropagation(); abrirEditar(p) }}
                  style={{ ...btnStyle, flex: 1, padding: '6px 10px', fontSize: 11, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>Editar</button>
                <button onClick={e => { e.stopPropagation(); duplicarPlantilla(p.id) }}
                  style={{ ...btnStyle, padding: '6px 10px', fontSize: 11, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>Duplicar</button>
                <button onClick={e => { e.stopPropagation(); if (confirm('Eliminar plantilla?')) deletePlantilla(p.id) }}
                  style={{ ...btnStyle, padding: '6px 10px', fontSize: 11, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
