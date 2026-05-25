'use client'
import { logAudit, computarDiff } from '@/shared/lib/audit'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProspectosStore, Prospecto } from '@/features/prospectos/store/prospectos-store'
import { useClientesStore, generarCodigoAcceso } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useOportunidadesStore } from '@/features/oportunidades/store/oportunidades-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { fDate, todayColombia } from '@/shared/lib/format-date'
import { nextConsecutivo } from '@/shared/lib/consecutivo'
import ReportPanel from '@/shared/components/report-panel'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import DocumentosPanel from '@/shared/components/documentos-panel'
import { useAsistenteStore } from '@/shared/stores/asistente-store'
import { Seguimiento } from '@/shared/types/seguimiento'

const today = todayColombia()

interface ProspectoExterno {
  id: string; nombre: string; apellido: string; empresa: string; correo: string
  nro_movil: string; descripcion_requerimiento: string; fecha_registro: string
  hora_registro: string; importado: boolean
}

const emptyProspecto = (codigo: string): Prospecto => ({
  id: '', codigo, nombre: '', apellido: '', empresa: '', correo: '', nro_movil: '',
  macro_sector: '', origen_prospecto: '', como_nos_conocio: '', productos_interes: [], objetivo_producto: '',
  tiene_proveedor: 'no', nombre_proveedor_actual: '', detalle_requerimiento: '', ciudad: '', pais: 'Colombia',
  situacion: 'Sin Contactar', fecha_registro: today, seguimientos: [],
})

