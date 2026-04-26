'use client'
import { logAudit, computarDiff } from '@/shared/lib/audit'
import { useState, useEffect } from 'react'
import { useCotizacionesStore, Cotizacion, DetalleCotizacion } from '@/features/cotizaciones/store/cotizaciones-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useOportunidadesStore } from '@/features/oportunidades/store/oportunidades-store'
import { useProductosStore } from '@/features/productos/store/productos-store'
import { useReferenceStore } from '@/features/referencias/store/reference-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { useEmpresaStore } from '@/features/empresa/store/empresa-store'
import { usePermisos } from '@/shared/hooks/use-permisos'
import { fmtMoney } from '@/shared/lib/format-number'
import { fDate, todayColombia } from '@/shared/lib/format-date'
import { nextConsecutivo } from '@/shared/lib/consecutivo'
import ReportPanel from '@/shared/components/report-panel'
import SeguimientoPanel from '@/shared/components/seguimiento-panel'
import DocumentosPanel from '@/shared/components/documentos-panel'
import { useAsistenteStore } from '@/shared/stores/asistente-store'
import { Seguimiento } from '@/shared/types/seguimiento'
import { generarCotizacionPdf } from '@/shared/lib/pdf-cotizacion'

const today = todayColombia()

const emptyDetalle = (): DetalleCotizacion => ({
  id: crypto.randomUUID(), producto_id: '', codigo_producto: '', descripcion: '',
  cantidad: 1, precio_unitario: 0, unidad_medida: 'Unidad', descuento_pct: 0, subtotal: 0,
})

const emptyCotizacion = (codigo: string, nro: number, responsable: string): Cotizacion => ({
  id: '', codigo, nro, fecha_emision: today,
  fecha_vencimiento: '', cliente_id: '', cliente_nombre: '', contacto_id: '', contacto_nombre: '',
  oportunidad_id: '', oportunidad_nombre: '', tipo_moneda: 'Pesos Colombianos',
  condicion_pago: 'Contado', pct_impuesto: 19, pct_retencion: 0, fecha_aprobacion: '',
  tiene_flete: 'No', observaciones: '', detalles: [emptyDetalle()],
  situacion: 'En Construcción', responsable, vendedor: '', fecha_registro: today, seguimientos: [],
})

const calcTotals = (detalles: DetalleCotizacion[], pctIva: number, pctRet: number = 0) => {
  const subtotal = detalles.reduce((s, d) => s + d.subtotal, 0)
  const impuesto = subtotal * (pctIva / 100)
  const retencion = subtotal * (pctRet / 100)
  const total = subtotal + impuesto - retencion
  return { subtotal, impuesto, retencion, total }
}

