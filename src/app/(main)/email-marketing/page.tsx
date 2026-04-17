'use client'
import { useState, useMemo, useRef } from 'react'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { useEmailMarketingStore, Campana, Destinatario, Plantilla, ImagenEmail } from '@/features/email-marketing/store/email-marketing-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useProspectosStore } from '@/features/prospectos/store/prospectos-store'
import { useEmpresaStore } from '@/features/empresa/store/empresa-store'
import { useDirenadorStore } from '@/features/disenador-correos/store/disenador-store'

function todayCO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}
function uid() { return crypto.randomUUID() }
function nextCod(campanas: Campana[]) {
  const n = campanas.length + 1
  return `MKT-${String(n).padStart(3, '0')}`
}

type Vista = 'lista' | 'nueva' | 'editar' | 'detalle' | 'plantillas' | 'editarPlantilla'

export default function EmailMarketingPage() {
  const user = useCurrentUserStore(s => s.user)
  const { campanas, plantillas, addCampana, updateCampana, deleteCampana, addPlantilla, updatePlantilla, deletePlantilla } = useEmailMarketingStore()
  const clientes = useClientesStore(s => s.clientes)
  const contactos = useContactosStore(s => s.contactos)
  const prospectos = useProspectosStore(s => s.prospectos)
  const empresas = useEmpresaStore(s => s.empresas)
  const plantillasDisenador = useDirenadorStore(s => s.plantillas)

  const [vista, setVista] = useState<Vista>('lista')
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [selected, setSelected] = useState<Campana | null>(null)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form campana
  const [formNombre, setFormNombre] = useState('')
  const [formAsunto, setFormAsunto] = useState('')
  const [formContenido, setFormContenido] = useState('')
  const [formPlantilla, setFormPlantilla] = useState('')
  const [formImagenes, setFormImagenes] = useState<ImagenEmail[]>([])
  const [formDestinatarios, setFormDestinatarios] = useState<Destinatario[]>([])
  const [formManualEmail, setFormManualEmail] = useState('')
  const [formManualNombre, setFormManualNombre] = useState('')
  const [tabDest, setTabDest] = useState<'clientes' | 'contactos' | 'prospectos' | 'manual'>('clientes')
  const [searchDest, setSearchDest] = useState('')
  const formFileRef = useRef<HTMLInputElement>(null)

  // Form plantilla
  const [tplNombre, setTplNombre] = useState('')
  const [tplAsunto, setTplAsunto] = useState('')
  const [tplContenido, setTplContenido] = useState('')
  const [tplImagenes, setTplImagenes] = useState<ImagenEmail[]>([])
  const [editingTpl, setEditingTpl] = useState<Plantilla | null>(null)
  const tplFileRef = useRef<HTMLInputElement>(null)

  const empresaNombre = empresas?.[0]?.nombre || 'CRM SPIN'

  if (!user) return null

  // Styles
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', width: '100%' }
  const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, display: 'block' }
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.1)' }

  const estadoBadge = (estado: string): React.CSSProperties => {
    const colors: Record<string, { bg: string; color: string; border: string }> = {
      'Borrador': { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af', border: 'rgba(156,163,175,0.3)' },
      'Enviando': { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
      'Enviada': { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
      'Error Parcial': { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    }
    const c = colors[estado] || colors['Borrador']
    return { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}` }
  }

  // ── Upload de imagen ──
  const subirImagen = async (file: File, target: 'campana' | 'plantilla') => {
    if (!file.type.startsWith('image/')) { alert('Solo se permiten imagenes'); return }
    if (file.size > 10 * 1024 * 1024) { alert('La imagen no puede superar 10 MB'); return }

    setUploading(true)
    try {
      const registroId = target === 'plantilla' ? (editingTpl?.id || 'new-tpl') : 'campanas'
      const fd = new FormData()
      fd.append('file', file)
      fd.append('modulo', 'email-marketing')
      fd.append('registroId', registroId)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Error al subir'); return }

      const nuevaImg: ImagenEmail = {
        cid: `img-${Date.now()}`,
        url: data.url,
        filename: data.nombre || file.name,
      }

      if (target === 'plantilla') {
        setTplImagenes(prev => [...prev, nuevaImg])
      } else {
        setFormImagenes(prev => [...prev, nuevaImg])
      }
    } catch (err) {
      alert('Error al subir imagen: ' + String(err))
    } finally {
      setUploading(false)
    }
  }

  const insertarImgEnHTML = (img: ImagenEmail, target: 'campana' | 'plantilla') => {
    const tag = `<img src="${img.url}" alt="${img.filename}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0" />`
    if (target === 'plantilla') {
      setTplContenido(prev => prev + '\n' + tag)
    } else {
      setFormContenido(prev => prev + '\n' + tag)
    }
  }

  const eliminarImg = (cid: string, target: 'campana' | 'plantilla') => {
    if (target === 'plantilla') {
      const img = tplImagenes.find(i => i.cid === cid)
      if (img) {
        setTplContenido(prev => prev.replace(new RegExp(`<img[^>]*src=["']${img.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*/?>`, 'g'), ''))
        setTplImagenes(prev => prev.filter(i => i.cid !== cid))
      }
    } else {
      const img = formImagenes.find(i => i.cid === cid)
      if (img) {
        setFormContenido(prev => prev.replace(new RegExp(`<img[^>]*src=["']${img.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*/?>`, 'g'), ''))
        setFormImagenes(prev => prev.filter(i => i.cid !== cid))
      }
    }
  }

  // Componente reutilizable de galeria de imagenes
  const ImagenesPanel = ({ imagenes, target, fileRef }: { imagenes: ImagenEmail[]; target: 'campana' | 'plantilla'; fileRef: React.RefObject<HTMLInputElement | null> }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>Imagenes y Logos</label>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) subirImagen(f, target); e.target.value = '' }} />
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        style={{ ...btnStyle, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', marginBottom: 10, opacity: uploading ? 0.5 : 1 }}>
        {uploading ? 'Subiendo...' : '+ Subir Imagen / Logo'}
      </button>
      {imagenes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {imagenes.map(img => (
            <div key={img.cid} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <img src={img.url} alt={img.filename} style={{ width: '100%', height: 80, objectFit: 'cover' }} />
              <div style={{ padding: '6px 8px' }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.filename}</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => insertarImgEnHTML(img, target)}
                    style={{ ...btnStyle, padding: '3px 8px', fontSize: 10, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', flex: 1 }}>
                    Insertar
                  </button>
                  <button onClick={() => eliminarImg(img.cid, target)}
                    style={{ ...btnStyle, padding: '3px 8px', fontSize: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {imagenes.length === 0 && (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Suba fotos o logos para insertarlos en el email</p>
      )}
    </div>
  )

  // Filtros lista
  const filtered = campanas.filter(c => {
    if (filtroEstado && c.estado !== filtroEstado) return false
    if (search) {
      const s = search.toLowerCase()
      return c.nombre.toLowerCase().includes(s) || c.codigo.toLowerCase().includes(s) || c.asunto.toLowerCase().includes(s)
    }
    return true
  }).sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))

  // Destinatarios disponibles
  const clientesDisp = clientes.filter(c => c.situacion === 'Activo' && c.email).map(c => ({ email: c.email, nombre: c.razon_social || c.nombre_comercial, origen: 'clientes' as const, origen_id: c.id }))
  const contactosDisp = contactos.filter(c => c.situacion === 'Activo' && c.email).map(c => ({ email: c.email, nombre: `${c.nombre} ${c.apellido}`, origen: 'contactos' as const, origen_id: c.id }))
  const prospectosDisp = prospectos.filter(c => c.situacion !== 'Descartado' && c.correo).map(c => ({ email: c.correo, nombre: `${c.nombre} ${c.apellido}`, origen: 'prospectos' as const, origen_id: c.id }))

  const destDisponibles = tabDest === 'clientes' ? clientesDisp : tabDest === 'contactos' ? contactosDisp : tabDest === 'prospectos' ? prospectosDisp : []
  const destFiltrados = searchDest ? destDisponibles.filter(d => d.nombre.toLowerCase().includes(searchDest.toLowerCase()) || d.email.toLowerCase().includes(searchDest.toLowerCase())) : destDisponibles

  const toggleDestinatario = (d: Destinatario) => {
    const exists = formDestinatarios.find(fd => fd.email === d.email)
    if (exists) setFormDestinatarios(formDestinatarios.filter(fd => fd.email !== d.email))
    else setFormDestinatarios([...formDestinatarios, d])
  }

  const addManual = () => {
    if (!formManualEmail || !formManualNombre) return
    if (formDestinatarios.find(d => d.email === formManualEmail)) return
    setFormDestinatarios([...formDestinatarios, { email: formManualEmail, nombre: formManualNombre, origen: 'manual' }])
    setFormManualEmail('')
    setFormManualNombre('')
  }

  const selectAll = () => {
    const nuevos = destFiltrados.filter(d => !formDestinatarios.find(fd => fd.email === d.email))
    setFormDestinatarios([...formDestinatarios, ...nuevos])
  }

  const resetForm = () => {
    setFormNombre(''); setFormAsunto(''); setFormContenido(''); setFormPlantilla(''); setFormDestinatarios([])
    setFormManualEmail(''); setFormManualNombre(''); setSearchDest(''); setTabDest('clientes'); setFormImagenes([])
  }

  const aplicarPlantilla = (tplId: string) => {
    setFormPlantilla(tplId)
    // Buscar en plantillas de Email Marketing
    const tpl = plantillas.find(p => p.id === tplId)
    if (tpl) {
      setFormAsunto(tpl.asunto)
      setFormContenido(tpl.contenido)
      setFormImagenes(tpl.imagenes || [])
      return
    }
    // Buscar en plantillas del Diseñador de Correos
    const tplDis = plantillasDisenador.find(p => p.id === tplId)
    if (tplDis) {
      setFormAsunto(tplDis.asunto)
      setFormContenido(tplDis.contenido)
      setFormImagenes([])
    }
  }

  const guardarCampana = () => {
    if (!formNombre || !formAsunto || !formContenido || formDestinatarios.length === 0) {
      alert('Complete todos los campos y agregue al menos un destinatario')
      return
    }
    if (vista === 'editar' && selected) {
      updateCampana(selected.id, {
        nombre: formNombre,
        asunto: formAsunto,
        contenido: formContenido,
        imagenes: formImagenes,
        plantilla_id: formPlantilla || undefined,
        destinatarios: formDestinatarios,
      })
    } else {
      const nueva: Campana = {
        id: uid(),
        codigo: nextCod(campanas),
        nombre: formNombre,
        asunto: formAsunto,
        contenido: formContenido,
        imagenes: formImagenes,
        plantilla_id: formPlantilla || undefined,
        destinatarios: formDestinatarios,
        estado: 'Borrador',
        total_enviados: 0,
        total_errores: 0,
        fecha_creacion: todayCO(),
        responsable: `${user.nombre} ${user.apellido}`,
      }
      addCampana(nueva)
    }
    resetForm()
    setVista('lista')
  }

  const enviarCampana = async (camp: Campana) => {
    if (camp.destinatarios.length === 0) { alert('No hay destinatarios'); return }
    if (!confirm(`Enviar campana "${camp.nombre}" a ${camp.destinatarios.length} destinatario(s)?`)) return

    setSending(true)
    updateCampana(camp.id, { estado: 'Enviando' })

    try {
      const res = await fetch('/api/send-email-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinatarios: camp.destinatarios,
          asunto: camp.asunto,
          contenido: camp.contenido,
          imagenes: camp.imagenes || [],
          campana_codigo: camp.codigo,
          empresa_nombre: empresaNombre,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        updateCampana(camp.id, {
          estado: data.errores > 0 ? 'Error Parcial' : 'Enviada',
          total_enviados: data.enviados,
          total_errores: data.errores,
          fecha_envio: todayCO(),
        })
        alert(`Campana enviada: ${data.enviados} exitosos, ${data.errores} errores`)
      } else {
        updateCampana(camp.id, { estado: 'Error Parcial' })
        alert('Error al enviar: ' + (data.error || 'Error desconocido'))
      }
    } catch (err) {
      updateCampana(camp.id, { estado: 'Error Parcial' })
      alert('Error de conexion: ' + String(err))
    } finally {
      setSending(false)
      const updated = useEmailMarketingStore.getState().campanas.find(c => c.id === camp.id)
      if (updated) setSelected(updated)
    }
  }

  const duplicarCampana = (camp: Campana) => {
    const copia: Campana = {
      ...camp,
      id: uid(),
      codigo: nextCod(campanas),
      nombre: `${camp.nombre} (copia)`,
      estado: 'Borrador',
      total_enviados: 0,
      total_errores: 0,
      fecha_creacion: todayCO(),
      fecha_envio: undefined,
      responsable: `${user.nombre} ${user.apellido}`,
    }
    addCampana(copia)
    alert('Campana duplicada como borrador')
  }

  const abrirEditar = (camp: Campana) => {
    setFormNombre(camp.nombre)
    setFormAsunto(camp.asunto)
    setFormContenido(camp.contenido)
    setFormImagenes(camp.imagenes || [])
    setFormPlantilla(camp.plantilla_id || '')
    setFormDestinatarios(camp.destinatarios)
    setSelected(camp)
    setVista('editar')
  }

  const guardarPlantilla = () => {
    if (!tplNombre || !tplAsunto || !tplContenido) { alert('Complete todos los campos de la plantilla'); return }
    if (editingTpl) {
      updatePlantilla(editingTpl.id, { nombre: tplNombre, asunto: tplAsunto, contenido: tplContenido, imagenes: tplImagenes })
    } else {
      addPlantilla({ id: uid(), nombre: tplNombre, asunto: tplAsunto, contenido: tplContenido, imagenes: tplImagenes, fecha_creacion: todayCO() })
    }
    setTplNombre(''); setTplAsunto(''); setTplContenido(''); setTplImagenes([]); setEditingTpl(null)
    setVista('plantillas')
  }

  // Stats
  const stats = useMemo(() => ({
    total: campanas.length,
    borradores: campanas.filter(c => c.estado === 'Borrador').length,
    enviadas: campanas.filter(c => c.estado === 'Enviada').length,
    totalEnviados: campanas.reduce((s, c) => s + c.total_enviados, 0),
  }), [campanas])

  // ═══════════ VISTA PLANTILLAS ═══════════
  if (vista === 'plantillas') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setVista('lista')} style={{ ...btnStyle, background: '#000', color: '#fff', border: '1px solid #333' }}>← Volver</button>
          <button onClick={() => { setTplNombre(''); setTplAsunto(''); setTplContenido(''); setTplImagenes([]); setEditingTpl(null); setVista('editarPlantilla') }}
            style={{ ...btnStyle, background: '#1e3a8a', color: '#fff', border: '1px solid #2563eb' }}>+ Nueva Plantilla</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📝</div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Plantillas de Email</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>{plantillas.length} plantilla(s)</p>
          </div>
        </div>
        {plantillas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📝</p>
            <p>No hay plantillas. Cree una para empezar.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {plantillas.map(tpl => (
              <div key={tpl.id} style={cardStyle}>
                <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>{tpl.nombre}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>Asunto: {tpl.asunto}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 4 }}>Creada: {tpl.fecha_creacion}</p>
                {(tpl.imagenes?.length || 0) > 0 && (
                  <p style={{ color: '#a78bfa', fontSize: 11, marginBottom: 8 }}>{tpl.imagenes.length} imagen(es)</p>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setTplNombre(tpl.nombre); setTplAsunto(tpl.asunto); setTplContenido(tpl.contenido); setTplImagenes(tpl.imagenes || []); setEditingTpl(tpl); setVista('editarPlantilla') }}
                    style={{ ...btnStyle, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '5px 12px', fontSize: 12 }}>Editar</button>
                  <button onClick={() => { if (confirm('Eliminar plantilla?')) deletePlantilla(tpl.id) }}
                    style={{ ...btnStyle, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '5px 12px', fontSize: 12 }}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ═══════════ EDITAR PLANTILLA ═══════════
  if (vista === 'editarPlantilla') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setVista('plantillas')} style={{ ...btnStyle, background: '#000', color: '#fff', border: '1px solid #333' }}>← Volver</button>
        </div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 20 }}>{editingTpl ? 'Editar Plantilla' : 'Nueva Plantilla'}</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={cardStyle}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Nombre</label>
              <input value={tplNombre} onChange={e => setTplNombre(e.target.value)} style={inputStyle} placeholder="Ej: Bienvenida, Promocion..." />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Asunto del correo</label>
              <input value={tplAsunto} onChange={e => setTplAsunto(e.target.value)} style={inputStyle} placeholder="Ej: Bienvenido a {{empresa}}" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Contenido HTML</label>
              <textarea value={tplContenido} onChange={e => setTplContenido(e.target.value)}
                style={{ ...inputStyle, minHeight: 250, fontFamily: 'monospace', fontSize: 12 }}
                placeholder="Escriba el HTML del email. Use {{nombre}} y {{empresa}} como variables." />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 16 }}>Variables: {'{{nombre}}'} = nombre destinatario, {'{{empresa}}'} = nombre empresa</p>
            <button onClick={guardarPlantilla} style={{ ...btnStyle, background: '#22c55e', color: '#fff', border: '1px solid #16a34a' }}>
              {editingTpl ? 'Actualizar Plantilla' : 'Guardar Plantilla'}
            </button>
          </div>
          <div>
            <div style={cardStyle}>
              <ImagenesPanel imagenes={tplImagenes} target="plantilla" fileRef={tplFileRef} />
            </div>
            {tplContenido && (
              <div style={{ ...cardStyle, marginTop: 16 }}>
                <label style={labelStyle}>Vista previa</label>
                <div style={{ background: '#fff', borderRadius: 8, padding: 16, maxHeight: 400, overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: tplContenido.replace(/\{\{nombre\}\}/g, 'Juan Perez').replace(/\{\{empresa\}\}/g, empresaNombre) }} />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════ DETALLE CAMPANA ═══════════
  if (vista === 'detalle' && selected) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => { setSelected(null); setVista('lista') }} style={{ ...btnStyle, background: '#000', color: '#fff', border: '1px solid #333' }}>← Volver</button>
          {selected.estado === 'Borrador' && (
            <>
              <button onClick={() => abrirEditar(selected)} style={{ ...btnStyle, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>Editar</button>
              <button onClick={() => enviarCampana(selected)} disabled={sending}
                style={{ ...btnStyle, background: '#22c55e', color: '#fff', border: '1px solid #16a34a', opacity: sending ? 0.5 : 1 }}>
                {sending ? 'Enviando...' : 'Enviar Campana'}
              </button>
            </>
          )}
          <button onClick={() => duplicarCampana(selected)} style={{ ...btnStyle, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>Duplicar</button>
          {selected.estado === 'Borrador' && (
            <button onClick={() => { if (confirm('Eliminar campana?')) { deleteCampana(selected.id); setSelected(null); setVista('lista') } }}
              style={{ ...btnStyle, background: '#dc2626', color: '#fff', border: '1px solid #ef4444' }}>Eliminar</button>
          )}
        </div>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📨</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{selected.nombre}</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>{selected.codigo}</p>
            </div>
            <span style={estadoBadge(selected.estado)}>{selected.estado}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Asunto', value: selected.asunto },
              { label: 'Responsable', value: selected.responsable },
              { label: 'Fecha Creacion', value: selected.fecha_creacion },
              { label: 'Fecha Envio', value: selected.fecha_envio || '—' },
              { label: 'Destinatarios', value: String(selected.destinatarios.length) },
              { label: 'Enviados / Errores', value: `${selected.total_enviados} / ${selected.total_errores}` },
            ].map(f => (
              <div key={f.label}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                <p style={{ color: '#fff', fontSize: 14 }}>{f.value}</p>
              </div>
            ))}
          </div>

          {/* Metricas visuales */}
          {selected.estado !== 'Borrador' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Enviados</p>
                <p style={{ color: '#22c55e', fontSize: 28, fontWeight: 800 }}>{selected.total_enviados}</p>
              </div>
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Errores</p>
                <p style={{ color: '#ef4444', fontSize: 28, fontWeight: 800 }}>{selected.total_errores}</p>
              </div>
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Tasa Exito</p>
                <p style={{ color: '#60a5fa', fontSize: 28, fontWeight: 800 }}>
                  {selected.destinatarios.length > 0 ? Math.round((selected.total_enviados / selected.destinatarios.length) * 100) : 0}%
                </p>
              </div>
            </div>
          )}

          {/* Imagenes de la campana */}
          {(selected.imagenes?.length || 0) > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Imagenes ({selected.imagenes.length})</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {selected.imagenes.map(img => (
                  <img key={img.cid} src={img.url} alt={img.filename} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>
          )}

          {/* Lista destinatarios */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Destinatarios ({selected.destinatarios.length})</h3>
            <div style={{ maxHeight: 200, overflow: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 8 }}>
              {selected.destinatarios.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#fff', fontSize: 13 }}>{d.nombre}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{d.email}</span>
                  <span style={{ ...estadoBadge(d.origen === 'manual' ? 'Borrador' : 'Enviada'), fontSize: 10, padding: '2px 8px' }}>{d.origen}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview email */}
          <div>
            <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Vista Previa del Email</h3>
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, maxHeight: 400, overflow: 'auto' }}
              dangerouslySetInnerHTML={{ __html: selected.contenido.replace(/\{\{nombre\}\}/g, 'Destinatario').replace(/\{\{empresa\}\}/g, empresaNombre) }} />
          </div>
        </div>
      </div>
    )
  }

  // ═══════════ NUEVA / EDITAR CAMPANA ═══════════
  if (vista === 'nueva' || vista === 'editar') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => { resetForm(); setVista('lista') }} style={{ ...btnStyle, background: '#000', color: '#fff', border: '1px solid #333' }}>← Cancelar</button>
        </div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 20 }}>{vista === 'editar' ? 'Editar Campana' : 'Nueva Campana'}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Columna izquierda: datos */}
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Datos de la Campana</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nombre de la campana *</label>
              <input value={formNombre} onChange={e => setFormNombre(e.target.value)} style={inputStyle} placeholder="Ej: Promocion Marzo 2026" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Plantilla (opcional)</label>
              <select value={formPlantilla} onChange={e => aplicarPlantilla(e.target.value)} style={inputStyle}>
                <option value="">Sin plantilla</option>
                {plantillas.length > 0 && <optgroup label="Email Marketing">
                  {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </optgroup>}
                {plantillasDisenador.length > 0 && <optgroup label="Diseñador de Correos">
                  {plantillasDisenador.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.categoria})</option>)}
                </optgroup>}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Asunto del correo *</label>
              <input value={formAsunto} onChange={e => setFormAsunto(e.target.value)} style={inputStyle} placeholder="Ej: Oferta especial para ti" />
            </div>

            {/* Imagenes */}
            <ImagenesPanel imagenes={formImagenes} target="campana" fileRef={formFileRef} />

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Contenido HTML *</label>
              <textarea value={formContenido} onChange={e => setFormContenido(e.target.value)}
                style={{ ...inputStyle, minHeight: 200, fontFamily: 'monospace', fontSize: 12 }}
                placeholder="HTML del email. Use {{nombre}} y {{empresa}}" />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Variables: {'{{nombre}}'}, {'{{empresa}}'}</p>

            {formContenido && (
              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Vista previa</label>
                <div style={{ background: '#fff', borderRadius: 8, padding: 12, maxHeight: 200, overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: formContenido.replace(/\{\{nombre\}\}/g, 'Juan Perez').replace(/\{\{empresa\}\}/g, empresaNombre) }} />
              </div>
            )}
          </div>

          {/* Columna derecha: destinatarios */}
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              Destinatarios ({formDestinatarios.length})
            </h3>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {(['clientes', 'contactos', 'prospectos', 'manual'] as const).map(tab => (
                <button key={tab} onClick={() => setTabDest(tab)}
                  style={{ ...btnStyle, padding: '6px 14px', fontSize: 12, background: tabDest === tab ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)', color: tabDest === tab ? '#60a5fa' : 'rgba(255,255,255,0.6)', border: `1px solid ${tabDest === tab ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                  {tab === 'clientes' ? 'Empresas' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {tabDest !== 'manual' ? (
              <>
                <input value={searchDest} onChange={e => setSearchDest(e.target.value)}
                  placeholder={`Buscar ${tabDest}...`} style={{ ...inputStyle, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <button onClick={selectAll} style={{ ...btnStyle, padding: '4px 10px', fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                    Seleccionar todos ({destFiltrados.length})
                  </button>
                </div>
                <div style={{ maxHeight: 220, overflow: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  {destFiltrados.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: 16, textAlign: 'center' }}>No hay {tabDest} con email</p>
                  ) : destFiltrados.map((d, i) => {
                    const checked = !!formDestinatarios.find(fd => fd.email === d.email)
                    return (
                      <div key={i} onClick={() => toggleDestinatario(d)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)', background: checked ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? '#22c55e' : 'rgba(255,255,255,0.3)'}`, background: checked ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0 }}>
                          {checked && '✓'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#fff', fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</p>
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>{d.email}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={formManualNombre} onChange={e => setFormManualNombre(e.target.value)} placeholder="Nombre" style={{ ...inputStyle, flex: 1 }} />
                  <input value={formManualEmail} onChange={e => setFormManualEmail(e.target.value)} placeholder="Email" style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={addManual} style={{ ...btnStyle, background: '#1e3a8a', color: '#fff', border: '1px solid #2563eb', flexShrink: 0 }}>+</button>
                </div>
              </div>
            )}

            {/* Lista de seleccionados */}
            {formDestinatarios.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={labelStyle}>Seleccionados ({formDestinatarios.length})</label>
                  <button onClick={() => setFormDestinatarios([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Limpiar todo</button>
                </div>
                <div style={{ maxHeight: 150, overflow: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                  {formDestinatarios.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#fff', fontSize: 12 }}>{d.nombre} — {d.email}</span>
                      <button onClick={() => setFormDestinatarios(formDestinatarios.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boton guardar */}
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button onClick={guardarCampana} style={{ ...btnStyle, background: '#22c55e', color: '#fff', border: '1px solid #16a34a', flex: 1 }}>
                {vista === 'editar' ? 'Actualizar Campana' : 'Guardar como Borrador'}
              </button>
            </div>
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
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📨</div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Email Marketing</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>Campanas de correo masivo</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setVista('plantillas')} style={{ ...btnStyle, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
            📝 Plantillas
          </button>
          <button onClick={() => { resetForm(); setVista('nueva') }} style={{ ...btnStyle, background: '#22c55e', color: '#fff', border: '1px solid #16a34a' }}>
            + Nueva Campana
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Campanas', value: stats.total, color: '#3b82f6' },
          { label: 'Borradores', value: stats.borradores, color: '#9ca3af' },
          { label: 'Enviadas', value: stats.enviadas, color: '#22c55e' },
          { label: 'Emails Enviados', value: stats.totalEnviados, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar campana..." style={{ ...inputStyle, flex: 1, minWidth: 250, width: 'auto' }} />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">Todos los estados</option>
          <option value="Borrador">Borrador</option>
          <option value="Enviada">Enviada</option>
          <option value="Enviando">Enviando</option>
          <option value="Error Parcial">Error Parcial</option>
        </select>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📨</p>
          <p style={{ fontSize: 15 }}>No hay campanas</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Cree una campana para enviar correos masivos a sus empresas, contactos y prospectos</p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.08)' }}>
                {['Codigo', 'Nombre', 'Asunto', 'Destinatarios', 'Enviados', 'Estado', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '10px 14px', color: '#60a5fa', fontSize: 13, fontWeight: 600 }}>{c.codigo}</td>
                  <td style={{ padding: '10px 14px', color: '#fff', fontSize: 13 }}>{c.nombre}</td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.asunto}</td>
                  <td style={{ padding: '10px 14px', color: '#fff', fontSize: 13, textAlign: 'center' }}>{c.destinatarios.length}</td>
                  <td style={{ padding: '10px 14px', color: '#22c55e', fontSize: 13, textAlign: 'center' }}>{c.total_enviados}</td>
                  <td style={{ padding: '10px 14px' }}><span style={estadoBadge(c.estado)}>{c.estado}</span></td>
                  <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{c.fecha_creacion}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setSelected(c); setVista('detalle') }}
                        style={{ ...btnStyle, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '5px 10px', fontSize: 12 }}>Ver</button>
                      {c.estado === 'Borrador' && (
                        <button onClick={() => enviarCampana(c)} disabled={sending}
                          style={{ ...btnStyle, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', padding: '5px 10px', fontSize: 12 }}>Enviar</button>
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
        Mostrando {filtered.length} de {campanas.length} campanas
      </p>
    </div>
  )
}