export default function ProspectosPage() {
  const permisos = usePermisos('prospectos')
  const currentUser = useCurrentUserStore(s => s.user)
  const router = useRouter()
  const { prospectos, addProspecto, updateProspecto, deleteProspecto } = useProspectosStore()
  const { clientes, addCliente } = useClientesStore()
  const { contactos, addContacto } = useContactosStore()
  const { oportunidades, addOportunidad } = useOportunidadesStore()
  const refData = useReferenceStore(s => s.data)

  const [selected, setSelected] = useState<Prospecto | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<Prospecto | null>(null)
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')
  const [search, setSearch] = useState('')
  const { pendingSearch, pendingAction, clearPending } = useAsistenteStore()

  // ── Prospectos externos ──
  const [externas, setExternas] = useState<ProspectoExterno[]>([])
  const [showExternas, setShowExternas] = useState(false)

  const loadExternas = async () => {
    try {
      const res = await fetch('/api/prospectos-externo')
      const data = await res.json()
      const lista: ProspectoExterno[] = data.prospectos || []
      setExternas(lista)
      if (lista.length > 0) setShowExternas(true)
    } catch (err) {
      console.error('[prospectos] Error cargando externos:', err)
    }
  }

  useEffect(() => {
    if (pendingSearch) setSearch(pendingSearch)
    if (pendingAction === 'nuevo') { setSelected(emptyProspecto(nextConsecutivo('PRS-', prospectos.map(p => p.codigo)).codigo)); setIsForm(true) }
    if (pendingSearch || pendingAction) clearPending()
    loadExternas()
    const intervalId = setInterval(loadExternas, 15000)
    return () => clearInterval(intervalId)
  }, [])

  const importarProspecto = async (ext: ProspectoExterno) => {
    const codigo = nextConsecutivo('PRS-', prospectos.map(p => p.codigo)).codigo
    addProspecto({
      id: crypto.randomUUID(), codigo, nombre: ext.nombre, apellido: ext.apellido,
      empresa: ext.empresa, correo: ext.correo, nro_movil: ext.nro_movil,
      macro_sector: '', origen_prospecto: 'Formulario Web', como_nos_conocio: 'En Internet', productos_interes: [],
      objetivo_producto: '', tiene_proveedor: 'no', nombre_proveedor_actual: '', detalle_requerimiento: ext.descripcion_requerimiento,
      ciudad: '', pais: 'Colombia', situacion: 'Sin Contactar',
      fecha_registro: todayColombia(), seguimientos: [{
        id: crypto.randomUUID(), fecha: today, detalle: `Prospecto importado desde formulario web. Registrado el ${ext.fecha_registro} a las ${ext.hora_registro}.`,
        persona_actividad: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(), situacion: 'Sin Contactar', usuario: currentUser?.nombre || 'Sistema',
      }],
    })
    try { await fetch('/api/prospectos-externo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [ext.id] }) }) } catch { /* silent */ }
    setExternas(prev => prev.filter(e => e.id !== ext.id))
  }

  const importarTodas = async () => {
    for (const ext of externas) {
      const codigo = nextConsecutivo('PRS-', [...prospectos.map(p => p.codigo)]).codigo
      addProspecto({
        id: crypto.randomUUID(), codigo, nombre: ext.nombre, apellido: ext.apellido,
        empresa: ext.empresa, correo: ext.correo, nro_movil: ext.nro_movil,
        macro_sector: '', origen_prospecto: 'Formulario Web', como_nos_conocio: 'En Internet', productos_interes: [],
        objetivo_producto: '', tiene_proveedor: 'no', nombre_proveedor_actual: '', detalle_requerimiento: ext.descripcion_requerimiento,
        ciudad: '', pais: 'Colombia', situacion: 'Sin Contactar',
        fecha_registro: todayColombia(), seguimientos: [{
          id: crypto.randomUUID(), fecha: today, detalle: `Prospecto importado desde formulario web. Registrado el ${ext.fecha_registro} a las ${ext.hora_registro}.`,
          persona_actividad: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(), situacion: 'Sin Contactar', usuario: currentUser?.nombre || 'Sistema',
        }],
      })
    }
    try { await fetch('/api/prospectos-externo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: externas.map(e => e.id) }) }) } catch { /* silent */ }
    setExternas([])
    setShowExternas(false)
  }

  const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)

  const filtered = prospectos.filter(p => {
    const s = search.toLowerCase()
    return !s || p.nombre.toLowerCase().includes(s) || p.apellido.toLowerCase().includes(s) ||
      p.empresa.toLowerCase().includes(s) || p.codigo.toLowerCase().includes(s)
  })

  const auditParams = () => ({
    usuario: currentUser?.usuario || 'desconocido',
    usuario_nombre: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(),
    rol: currentUser?.rol || '',
    modulo: 'prospectos',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    if (selected.id) {
      const _anterior = prospectos.find(x => x.id === selected.id); updateProspecto(selected.id, selected); logAudit({ ...auditParams(), accion: "MODIFICAR", registro_codigo: selected.codigo, registro_nombre: `${selected.nombre} ${selected.apellido}`, detalle: computarDiff(_anterior as unknown as Record<string, unknown>, selected as unknown as Record<string, unknown>) })
    } else {
      addProspecto({ ...selected, id: crypto.randomUUID() })
    }
    setIsForm(false); setSelected(null)
  }

  // Convertir Prospecto: crea Cliente + Contacto + Oportunidad y marca el prospecto como Convertido
  const convertirProspecto = (p: Prospecto) => {
    const yaExiste = clientes.find(c => c.razon_social.toLowerCase().trim() === p.empresa.toLowerCase().trim())
    if (yaExiste) {
      alert(`Ya existe un Cliente con razón social "${p.empresa}". Cancela o cambia el nombre antes de convertir.`)
      return
    }
    const crearOportunidad = confirm(
      `Vas a convertir el Prospecto ${p.codigo}.\n\n` +
      `Se creará:\n` +
      `  • Cliente: ${p.empresa}\n` +
      `  • Contacto: ${p.nombre} ${p.apellido}\n\n` +
      `¿Crear también una Oportunidad asociada?\n` +
      `(Aceptar = Sí · Cancelar = No, solo Cliente y Contacto)`
    )

    const usuario = `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim()
    const cliCodigo = nextConsecutivo('CLI-', clientes.map(c => c.codigo)).codigo
    const cliId = crypto.randomUUID()
    addCliente({
      id: cliId, codigo: cliCodigo, tipo_identificacion: 'NIT',
      nro_documento: '', digito_verificacion: '', razon_social: p.empresa,
      macro_sector: p.macro_sector, actividad: '', actividad_codigo: '',
      direccion: '', departamento: '', ciudad: p.ciudad, codigo_ciudad: '', pais: p.pais || 'Colombia', codigo_pais: 'CO', codigo_postal: '',
      telefono: '', nro_movil: p.nro_movil, email: p.correo, sitio_web: '',
      condicion_pago: 'Contado', tipo_moneda: 'Pesos Colombianos', calificacion_pagador: '', representante_legal: '', tipo_cuenta_cliente: '', clase_cliente: 'Otros Clientes',
      autoretenedor: 'No', agente_retenedor: 'No', como_nos_conocio: '', gran_contribuyente: 'No', regimen_iva: 'No Responsable', clasificacion_tributaria: '', mes_cierre_anual: 'Diciembre',
      retencion_fuente_pct: 0, tipo_retencion_fuente: '', retencion_iva_pct: 0, tipo_retencion_iva: '', retencion_ica_pct: 0,
      cupo_credito: 0, banco_pagos: '', cuenta_banco: '', tipo_cuenta_banco: 'Ahorro', naturaleza_cuenta: '',
      observaciones: `Convertido desde Prospecto ${p.codigo}`,
      situacion: 'Activo', fecha_registro: today, fecha_ingreso_cliente: today, seguimientos: [], codigo_acceso: generarCodigoAcceso(),
      tipo_persona: '', responsabilidades_rut: '', actividad_dian_ciiu: '', tipo_regimen: '',
    })

    const conCodigo = nextConsecutivo('CON-', contactos.map(c => c.codigo)).codigo
    const conId = crypto.randomUUID()
    addContacto({
      id: conId, codigo: conCodigo, cliente_id: cliId, cliente_nombre: p.empresa,
      nombre: p.nombre, apellido: p.apellido, cargo: '', departamento: '',
      celular: p.nro_movil, email: p.correo,
      fecha_nacimiento: '', nivel_influencia: '', es_principal: true,
      observaciones: `Contacto creado desde Prospecto ${p.codigo}`,
      situacion: 'Activo', fecha_registro: today, seguimientos: [],
    })

    let oportLog = ''
    if (crearOportunidad) {
      const opoCodigo = nextConsecutivo('OPO-', oportunidades.map(o => o.codigo)).codigo
      addOportunidad({
        id: crypto.randomUUID(), codigo: opoCodigo,
        nombre: `Oportunidad ${p.empresa}`,
        cliente_id: cliId, cliente_nombre: p.empresa,
        contacto_id: conId, contacto_nombre: `${p.nombre} ${p.apellido}`,
        valor_estimado: 0, tipo_moneda: 'Pesos Colombianos',
        probabilidad: 30, etapa: 'Prospección', origen: p.origen_prospecto || 'Prospecto',
        fecha_cierre_estimada: '',
        fecha_inicio_diagnostico: '', fecha_inicio_visita: '', fecha_inicio_proceso_muestra: '',
        fecha_inicio_ensayo_laboratorio: '', fecha_inicio_ensayo_industrial: '',
        fecha_inicio_seguimiento_ensayos: '', fecha_presentacion_oferta: '',
        fecha_inicio_evaluacion_oferta: '', fecha_cierre: '', fecha_descartada: '', porque_descartada: '',
        responsable: usuario,
        observaciones: p.detalle_requerimiento || '',
        situacion: 'Abierta', fecha_registro: today, seguimientos: [],
      })
      oportLog = ` y Oportunidad ${opoCodigo}`
    }

    const nuevoSeg: Seguimiento = {
      id: crypto.randomUUID(), fecha: new Date().toISOString(),
      detalle: `Prospecto convertido. Se crearon: Cliente ${cliCodigo}, Contacto ${conCodigo}${oportLog}.`,
      persona_actividad: usuario, situacion: 'Convertido', usuario,
    }
    const updated = { ...p, situacion: 'Convertido', seguimientos: [...(p.seguimientos || []), nuevoSeg] }
    updateProspecto(p.id, updated)
    if (viewDetail?.id === p.id) setViewDetail(updated)
    alert(`Conversión exitosa.\nCliente ${cliCodigo}\nContacto ${conCodigo}${oportLog ? `\nOportunidad creada` : ''}`)
  }

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Nuevo': { background: '#4169E1', color: '#ffffff', border: '1px solid #3b82f6' },
      'Contactado': { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' },
      'Calificado': { background: 'rgba(59,130,246,0.2)', color: '#86efac', border: '1px solid rgba(59,130,246,0.3)' },
      'En Negociación': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
      'Convertido': { background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' },
      'Descartado': { background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' },
    }
    return map[s] || {}
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', boxSizing: 'border-box', height: 38 }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#4169E1' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)' })

  // View detail
  if (viewDetail) {
    const fields = [
      { label: 'Código', value: viewDetail.codigo },
      { label: 'Fecha Registro', value: fDate(viewDetail.fecha_registro) },
      { label: 'Nombre', value: viewDetail.nombre },
      { label: 'Apellido', value: viewDetail.apellido },
      { label: 'Empresa', value: viewDetail.empresa },
      { label: 'Correo', value: viewDetail.correo },
      { label: 'Nro Móvil', value: viewDetail.nro_movil },
      { label: 'Origen Prospecto', value: viewDetail.origen_prospecto },
      { label: 'Cómo Nos Conoció', value: viewDetail.como_nos_conocio },
      { label: 'Productos de Interés', value: (viewDetail.productos_interes || []).join(', ') },
      { label: 'Macro Sector', value: viewDetail.macro_sector },
      { label: 'Objetivo Producto', value: viewDetail.objetivo_producto },
      { label: 'Tiene Proveedor', value: viewDetail.tiene_proveedor === 'si' ? 'Sí' : 'No' },
      { label: 'Nombre Proveedor Actual', value: viewDetail.nombre_proveedor_actual },
      { label: 'Detalle Requerimiento', value: viewDetail.detalle_requerimiento },
      { label: 'Situación', value: viewDetail.situacion },
      { label: 'Ciudad', value: viewDetail.ciudad },
      { label: 'País', value: viewDetail.pais },
    ]
    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: '#172554', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{viewDetail.nombre} {viewDetail.apellido}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.label} style={f.label === 'Detalle Requerimiento' ? { gridColumn: 'span 3' } : undefined}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>{f.label}</p>
                <p style={{ color: '#ffffff', fontSize: 14 }}>{f.value || '—'}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {permisos.editar && (
              <button onClick={() => { setSelected(viewDetail); setIsForm(true); setViewDetail(null) }} style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>
            )}
            {permisos.editar && viewDetail.situacion !== 'Convertido' && viewDetail.situacion !== 'Descartado' && (
              <button onClick={() => convertirProspecto(viewDetail)} style={{ ...btnStyle, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>
                ⇄ Convertir Prospecto
              </button>
            )}
            {permisos.editar && viewDetail.situacion === 'Convertido' && (
              <span style={{ ...btnStyle, background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)', cursor: 'default' }}>
                ✓ Ya convertido
              </span>
            )}
          </div>
          <SeguimientoPanel
            seguimientos={viewDetail.seguimientos || []}
            usuario={`${currentUser?.nombre} ${currentUser?.apellido}`}
            situacionActual={viewDetail.situacion}
            situacionOpciones={refOptions('situacion_prospecto')}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updateProspecto(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
          <DocumentosPanel modulo="prospectos" registroId={viewDetail.id} />
        </div>
      </div>
    )
  }

  // Form
  if (isForm && selected) {
    return (
      <div>
        <button onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <form onSubmit={handleSave} style={{ background: '#172554', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{selected.id ? 'Editar' : 'Nuevo'} Prospecto</h2>
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
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre *</label>
              <input value={selected.nombre} onChange={e => setSelected({ ...selected, nombre: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Apellido *</label>
              <input value={selected.apellido} onChange={e => setSelected({ ...selected, apellido: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Empresa *</label>
              <input value={selected.empresa} onChange={e => setSelected({ ...selected, empresa: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Correo *</label>
              <input type="email" value={selected.correo} onChange={e => setSelected({ ...selected, correo: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nro Móvil *</label>
              <input value={selected.nro_movil} onChange={e => setSelected({ ...selected, nro_movil: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Origen Prospecto *</label>
              <select value={selected.origen_prospecto} onChange={e => setSelected({ ...selected, origen_prospecto: e.target.value })} required style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('origen_prospecto').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cómo Nos Conoció</label>
              <select value={selected.como_nos_conocio} onChange={e => setSelected({ ...selected, como_nos_conocio: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('como_nos_conocio').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Macro Sector</label>
              <select value={selected.macro_sector} onChange={e => setSelected({ ...selected, macro_sector: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('macro_sector').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Productos de Interés <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>(selección múltiple — {(selected.productos_interes || []).length} seleccionado{(selected.productos_interes || []).length === 1 ? '' : 's'})</span>
              </label>
              {(selected.productos_interes || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {(selected.productos_interes || []).map(prod => (
                    <span key={prod} style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.4)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {prod}
                      <button type="button" onClick={() => setSelected({ ...selected, productos_interes: (selected.productos_interes || []).filter(p => p !== prod) })} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, maxHeight: 160, overflow: 'auto' }}>
                {refOptions('producto_interes').length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', padding: 8 }}>
                    No hay productos en la tabla. Agrégalos desde Referencias → Producto de Interés.
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                    {refOptions('producto_interes').map(prod => {
                      const checked = (selected.productos_interes || []).includes(prod)
                      return (
                        <label key={prod} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', fontSize: 12, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, background: checked ? 'rgba(59,130,246,0.15)' : 'transparent' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const list = selected.productos_interes || []
                              const next = e.target.checked ? [...list, prod] : list.filter(p => p !== prod)
                              setSelected({ ...selected, productos_interes: next })
                            }}
                          />
                          {prod}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Objetivo Producto</label>
              <input value={selected.objetivo_producto} onChange={e => setSelected({ ...selected, objetivo_producto: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tiene Proveedor Actual</label>
              <select value={selected.tiene_proveedor} onChange={e => setSelected({ ...selected, tiene_proveedor: e.target.value as 'si' | 'no' })} style={inputStyle}>
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nombre Proveedor Actual</label>
              <input value={selected.nombre_proveedor_actual || ''} onChange={e => setSelected({ ...selected, nombre_proveedor_actual: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ciudad</label>
              <select value={selected.ciudad} onChange={e => setSelected({ ...selected, ciudad: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('ciudad').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>País</label>
              <select value={selected.pais} onChange={e => setSelected({ ...selected, pais: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {refOptions('pais').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Detalle Requerimiento</label>
              <textarea value={selected.detalle_requerimiento} onChange={e => setSelected({ ...selected, detalle_requerimiento: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {refOptions('situacion_prospecto').map(o => <option key={o} value={o}>{o}</option>)}
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

  // Report data
  const reportColumns = [
    { header: 'Código', key: 'codigo', width: 10 },
    { header: 'Nombre', key: 'nombre_completo', width: 18 },
    { header: 'Empresa', key: 'empresa', width: 16 },
    { header: 'Correo', key: 'correo', width: 18 },
    { header: 'Móvil', key: 'nro_movil', width: 10 },
    { header: 'Origen', key: 'origen_prospecto', width: 10 },
    { header: 'Ciudad', key: 'ciudad', width: 10 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(p => ({
    codigo: p.codigo, nombre_completo: `${p.nombre} ${p.apellido}`, empresa: p.empresa,
    correo: p.correo, nro_movil: p.nro_movil, origen_prospecto: p.origen_prospecto,
    ciudad: p.ciudad, situacion: p.situacion,
  }))
  const reportFilters = [
    { label: 'Situación', key: 'situacion', options: [...new Set(prospectos.map(p => p.situacion).filter(Boolean))] },
    { label: 'Origen', key: 'origen_prospecto', options: [...new Set(prospectos.map(p => p.origen_prospecto).filter(Boolean))] },
    { label: 'Ciudad', key: 'ciudad', options: [...new Set(prospectos.map(p => p.ciudad).filter(Boolean))] },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Prospectos</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Gestión de prospectos comerciales</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {tab === 'registros' && externas.length > 0 && (
            <button onClick={() => setShowExternas(!showExternas)}
              style={{ ...btnStyle, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316', position: 'relative' }}>
              Prospectos Web
              <span style={{ position: 'absolute', top: -8, right: -8, background: '#dc2626', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{externas.length}</span>
            </button>
          )}
          {permisos.esAdmin && prospectos.length > 0 && tab === 'registros' && (
            <button
              onClick={() => {
                if (!confirm(`⚠️ ATENCIÓN\n\nSe eliminarán TODOS los ${prospectos.length} prospectos de forma permanente.\n\nEsta acción NO se puede deshacer.\n\n¿Continuar?`)) return
                const confirmTxt = prompt('Para confirmar, escribe: ELIMINAR TODOS')
                if (confirmTxt !== 'ELIMINAR TODOS') { alert('Cancelado. No se eliminó nada.'); return }
                useProspectosStore.setState({ prospectos: [] })
                alert('Base de Prospectos eliminada.')
              }}
              style={{ ...btnStyle, background: '#b91c1c', color: '#ffffff', border: '1px solid #dc2626' }}
              title="Solo administradores"
            >
              🗑️ Eliminar Base ({prospectos.length})
            </button>
          )}
          {permisos.editar && tab === 'registros' && (
            <button onClick={() => { setSelected(emptyProspecto(nextConsecutivo('PRS-', prospectos.map(p => p.codigo)).codigo)); setIsForm(true) }} style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>+ Nuevo Prospecto</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Registros</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {tab === 'registros' && (
        <>
          {/* Panel prospectos externos */}
          {showExternas && externas.length > 0 && (
            <div style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.3)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ color: '#f97316', fontSize: 15, fontWeight: 700, margin: 0 }}>Prospectos desde Formulario Web ({externas.length})</h3>
                <button onClick={importarTodas} style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6', fontSize: 12 }}>Importar Todas</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {externas.map(ext => (
                  <div key={ext.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, margin: 0 }}>{ext.nombre} {ext.apellido}</p>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: '2px 0' }}>{ext.empresa || 'Sin empresa'} | {ext.correo} | {ext.nro_movil || 'Sin móvil'}</p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>{ext.descripcion_requerimiento?.substring(0, 120)}{(ext.descripcion_requerimiento?.length || 0) > 120 ? '...' : ''}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '4px 0 0' }}>{fDate(ext.fecha_registro)} {ext.hora_registro}</p>
                    </div>
                    <button onClick={() => importarProspecto(ext)} style={{ ...btnStyle, background: '#4169E1', color: '#ffffff', border: '1px solid #3b82f6', fontSize: 11, marginLeft: 12 }}>Importar al CRM</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, empresa o código..." style={{ ...inputStyle, maxWidth: 400 }} />
          </div>

          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Código', 'Nombre', 'Empresa', 'Correo', 'Móvil', 'Origen', 'Situación', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', background: '#1e3a8a', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', fontSize: 13, fontFamily: 'monospace' }}>{p.codigo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{p.nombre} {p.apellido}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.empresa}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.correo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.nro_movil}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p.origen_prospecto}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(p.situacion) }}>{p.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewDetail(p)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                        {permisos.editar && <button onClick={() => { setSelected(p); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>}
                        {permisos.eliminar && <button onClick={() => { if (confirm(`¿Eliminar prospecto "${p.nombre} ${p.apellido}"?`)) deleteProspecto(p.id); logAudit({ ...auditParams(), accion: "ELIMINAR", registro_codigo: p.codigo, registro_nombre: `${p.nombre} ${p.apellido}` }) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay prospectos registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <ReportPanel title="Reporte de Prospectos" columns={reportColumns} rows={reportRows} filters={reportFilters} />
      )}
    </div>
  )
}