export default function CotizacionesPage() {
  const permisos = usePermisos('cotizaciones')
  const currentUser = useCurrentUserStore(s => s.user)
  const { cotizaciones, addCotizacion, updateCotizacion, deleteCotizacion } = useCotizacionesStore()
  const allClientes = useClientesStore(s => s.clientes)
  const clientes = allClientes.filter(c => c.situacion === 'Activo')
  const allContactos = useContactosStore(s => s.contactos).filter(c => c.situacion === 'Activo')
  const oportunidades = useOportunidadesStore(s => s.oportunidades)
  const productos = useProductosStore(s => s.productos).filter(p => p.situacion === 'Activo')
  const refData = useReferenceStore(s => s.data)
  const vendedores = useReferenceStore(s => s.vendedores).filter(v => v.situacion)
  const empresas = useEmpresaStore(s => s.empresas)
  const empresa = empresas[0]

  const [selected, setSelected] = useState<Cotizacion | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [viewDetail, setViewDetail] = useState<Cotizacion | null>(null)
  const [tab, setTab] = useState<'registros' | 'reportes'>('registros')
  const [search, setSearch] = useState('')
  const [searchProd, setSearchProd] = useState('')
  const [showProductos, setShowProductos] = useState(false)
  const { pendingSearch, pendingAction, clearPending } = useAsistenteStore()
  useEffect(() => {
    if (pendingSearch) setSearch(pendingSearch)
    if (pendingAction === 'nuevo') { const nc = nextConsecutivo('COT-', cotizaciones.map(c => c.codigo)); setSelected(emptyCotizacion(nc.codigo, nc.nro, `${currentUser?.nombre} ${currentUser?.apellido}`)); setIsForm(true) }
    if (pendingSearch || pendingAction) clearPending()
  }, [])
  const [emailModal, setEmailModal] = useState<Cotizacion | null>(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailAsunto, setEmailAsunto] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [sending, setSending] = useState(false)

  const filtered = cotizaciones.filter(c =>
    !search || c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.cliente_nombre.toLowerCase().includes(search.toLowerCase())
  )

  const recalcDetalle = (d: DetalleCotizacion): DetalleCotizacion => {
    const bruto = d.cantidad * d.precio_unitario
    const desc = bruto * (d.descuento_pct / 100)
    return { ...d, subtotal: bruto - desc }
  }

  const updateDetalle = (idx: number, field: string, value: string | number) => {
    if (!selected) return
    const detalles = [...selected.detalles]
    detalles[idx] = recalcDetalle({ ...detalles[idx], [field]: value })
    setSelected({ ...selected, detalles })
  }

  const removeDetalle = (idx: number) => {
    if (!selected) return
    const detalles = selected.detalles.filter((_, i) => i !== idx)
    setSelected({ ...selected, detalles: detalles.length ? detalles : [emptyDetalle()] })
  }

  const auditParams = () => ({
    usuario: currentUser?.usuario || 'desconocido',
    usuario_nombre: `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim(),
    rol: currentUser?.rol || '',
    modulo: 'cotizaciones',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const cli = clientes.find(c => c.id === selected.cliente_id)
    const con = allContactos.find(c => c.id === selected.contacto_id)
    const opo = oportunidades.find(o => o.id === selected.oportunidad_id)
    const toSave = {
      ...selected,
      cliente_nombre: cli?.razon_social || selected.cliente_nombre,
      contacto_nombre: con ? `${con.nombre} ${con.apellido}` : selected.contacto_nombre,
      oportunidad_nombre: opo?.nombre || selected.oportunidad_nombre,
    }
    if (toSave.id) { const _anterior = cotizaciones.find(x => x.id === toSave.id); updateCotizacion(toSave.id, toSave); logAudit({ ...auditParams(), accion: "MODIFICAR", registro_codigo: toSave.codigo, registro_nombre: toSave.cliente_nombre, detalle: computarDiff(_anterior as unknown as Record<string, unknown>, toSave as unknown as Record<string, unknown>) }) }
    else { addCotizacion({ ...toSave, id: crypto.randomUUID() }) }
    setIsForm(false); setSelected(null)
  }

  const handleSendEmail = async () => {
    if (!emailModal || !emailTo) return
    setSending(true)
    try {
      const cli = clientes.find(c => c.id === emailModal.cliente_id)
      const clienteData = cli ? {
        razon_social: cli.razon_social,
        tipo_identificacion: cli.tipo_identificacion,
        nro_documento: cli.nro_documento,
        direccion: cli.direccion,
        ciudad: cli.ciudad,
        pais: cli.pais,
      } : null
      const empresaData = empresa ? {
        nombre: empresa.nombre,
        nro_documento: empresa.nro_documento,
        direccion: empresa.direccion,
        ciudad: empresa.ciudad,
        logo_url: empresa.logo_url,
      } : null
      const res = await fetch('/api/send-cotizacion-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, asunto: emailAsunto || `Cotización ${emailModal.codigo}`, mensaje: emailMsg, cotizacion: emailModal, cliente: clienteData, empresa: empresaData }),
      })
      const data = await res.json()
      if (data.success) {
        updateCotizacion(emailModal.id, { situacion: 'Enviada' })
        alert('Cotización enviada correctamente')
        setEmailModal(null)
      } else {
        alert(data.error || 'Error al enviar')
      }
    } catch { alert('Error de conexión') }
    finally { setSending(false) }
  }

  const generatePDF = (cot: Cotizacion) => {
    const cli = clientes.find(c => c.id === cot.cliente_id)
    const doc = generarCotizacionPdf({
      empresa: {
        nombre: empresa?.nombre || 'COTIZACIÓN',
        logo_url: empresa?.logo_url,
        nit: empresa?.nro_documento,
        direccion: empresa?.direccion,
        telefono: empresa?.telefono,
        ciudad: empresa?.ciudad,
        correo: empresa?.correo,
        pagina_web: empresa?.pagina_web,
      },
      cliente: {
        razon_social: cli?.razon_social || cot.cliente_nombre || '—',
        nit: cli?.nro_documento,
        direccion: cli?.direccion,
        ciudad: cli?.ciudad,
        vendedor: cot.vendedor || cot.responsable,
      },
      cotizacion: {
        codigo: cot.codigo,
        fecha_emision: cot.fecha_emision,
        fecha_vencimiento: cot.fecha_vencimiento,
        condicion_pago: cot.condicion_pago,
        pct_impuesto: cot.pct_impuesto || 19,
        pct_retencion: cot.pct_retencion || 0,
        observaciones: cot.observaciones,
        detalles: cot.detalles.map(d => ({
          codigo: d.codigo_producto,
          descripcion: d.descripcion,
          precio_unitario: d.precio_unitario,
          cantidad: d.cantidad,
          subtotal: d.subtotal,
        })),
        anulada: cot.situacion === 'Anulada',
      },
    })
    doc.save(`Cotizacion_${cot.codigo}.pdf`)
  }

  const statusStyle = (s: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      'Borrador': { background: 'rgba(156,163,175,0.2)', color: '#d1d5db', border: '1px solid rgba(156,163,175,0.3)' },
      'En Construcción': { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' },
      'Anulada': { background: 'rgba(120,53,15,0.3)', color: '#fcd34d', border: '1px solid rgba(180,83,9,0.5)', textDecoration: 'line-through' },
      'Enviada': { background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' },
      'Aprobada': { background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' },
      'Rechazada': { background: '#b91c1c', color: '#ffffff', border: '1px solid #dc2626' },
      'Vencida': { background: 'rgba(245,158,11,0.2)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' },
    }
    return map[s] || {}
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none', boxSizing: 'border-box', height: 38 }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#4169E1' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)' })
  const refOptions = (table: string) => (refData[table as keyof typeof refData] || []).filter(r => r.situacion).map(r => r.descripcion)

  const sendWhatsApp = (cot: Cotizacion) => {
    const contacto = allContactos.find(c => c.id === cot.contacto_id)
    const cliente = clientes.find(c => c.id === cot.cliente_id)
    const celular = contacto?.celular || cliente?.telefono || ''
    if (!celular) { alert('No se encontró número de celular del contacto o empresa'); return }
    const numero = celular.replace(/[^0-9]/g, '')
    const { subtotal, impuesto, retencion, total } = calcTotals(cot.detalles, cot.pct_impuesto, cot.pct_retencion || 0)
    const items = cot.detalles.map(d => `  - ${d.descripcion}: ${d.cantidad} x ${fmtMoney(d.precio_unitario)} = ${fmtMoney(d.subtotal)}`).join('\n')
    const mensaje = `Hola, le enviamos la cotización *${cot.codigo}*\n\n` +
      `*Cliente:* ${cot.cliente_nombre}\n` +
      `*Fecha:* ${fDate(cot.fecha_emision)}\n` +
      `*Condición de Pago:* ${cot.condicion_pago}\n` +
      `*Moneda:* ${cot.tipo_moneda}\n\n` +
      `*Detalle:*\n${items}\n\n` +
      `*Subtotal antes de impuestos:* ${fmtMoney(subtotal)}\n` +
      `*Monto IVA (${cot.pct_impuesto}%):* ${fmtMoney(impuesto)}\n` +
      `*Retención (${cot.pct_retencion || 0}%):* −${fmtMoney(retencion)}\n` +
      `*VALOR NETO A PAGAR: ${fmtMoney(total)}*\n\n` +
      (cot.observaciones ? `_${cot.observaciones}_\n\n` : '') +
      `Vendedor: ${cot.vendedor || cot.responsable}`
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const contactosDelCliente = selected ? allContactos.filter(c => c.cliente_id === selected.cliente_id) : []
  const oposDelCliente = selected ? oportunidades.filter(o => o.cliente_id === selected.cliente_id) : []

  // ── EMAIL MODAL ──
  if (emailModal) {
    const cli = clientes.find(c => c.id === emailModal.cliente_id)
    const con = allContactos.find(c => c.id === emailModal.contacto_id)
    return (
      <div>
        <button onClick={() => setEmailModal(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)', maxWidth: 500 }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Enviar {emailModal.codigo} por Email</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Para *</label>
              <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder={con?.email || cli?.email || 'correo@ejemplo.com'} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Asunto</label>
              <input value={emailAsunto} onChange={e => setEmailAsunto(e.target.value)} placeholder={`Cotización ${emailModal.codigo}`} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mensaje</label>
              <textarea value={emailMsg} onChange={e => setEmailMsg(e.target.value)} rows={4} placeholder="Mensaje adicional..." style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
            </div>
            <button onClick={handleSendEmail} disabled={sending || !emailTo}
              style={{ ...btnStyle, background: sending ? '#3b82f6' : '#3b82f6', color: '#ffffff', marginTop: 8 }}>
              {sending ? 'Enviando...' : 'Enviar Cotización'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── VIEW DETAIL ──
  if (viewDetail) {
    const { subtotal, impuesto, retencion, total } = calcTotals(viewDetail.detalles, viewDetail.pct_impuesto, viewDetail.pct_retencion || 0)
    return (
      <div>
        <button onClick={() => setViewDetail(null)} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          {empresa && (
            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
              <p style={{ color: '#60a5fa', fontSize: 16, fontWeight: 800 }}>{empresa.nombre}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{empresa.direccion}{empresa.ciudad ? ', ' + empresa.ciudad : ''}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>NIT: {empresa.nro_documento}</p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ color: '#ffffff', fontSize: 20, fontWeight: 700 }}>{viewDetail.codigo}</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{viewDetail.cliente_nombre}</p>
            </div>
            <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, ...statusStyle(viewDetail.situacion) }}>{viewDetail.situacion}</span>
          </div>
          {(() => {
            const cli = clientes.find(c => c.id === viewDetail.cliente_id)
            return (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>DATOS DEL CLIENTE</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                  {[
                    { l: 'Cliente', v: viewDetail.cliente_nombre },
                    { l: 'Tipo Documento', v: cli?.tipo_identificacion },
                    { l: 'Nro Documento', v: cli?.nro_documento },
                    { l: 'Dirección', v: cli?.direccion },
                    { l: 'Ciudad', v: cli?.ciudad },
                    { l: 'País', v: cli?.pais },
                    { l: 'Contacto', v: viewDetail.contacto_nombre },
                  ].map(f => (
                    <div key={f.l}><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{f.l}</p><p style={{ color: '#ffffff', fontSize: 13 }}>{f.v || '—'}</p></div>
                  ))}
                </div>
              </div>
            )
          })()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              { l: 'Fecha Cotización', v: fDate(viewDetail.fecha_emision) },
              { l: 'Fecha Vencimiento', v: fDate(viewDetail.fecha_vencimiento) },
              { l: 'Fecha Aprobación', v: viewDetail.fecha_aprobacion ? fDate(viewDetail.fecha_aprobacion) : '—' },
              { l: 'Condiciones de Pago', v: viewDetail.condicion_pago },
              { l: '¿Tiene Flete?', v: viewDetail.tiene_flete || 'No' },
              { l: 'Tipo Moneda', v: viewDetail.tipo_moneda },
              { l: 'Vendedor', v: viewDetail.vendedor },
              { l: 'Oportunidad', v: viewDetail.oportunidad_nombre },
            ].map(f => (
              <div key={f.l}><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{f.l}</p><p style={{ color: '#ffffff', fontSize: 13 }}>{f.v || '—'}</p></div>
            ))}
          </div>

          {/* Detalles table */}
          <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Código', 'Descripción', 'Unidad Medida', 'Cantidad', 'Precio', 'Subtotal'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', background: '#1e3a8a', color: '#fff', fontSize: 11, textAlign: 'left' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {viewDetail.detalles.map((d, i) => (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', fontSize: 12, fontFamily: 'monospace' }}>{d.codigo_producto}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 12 }}>{d.descripcion}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' }}>{d.unidad_medida}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 12, textAlign: 'center' }}>{d.cantidad}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 12, textAlign: 'right' }}>${fmtMoney(d.precio_unitario)}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', fontSize: 12, textAlign: 'right', fontWeight: 600 }}>${fmtMoney(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'right' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0' }}>Subtotal antes de impuestos: <span style={{ color: '#ffffff', fontWeight: 700 }}>${fmtMoney(subtotal)}</span></p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0' }}>Monto IVA ({viewDetail.pct_impuesto}%): <span style={{ color: '#ffffff', fontWeight: 700 }}>${fmtMoney(impuesto)}</span></p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0' }}>Retención ({viewDetail.pct_retencion || 0}%): <span style={{ color: '#fca5a5', fontWeight: 700 }}>−${fmtMoney(retencion)}</span></p>
            <p style={{ color: '#60a5fa', fontSize: 20, fontWeight: 800, marginTop: 8, borderTop: '2px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>VALOR NETO A PAGAR: ${fmtMoney(total)}</p>
          </div>

          {viewDetail.observaciones && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 16 }}>Observaciones: {viewDetail.observaciones}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => generatePDF(viewDetail)} style={{ ...btnStyle, background: '#b91c1c', color: '#ffffff', border: '1px solid #dc2626' }}>PDF</button>
            <button onClick={() => { setEmailTo(''); setEmailAsunto(''); setEmailMsg(''); setEmailModal(viewDetail) }} style={{ ...btnStyle, background: '#4169E1', color: '#ffffff', border: '1px solid #3b82f6' }}>Enviar por Email</button>
            <button onClick={() => sendWhatsApp(viewDetail)} style={{ ...btnStyle, background: '#25d366', color: '#ffffff', border: '1px solid #3b82f6' }}>WhatsApp</button>
            {permisos.editar && !['Aprobada', 'Rechazada'].includes(viewDetail.situacion) && (
              <button onClick={() => { setSelected(viewDetail); setIsForm(true); setViewDetail(null) }} style={{ ...btnStyle, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>
            )}
          </div>
          <SeguimientoPanel
            seguimientos={viewDetail.seguimientos || []}
            usuario={`${currentUser?.nombre} ${currentUser?.apellido}`}
            situacionActual={viewDetail.situacion}
            situacionOpciones={refData.situacion_cotizacion.filter(r => r.situacion).map(r => r.descripcion)}
            onAdd={(seg: Seguimiento) => {
              const updated = { ...viewDetail, situacion: seg.situacion, seguimientos: [...(viewDetail.seguimientos || []), seg] }
              updateCotizacion(viewDetail.id, updated)
              setViewDetail(updated)
            }}
          />
          <DocumentosPanel modulo="cotizaciones" registroId={viewDetail.id} />
        </div>
      </div>
    )
  }

  // ── FORM ──
  if (isForm && selected) {
    const { subtotal, impuesto, retencion, total } = calcTotals(selected.detalles, selected.pct_impuesto, selected.pct_retencion || 0)
    return (
      <div>
        <button onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', marginBottom: 16 }}>← Volver</button>
        <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h2 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>{selected.id ? 'Editar' : 'Nueva'} Cotización Nro {selected.codigo}</h2>

          {/* Encabezado: Nro / Fechas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nro Cotización</label>
              <input value={selected.codigo} readOnly style={{ ...inputStyle, opacity: 0.5, fontFamily: 'monospace', fontWeight: 700 }} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Registro</label>
              <input value={fDate(selected.fecha_registro)} readOnly style={{ ...inputStyle, opacity: 0.5 }} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Cotización *</label>
              <input type="date" value={selected.fecha_emision} onChange={e => setSelected({ ...selected, fecha_emision: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Vencimiento</label>
              <input type="date" value={selected.fecha_vencimiento} onChange={e => setSelected({ ...selected, fecha_vencimiento: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha Aprobación</label>
              <input type="date" value={selected.fecha_aprobacion} onChange={e => setSelected({ ...selected, fecha_aprobacion: e.target.value })} style={inputStyle} />
            </div>
          </div>

          {/* Cliente + Contacto en la misma línea */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cliente *</label>
              <select value={selected.cliente_id} onChange={e => {
                const cli = clientes.find(c => c.id === e.target.value)
                setSelected({ ...selected, cliente_id: e.target.value, cliente_nombre: cli?.razon_social || '', contacto_id: '', contacto_nombre: '', oportunidad_id: '', oportunidad_nombre: '' })
              }} required style={inputStyle}>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contacto</label>
              <select value={selected.contacto_id} onChange={e => {
                const con = contactosDelCliente.find(c => c.id === e.target.value)
                setSelected({ ...selected, contacto_id: e.target.value, contacto_nombre: con ? `${con.nombre} ${con.apellido}` : '' })
              }} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {contactosDelCliente.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
              </select>
            </div>
          </div>

          {/* Oportunidad + Vendedor en la misma línea */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Oportunidad</label>
              <select value={selected.oportunidad_id} onChange={e => {
                const opo = oportunidades.find(o => o.id === e.target.value)
                setSelected({ ...selected, oportunidad_id: e.target.value, oportunidad_nombre: opo?.nombre || '' })
              }} style={inputStyle}>
                <option value="">Ninguna</option>
                {(oposDelCliente.length > 0 ? oposDelCliente : oportunidades).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Vendedor</label>
              <select value={selected.vendedor} onChange={e => setSelected({ ...selected, vendedor: e.target.value })} style={inputStyle}>
                <option value="">Seleccionar...</option>
                {vendedores.map(v => <option key={v.id} value={`${v.nombre} ${v.apellido}`}>{v.codigo} - {v.nombre} {v.apellido}</option>)}
              </select>
            </div>
          </div>

          {/* Datos del Cliente (solo si hay cliente) */}
          {selected.cliente_id && (() => {
            const cli =
              allClientes.find(c => c.id === selected.cliente_id) ||
              allClientes.find(c => c.razon_social === selected.cliente_nombre)
            return (
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <p style={{ color: '#93c5fd', fontSize: 11, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>DATOS DEL CLIENTE</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { l: 'Tipo Documento', v: cli?.tipo_identificacion },
                    { l: 'Nro Documento', v: cli?.nro_documento },
                    { l: 'Dirección', v: cli?.direccion },
                    { l: 'Ciudad', v: cli?.ciudad },
                    { l: 'País', v: cli?.pais },
                  ].map(f => (
                    <div key={f.l}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{f.l}</p>
                      <p style={{ color: '#ffffff', fontSize: 12, fontWeight: 600 }}>{f.v || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Moneda / Condiciones / Situación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo Moneda</label>
              <select value={selected.tipo_moneda} onChange={e => setSelected({ ...selected, tipo_moneda: e.target.value })} style={inputStyle}>
                {refOptions('tipo_moneda').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Condiciones de Pago</label>
              <select value={selected.condicion_pago} onChange={e => setSelected({ ...selected, condicion_pago: e.target.value })} style={inputStyle}>
                {refOptions('condiciones_pago').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>¿Tiene Flete?</label>
              <select value={selected.tiene_flete || 'No'} onChange={e => setSelected({ ...selected, tiene_flete: e.target.value })} style={inputStyle}>
                <option value="No">No</option>
                <option value="Si">Sí</option>
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {refOptions('situacion_cotizacion').map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Buscar y agregar producto */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, margin: 0 }}>Detalle de Productos</h3>
            <button type="button" onClick={() => { setShowProductos(!showProductos); setSearchProd('') }}
              style={{ padding: '8px 18px', borderRadius: 8, background: showProductos ? '#dc2626' : '#4169E1', color: '#ffffff', border: showProductos ? '1px solid #ef4444' : '1px solid #3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {showProductos ? '✕ Cerrar' : '+ Agregar Productos'}
            </button>
          </div>
          {showProductos && (
            <div style={{ marginBottom: 12 }}>
              <input value={searchProd} onChange={e => setSearchProd(e.target.value)} placeholder="Buscar producto por código o descripción..." style={{ ...inputStyle, maxWidth: 500, marginBottom: 8 }} autoFocus />
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, maxHeight: 220, overflow: 'auto' }}>
                {productos.filter(p => p.situacion === 'Activo').filter(p => !searchProd || p.descripcion.toLowerCase().includes(searchProd.toLowerCase()) || p.codigo.toLowerCase().includes(searchProd.toLowerCase())).slice(0, 20).map(p => (
                  <div key={p.id} onClick={() => {
                    if (!selected) return
                    const nuevo = recalcDetalle({ id: crypto.randomUUID(), producto_id: p.id, codigo_producto: p.codigo, descripcion: p.descripcion, cantidad: 1, precio_unitario: p.precio_unitario, unidad_medida: p.unidad_medida, descuento_pct: 0, subtotal: 0 })
                    const detalles = selected.detalles.filter(d => d.producto_id)
                    setSelected({ ...selected, detalles: [...detalles, nuevo] })
                  }} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 12, color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span><span style={{ color: '#60a5fa', fontFamily: 'monospace', marginRight: 8 }}>{p.codigo}</span>{p.descripcion}</span>
                    <span style={{ color: '#93c5fd', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 12 }}>${fmtMoney(p.precio_unitario)}</span>
                  </div>
                ))}
                {productos.filter(p => p.situacion === 'Activo').filter(p => !searchProd || p.descripcion.toLowerCase().includes(searchProd.toLowerCase()) || p.codigo.toLowerCase().includes(searchProd.toLowerCase())).length === 0 && (
                  <div style={{ padding: '16px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' }}>No se encontraron productos</div>
                )}
              </div>
            </div>
          )}

          {/* Tabla de items — los titulos siempre visibles */}
          <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Código', 'Descripción', 'Unidad Medida', 'Cantidad', 'Precio', 'Subtotal', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', background: '#1e3a8a', color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {selected.detalles.filter(d => d.producto_id).length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13, background: 'rgba(255,255,255,0.02)' }}>
                      Aún no se han agregado productos. Haz clic en <strong style={{ color: '#60a5fa' }}>+ Agregar Productos</strong> para comenzar.
                    </td>
                  </tr>
                )}
                {selected.detalles.filter(d => d.producto_id).map((d, idx) => {
                  const realIdx = selected.detalles.findIndex(x => x.id === d.id)
                  return (
                    <tr key={d.id} style={{ background: idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', fontSize: 12, fontFamily: 'monospace', width: 100 }}>{d.codigo_producto}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 12 }}>{d.descripcion}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 12, width: 100 }}>{d.unidad_medida}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', width: 90 }}>
                        <input type="number" min="1" value={d.cantidad} onChange={e => updateDetalle(realIdx, 'cantidad', parseInt(e.target.value) || 1)} style={{ ...inputStyle, fontSize: 12, padding: '4px 6px', textAlign: 'center' }} />
                      </td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', width: 120 }}>
                        <input type="number" step="0.01" min="0" value={d.precio_unitario || ''} onChange={e => updateDetalle(realIdx, 'precio_unitario', parseFloat(e.target.value) || 0)} style={{ ...inputStyle, fontSize: 12, padding: '4px 6px', textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', fontSize: 12, fontWeight: 600, textAlign: 'right', width: 120 }}>${fmtMoney(d.subtotal)}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', width: 40 }}>
                        <button type="button" onClick={() => removeDetalle(realIdx)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 16 }}>×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totales (los % se calcularán según fórmula que se definirá) */}
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'right' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0' }}>Subtotal antes de impuestos: <span style={{ color: '#ffffff', fontWeight: 700 }}>${fmtMoney(subtotal)}</span></p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0' }}>Monto IVA: <span style={{ color: '#ffffff', fontWeight: 700 }}>${fmtMoney(impuesto)}</span></p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0' }}>Retención: <span style={{ color: '#fca5a5', fontWeight: 700 }}>−${fmtMoney(retencion)}</span></p>
            <p style={{ color: '#60a5fa', fontSize: 20, fontWeight: 800, marginTop: 8, borderTop: '2px solid rgba(255,255,255,0.2)', paddingTop: 8 }}>VALOR NETO A PAGAR: ${fmtMoney(total)}</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Observaciones</label>
            <textarea value={selected.observaciones} onChange={e => setSelected({ ...selected, observaciones: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} placeholder="Notas adicionales, condiciones especiales, garantías, etc." />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>Guardar</button>
            <button type="button" onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#64748b', color: '#ffffff' }}>Cancelar</button>
          </div>
        </form>
      </div>
    )
  }

  // ── REPORT DATA ──
  const reportColumns = [
    { header: 'Código', key: 'codigo', width: 12 },
    { header: 'Cliente', key: 'cliente_nombre', width: 22 },
    { header: 'Emisión', key: 'emision', width: 10 },
    { header: 'Vence', key: 'vence', width: 10 },
    { header: 'Items', key: 'items', width: 6 },
    { header: 'Total', key: 'total', width: 14 },
    { header: 'Situación', key: 'situacion', width: 10 },
  ]
  const reportRows = filtered.map(c => {
    const { total } = calcTotals(c.detalles, c.pct_impuesto, c.pct_retencion || 0)
    return {
      codigo: c.codigo, cliente_nombre: c.cliente_nombre, emision: fDate(c.fecha_emision),
      vence: fDate(c.fecha_vencimiento), items: c.detalles.length, total: `${fmtMoney(total)}`,
      situacion: c.situacion,
    }
  })

  // ── MAIN VIEW ──
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Cotizaciones</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Gestión de cotizaciones comerciales</p>
        </div>
        {permisos.editar && tab === 'registros' && (
          <button onClick={() => { { const nc = nextConsecutivo('COT-', cotizaciones.map(c => c.codigo)); setSelected(emptyCotizacion(nc.codigo, nc.nro, `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`)) }; setIsForm(true) }} style={{ ...btnStyle, background: '#172554', color: '#ffffff' }}>+ Nueva Cotización</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('registros')} style={tabBtnStyle(tab === 'registros')}>📋 Registros</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {tab === 'registros' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código o cliente..."
            style={{ ...inputStyle, maxWidth: 400, marginBottom: 16 }} />
          <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Código', 'Cliente', 'Tipo Documento', 'Nro Documento', 'Dirección', 'Ciudad', 'País', 'Emisión', 'Vence', 'Items', 'Total', 'Situación', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', background: '#1e3a8a', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((c, i) => {
                  const { total } = calcTotals(c.detalles, c.pct_impuesto, c.pct_retencion || 0)
                  const cli = clientes.find(cl => cl.id === c.cliente_id)
                  return (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#60a5fa', fontSize: 13, fontFamily: 'monospace' }}>{c.codigo}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{c.cliente_nombre}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{cli?.tipo_identificacion || ''}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{cli?.nro_documento || ''}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{cli?.direccion || ''}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{cli?.ciudad || ''}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{cli?.pais || ''}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{fDate(c.fecha_emision)}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{fDate(c.fecha_vencimiento)}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center' }}>{c.detalles.length}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#93c5fd', fontSize: 13, fontWeight: 600 }}>{fmtMoney(total)}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...statusStyle(c.situacion) }}>{c.situacion}</span>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setViewDetail(c)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#ea580c', color: '#ffffff', border: '1px solid #f97316' }}>Ver</button>
                          <button onClick={() => generatePDF(c)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#b91c1c', color: '#ffffff', border: '1px solid #dc2626' }}>PDF</button>
                          <button onClick={() => { setEmailTo(''); setEmailAsunto(''); setEmailMsg(''); setEmailModal(c) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#4169E1', color: '#ffffff', border: '1px solid #3b82f6' }}>Email</button>
                          {permisos.editar && !['Aprobada', 'Rechazada'].includes(c.situacion) && (
                            <button onClick={() => { setSelected(c); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6' }}>Editar</button>
                          )}
                          {permisos.eliminar && c.situacion !== 'Anulada' && (
                            <button onClick={() => {
                              const motivo = prompt(`¿Anular cotización ${c.codigo}?\n\nMotivo (opcional):`, '')
                              if (motivo === null) return
                              const nota = motivo.trim() ? `\n\n[ANULADA] Motivo: ${motivo.trim()}` : '\n\n[ANULADA]'
                              updateCotizacion(c.id, { situacion: 'Anulada', observaciones: (c.observaciones || '') + nota })
                            }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#78350f', color: '#ffffff', border: '1px solid #b45309' }}>Anular</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && <tr><td colSpan={13} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No hay cotizaciones registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'reportes' && (
        <ReportPanel title="Reporte de Cotizaciones" columns={reportColumns} rows={reportRows}
          filters={[{ label: 'Situación', key: 'situacion', options: [...new Set(cotizaciones.map(c => c.situacion).filter(Boolean))] }]} />
      )}
    </div>
  )
}
