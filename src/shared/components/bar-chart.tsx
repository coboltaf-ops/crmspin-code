'use client'

interface Bar {
  label: string
  value: number
}

interface BarChartProps {
  title: string
  data: Bar[]
  height?: number
}

const PALETTE = [
  '#2DD4D4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

export default function BarChart({ title, data, height = 280 }: BarChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const max = Math.max(...data.map(d => d.value), 1)

  if (data.length === 0 || total === 0) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
        <h3 style={{ color: '#fbbf24', fontSize: 24, fontWeight: 800, marginBottom: 16 }}>{title}</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Sin datos para mostrar</p>
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
      <h3 style={{ color: '#fbbf24', fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{title}</h3>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 20 }}>Total: {total}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: height }}>
        {data.map((d, i) => {
          const widthPct = (d.value / max) * 100
          const color = PALETTE[i % PALETTE.length]
          return (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 140, color: '#ffffff', fontSize: 13, fontWeight: 600, textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.label}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: `${widthPct}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                  <span style={{ color: '#ffffff', fontSize: 12, fontWeight: 700 }}>{d.value}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
