'use client'
import { useRouter } from 'next/navigation'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useProductosStore } from '@/features/productos/store/productos-store'
import { useOportunidadesStore } from '@/features/oportunidades/store/oportunidades-store'
import { useCotizacionesStore } from '@/features/cotizaciones/store/cotizaciones-store'
import { usePQRSStore } from '@/features/pqrs/store/pqrs-store'
import { useProspectosStore } from '@/features/prospectos/store/prospectos-store'
import { fmtMoney } from '@/shared/lib/format-number'
import PieChart from '@/shared/components/pie-chart'

export default function DashboardPage() {
  const router = useRouter()
  const clientes = useClientesStore(s => s.clientes)
  const contactos = useContactosStore(s => s.contactos)
  const productos = useProductosStore(s => s.productos)
  const oportunidades = useOportunidadesStore(s => s.oportunidades)
  const cotizaciones = useCotizacionesStore(s => s.cotizaciones)
  const pqrs = usePQRSStore(s => s.pqrs)
  const prospectos = useProspectosStore(s => s.prospectos)

  const opoAbiertas = oportunidades.filter(o => o.situacion === 'Abierta' || o.situacion === 'En Negociación')
  const totalPipeline = opoAbiertas.reduce((s, o) => s + o.valor_estimado, 0)
  const pqrsAbiertas = pqrs.filter(p => p.situacion !== 'Cerrada')


  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 24,
  }

  const cards = [
    { label: 'Clientes', value: clientes.length, icon: '🏢', color: '#60a5fa', href: '/clientes' },
    { label: 'Contactos', value: contactos.length, icon: '👤', color: '#a78bfa', href: '/contactos' },
    { label: 'Oportunidades', value: opoAbiertas.length, icon: '🎯', color: '#93c5fd', href: '/oportunidades' },
    { label: 'Cotizaciones', value: cotizaciones.length, icon: '📋', color: '#fbbf24', href: '/cotizaciones' },
    { label: 'PQRS Abiertas', value: pqrsAbiertas.length, icon: '📩', color: '#f87171', href: '/pqrs' },
    { label: 'Productos', value: productos.length, icon: '📦', color: '#60a5fa', href: '/productos' },
  ]

  const clickable: React.CSSProperties = { cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease' }
  const onHoverIn = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(-3px)'
    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)'
    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
  }
  const onHoverOut = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = 'none'
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
  }

  // PQRS por tipo
  const pqrsPorTipo = ['Petición', 'Queja', 'Reclamo', 'Sugerencia'].map(t => ({
    tipo: t, count: pqrs.filter(p => p.tipo === t).length,
    abiertas: pqrs.filter(p => p.tipo === t && p.situacion !== 'Cerrada').length,
  }))
  const tipoIcons: Record<string, string> = { 'Petición': '📝', 'Queja': '😤', 'Reclamo': '⚠️', 'Sugerencia': '💡' }

  // Prospectos por situación y procedencia
  const groupCount = (key: 'situacion' | 'origen_prospecto') => {
    const map = new Map<string, number>()
    for (const p of prospectos) {
      const v = (p[key] || 'Sin definir').toString().trim() || 'Sin definir'
      map.set(v, (map.get(v) || 0) + 1)
    }
    return Array.from(map.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
  }
  const prospectosPorSituacion = groupCount('situacion')
  const prospectosPorOrigen = groupCount('origen_prospecto')
  const barColors = ['#3b82f6', '#a855f7', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4', '#ef4444', '#84cc16', '#eab308', '#14b8a6']

  // Clientes por Macro Sector
  const clientesPorMacroSector = (() => {
    const map = new Map<string, number>()
    for (const c of clientes) {
      const v = (c.macro_sector || 'Sin definir').toString().trim() || 'Sin definir'
      map.set(v, (map.get(v) || 0) + 1)
    }
    return Array.from(map.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
  })()

  // Oportunidades por etapa
  const etapas = ['Prospección', 'Calificación', 'Propuesta', 'Negociación', 'Cierre']
  const opoPorEtapa = etapas.map(e => ({
    etapa: e,
    count: oportunidades.filter(o => o.etapa === e && (o.situacion === 'Abierta' || o.situacion === 'En Negociación')).length,
    valor: oportunidades.filter(o => o.etapa === e && (o.situacion === 'Abierta' || o.situacion === 'En Negociación')).reduce((s, o) => s + o.valor_estimado, 0),
  }))

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 24 }}>Dashboard</h1>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} onClick={() => router.push(c.href)} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} style={{ ...cardStyle, ...clickable }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <span style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.value}</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{c.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Embudo de Oportunidades */}
        <div onClick={() => router.push('/oportunidades')} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} style={{ ...cardStyle, ...clickable }}>
          <h2 style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Embudo de Ventas</h2>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Oportunidades</p>
              <p style={{ color: '#ffffff', fontSize: 28, fontWeight: 900 }}>{opoAbiertas.length}</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Valor Total</p>
              <p style={{ color: '#ffffff', fontSize: 28, fontWeight: 900 }}>${fmtMoney(totalPipeline)}</p>
            </div>
          </div>
          {(() => {
            const funnelColors = ['#3b82f6', '#a855f7', '#f59e0b', '#3b82f6', '#ec4899']
            const funnelData = opoPorEtapa.filter(e => e.count > 0)
            const maxCount = Math.max(...opoPorEtapa.map(e => e.count), 1)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {funnelData.map((e, i) => {
                  const widthPct = 40 + (e.count / maxCount) * 60
                  const color = funnelColors[opoPorEtapa.indexOf(e) % funnelColors.length]
                  return (
                    <div key={e.etapa} style={{ width: `${widthPct}%`, minWidth: 200, background: color, borderRadius: i === 0 ? '10px 10px 4px 4px' : i === funnelData.length - 1 ? '4px 4px 10px 10px' : '4px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'width 0.3s ease' }}>
                      <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>{e.etapa}</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600 }}>${fmtMoney(e.valor)}</span>
                        <span style={{ color: '#ffffff', fontSize: 15, fontWeight: 900, background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '2px 10px' }}>{e.count}</span>
                      </div>
                    </div>
                  )
                })}
                {funnelData.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Sin oportunidades abiertas</p>}
              </div>
            )
          })()}
        </div>

        {/* Cotizaciones resumen */}
        <div onClick={() => router.push('/cotizaciones')} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} style={{ ...cardStyle, ...clickable }}>
          <h2 style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Cotizaciones</h2>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Total</p>
              <p style={{ color: '#ffffff', fontSize: 28, fontWeight: 900 }}>{cotizaciones.length}</p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Valor Total</p>
              <p style={{ color: '#ffffff', fontSize: 28, fontWeight: 900 }}>${fmtMoney(cotizaciones.reduce((sum, c) => sum + (c.detalles || []).reduce((sd: number, d: { subtotal: number }) => sd + d.subtotal, 0), 0))}</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['En Construcción', 'Enviada', 'Aprobada', 'Rechazada', 'Vencida', 'Anulada'].map(s => {
              const items = cotizaciones.filter(c => c.situacion === s)
              if (items.length === 0) return null
              const valor = items.reduce((sum, c) => sum + (c.detalles || []).reduce((sd: number, d: { subtotal: number }) => sd + d.subtotal, 0), 0)
              const colors: Record<string, string> = { 'En Construcción': '#93c5fd', 'Enviada': '#86efac', 'Aprobada': '#60a5fa', 'Rechazada': '#fca5a5', 'Vencida': '#fcd34d', 'Anulada': '#d1d5db' }
              return (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: colors[s] || '#fff', fontSize: 12, fontWeight: 600 }}>{s}</span>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ color: '#ffffff', fontSize: 12, fontWeight: 600 }}>${fmtMoney(valor)}</span>
                    <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 800 }}>{items.length}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* PQRS por tipo */}
        <div onClick={() => router.push('/pqrs')} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} style={{ ...cardStyle, ...clickable }}>
          <h2 style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 16 }}>PQRS por Tipo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {pqrsPorTipo.map(t => (
              <div key={t.tipo} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 24 }}>{tipoIcons[t.tipo]}</span>
                <p style={{ color: '#ffffff', fontSize: 18, fontWeight: 800 }}>{t.count}</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{t.tipo}</p>
                {t.abiertas > 0 && <p style={{ color: '#fca5a5', fontSize: 10 }}>{t.abiertas} abiertas</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Prospectos por Situación (PIE) */}
        <div onClick={() => router.push('/prospectos')} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} style={{ ...cardStyle, ...clickable }}>
          <h2 style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Prospectos por Situación</h2>
          {prospectosPorSituacion.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Sin prospectos registrados</p>
          ) : (() => {
            const total = prospectosPorSituacion.reduce((s, x) => s + x.count, 0)
            const cx = 90, cy = 90, r = 80, ir = 45
            let acc = 0
            const slices = prospectosPorSituacion.map((s, i) => {
              const start = (acc / total) * Math.PI * 2
              acc += s.count
              const end = (acc / total) * Math.PI * 2
              const large = end - start > Math.PI ? 1 : 0
              const x1 = cx + r * Math.sin(start), y1 = cy - r * Math.cos(start)
              const x2 = cx + r * Math.sin(end), y2 = cy - r * Math.cos(end)
              const xi1 = cx + ir * Math.sin(start), yi1 = cy - ir * Math.cos(start)
              const xi2 = cx + ir * Math.sin(end), yi2 = cy - ir * Math.cos(end)
              const d = total === s.count
                ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} L ${cx - 0.01} ${cy - ir} A ${ir} ${ir} 0 1 0 ${cx} ${cy - ir} Z`
                : `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`
              return { d, color: barColors[i % barColors.length], label: s.label, count: s.count, pct: ((s.count / total) * 100).toFixed(0) }
            })
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <svg width={180} height={180} viewBox="0 0 180 180">
                  {slices.map(s => <path key={s.label} d={s.d} fill={s.color} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />)}
                  <text x={cx} y={cy - 4} textAnchor="middle" fill="#ffffff" fontSize={20} fontWeight={900}>{total}</text>
                  <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10}>Total</text>
                </svg>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {slices.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                      <span style={{ color: '#ffffff', fontWeight: 600, flex: 1 }}>{s.label}</span>
                      <span style={{ color: '#ffffff', fontWeight: 800 }}>{s.count}</span>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, width: 32, textAlign: 'right' }}>{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Prospectos por Procedencia */}
        <div onClick={() => router.push('/prospectos')} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} style={{ ...cardStyle, ...clickable }}>
          <h2 style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Prospectos por Procedencia</h2>
          {prospectosPorOrigen.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Sin prospectos registrados</p>
          ) : (() => {
            const max = prospectosPorOrigen[0].count
            const chartH = 180
            return (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: chartH + 50, padding: '0 4px' }}>
                {prospectosPorOrigen.map((o, i) => {
                  const h = max ? (o.count / max) * chartH : 0
                  const color = barColors[(i + 3) % barColors.length]
                  return (
                    <div key={o.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 50 }}>
                      <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 800 }}>{o.count}</span>
                      <div style={{ width: '100%', maxWidth: 60, height: h, background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`, borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease', boxShadow: `0 -2px 8px ${color}44` }} />
                      <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, textAlign: 'center', wordBreak: 'break-word', maxWidth: 80 }}>{o.label}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Clientes por Macro Sector — Pie */}
        <div onClick={() => router.push('/clientes')} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} style={{ ...cardStyle, ...clickable }}>
          <h2 style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Clientes por Macro Sector</h2>
          {clientesPorMacroSector.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Sin clientes registrados</p>
          ) : (() => {
            const total = clientesPorMacroSector.reduce((s, x) => s + x.count, 0)
            const cx = 110, cy = 110, r = 95
            let startAngle = -Math.PI / 2
            const slices = clientesPorMacroSector.map((s, i) => {
              const angle = (s.count / total) * Math.PI * 2
              const endAngle = startAngle + angle
              const x1 = cx + r * Math.cos(startAngle)
              const y1 = cy + r * Math.sin(startAngle)
              const x2 = cx + r * Math.cos(endAngle)
              const y2 = cy + r * Math.sin(endAngle)
              const largeArc = angle > Math.PI ? 1 : 0
              const path = clientesPorMacroSector.length === 1
                ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
                : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
              const midAngle = startAngle + angle / 2
              const labelX = cx + (r * 0.62) * Math.cos(midAngle)
              const labelY = cy + (r * 0.62) * Math.sin(midAngle)
              const pct = ((s.count / total) * 100).toFixed(0)
              startAngle = endAngle
              return { path, color: barColors[i % barColors.length], label: s.label, count: s.count, pct, labelX, labelY }
            })
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <svg width={220} height={220} viewBox="0 0 220 220" style={{ flexShrink: 0 }}>
                  {slices.map((s, i) => (
                    <g key={i}>
                      <path d={s.path} fill={s.color} stroke="#172554" strokeWidth={2} />
                      {parseInt(s.pct) >= 6 && (
                        <text x={s.labelX} y={s.labelY} fill="#ffffff" fontSize={11} fontWeight={800} textAnchor="middle" dominantBaseline="middle">{s.pct}%</text>
                      )}
                    </g>
                  ))}
                </svg>
                <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {slices.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 12, height: 12, background: s.color, borderRadius: 3, flexShrink: 0 }} />
                      <span style={{ color: '#ffffff', flex: 1, fontWeight: 600 }}>{s.label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>{s.count}</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', width: 36, textAlign: 'right' }}>{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Actividad reciente */}
        <div style={cardStyle}>
          <h2 style={{ color: '#ef4444', fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Resumen General</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { l: 'Clientes Activos', v: clientes.filter(c => c.situacion === 'Activo').length, c: '#60a5fa', href: '/clientes' },
              { l: 'Contactos Principales', v: contactos.filter(c => c.es_principal).length, c: '#a78bfa', href: '/contactos' },
              { l: 'Productos Activos', v: productos.filter(p => p.situacion === 'Activo').length, c: '#60a5fa', href: '/productos' },
              { l: 'Oportunidades Ganadas', v: oportunidades.filter(o => o.situacion === 'Ganada').length, c: '#93c5fd', href: '/oportunidades' },
              { l: 'PQRS Urgentes', v: pqrs.filter(p => p.prioridad === 'Urgente' && p.situacion !== 'Cerrada').length, c: '#fca5a5', href: '/pqrs' },
            ].map((row, idx, arr) => (
              <div key={row.l} onClick={() => router.push(row.href)}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.paddingLeft = '8px' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.paddingLeft = '0px' }}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none', cursor: 'pointer', borderRadius: 6, transition: 'all 0.15s ease' }}>
                <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 600 }}>{row.l}</span>
                <span style={{ color: row.c, fontWeight: 800 }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cotizaciones Aprobadas por Vendedor */}
      {(() => {
        const aprobadas = ['Aprobada', 'Aceptada', 'Entregada', 'Realizada']
        const counts: Record<string, number> = {}
        cotizaciones.forEach(c => {
          if (!aprobadas.includes(c.situacion)) return
          const v = (c.vendedor || '').trim() || '(sin vendedor)'
          counts[v] = (counts[v] || 0) + 1
        })
        const data = Object.entries(counts)
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value)
        return (
          <div style={{ marginBottom: 24 }}>
            <PieChart title="Cotizaciones Aprobadas por Vendedor" data={data} />
          </div>
        )
      })()}
    </div>
  )
}
