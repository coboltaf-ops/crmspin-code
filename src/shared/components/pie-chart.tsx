'use client'
import React from 'react'

interface Slice {
  label: string
  value: number
  extra?: string
}

interface PieChartProps {
  title: string
  data: Slice[]
  size?: number
}

const PALETTE = [
  '#2DD4D4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#a855f7', '#eab308', '#22c55e', '#dc2626',
]

export default function PieChart({ title, data, size = 280 }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
        <h3 style={{ color: '#fbbf24', fontSize: 24, fontWeight: 800, marginBottom: 16 }}>{title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Sin datos para mostrar</p>
      </div>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4

  let cumAngle = -Math.PI / 2 // arrancar arriba
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`

    // Posición del label dentro del slice
    const midAngle = cumAngle - angle / 2
    const labelR = r * 0.6
    const lx = cx + labelR * Math.cos(midAngle)
    const ly = cy + labelR * Math.sin(midAngle)
    const pct = (d.value / total) * 100

    return { path, color: PALETTE[i % PALETTE.length], label: d.label, value: d.value, extra: d.extra, pct, lx, ly }
  })

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
      <h3 style={{ color: '#fbbf24', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{title}</h3>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 20 }}>Total: {total}</p>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((s, i) => (
            <g key={i}>
              <path d={s.path} fill={s.color} stroke="#0f172a" strokeWidth={2} />
              {s.pct >= 5 && (
                <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
                  fontSize={12} fontWeight={700} fill="#fff" style={{ pointerEvents: 'none' }}>
                  {s.pct.toFixed(0)}%
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Leyenda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 280 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{ width: 14, height: 14, background: s.color, borderRadius: 3, flexShrink: 0 }} />
              <span style={{ color: '#ffffff', flex: 1 }}>{s.label}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: 12 }}>
                {s.value} ({s.pct.toFixed(1)}%)
              </span>
              {s.extra && (
                <span style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, marginLeft: 8 }}>
                  {s.extra}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
