'use client'
import { useState } from 'react'
import { exportToPDF, exportToExcel, printReport } from '@/shared/lib/export-report'
import { useEmpresaStore } from '@/features/empresa/store/empresa-store'

type Column = { header: string; key: string; width?: number }
type FilterDef = { label: string; key: string; options: string[] }

interface Props {
  title: string; columns: Column[]; rows: Record<string, string | number>[]
  filters?: FilterDef[]; summableKeys?: string[]
}

export default function ReportPanel({ title, columns, rows, filters = [], summableKeys = [] }: Props) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [selectedCols, setSelectedCols] = useState<string[]>(columns.map(c => c.key))
  const empresa = useEmpresaStore(s => s.empresas[0])

  const filtered = rows.filter(r => Object.entries(activeFilters).every(([k, v]) => !v || String(r[k]) === v))
  const visibleCols = columns.filter(c => selectedCols.includes(c.key))

  const opts = {
    title, columns: visibleCols, rows: filtered, filename: title.replace(/\s+/g, '_'),
    empresa: empresa ? { nombre: empresa.nombre, nro_documento: empresa.nro_documento, direccion: empresa.direccion, ciudad: empresa.ciudad, logo_url: empresa.logo_url } : undefined,
  }

  const inputStyle: React.CSSProperties = { background: '#1e3a8a', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '6px 10px', borderRadius: 8, fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      {filters.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <select key={f.key} value={activeFilters[f.key] || ''} onChange={e => setActiveFilters(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}>
              <option value="">{f.label}: Todos</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
      )}

      {/* Column toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Columnas a incluir ({selectedCols.length} de {columns.length})</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setSelectedCols(columns.map(c => c.key))} style={{ ...inputStyle, cursor: 'pointer', fontSize: 11, padding: '4px 10px' }}>Todas</button>
            <button onClick={() => setSelectedCols(columns.slice(0, 4).map(c => c.key))} style={{ ...inputStyle, cursor: 'pointer', fontSize: 11, padding: '4px 10px' }}>Mínimo</button>
            <button onClick={() => setSelectedCols([])} style={{ ...inputStyle, cursor: 'pointer', fontSize: 11, padding: '4px 10px', background: '#64748b' }}>Ninguna</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {columns.map(c => {
            const checked = selectedCols.includes(c.key)
            return (
              <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: checked ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${checked ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', fontSize: 12, color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setSelectedCols(prev => prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key])}
                  style={{ cursor: 'pointer' }}
                />
                {c.header}
              </label>
            )
          })}
        </div>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => exportToPDF(opts)} disabled={filtered.length === 0} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#b91c1c', color: '#ffffff', border: '1px solid #dc2626', cursor: 'pointer' }}>PDF</button>
        <button onClick={() => exportToExcel(opts)} disabled={filtered.length === 0} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#2563eb', color: '#ffffff', border: '1px solid #3b82f6', cursor: 'pointer' }}>Excel</button>
        <button onClick={() => printReport(opts)} disabled={filtered.length === 0} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#000000', color: '#ffffff', border: '1px solid #333333', cursor: 'pointer' }}>Imprimir</button>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, alignSelf: 'center' }}>{filtered.length} registros</span>
      </div>

      {/* Preview */}
      {filtered.length > 0 && (
        <div style={{ maxHeight: 400, overflow: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{visibleCols.map(c => <th key={c.key} style={{ padding: '10px 12px', background: '#1e3a8a', color: '#fff', fontSize: 11, textAlign: 'left', position: 'sticky', top: 0 }}>{c.header}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                  {visibleCols.map(c => <td key={c.key} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{r[c.key]}</td>)}
                </tr>
              ))}
              {summableKeys.length > 0 && (
                <tr style={{ background: 'rgba(255,255,255,0.1)', fontWeight: 700 }}>
                  {visibleCols.map(c => <td key={c.key} style={{ padding: '10px 12px', fontSize: 12, color: '#60a5fa', borderTop: '2px solid rgba(59,130,246,0.3)' }}>
                    {summableKeys.includes(c.key) ? filtered.reduce((s, r) => s + (typeof r[c.key] === 'number' ? r[c.key] as number : 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : c === visibleCols[0] ? 'TOTALES' : ''}
                  </td>)}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
