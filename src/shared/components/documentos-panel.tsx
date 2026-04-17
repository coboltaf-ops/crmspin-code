'use client'
import { useState, useEffect } from 'react'

interface DocFile {
  filename: string
  nombre: string
  url: string
  tamano: number
  fecha: string
}

interface Props {
  modulo: string
  registroId: string
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function fileEmoji(nombre: string) {
  const ext = nombre.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️'
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xls', 'xlsx'].includes(ext)) return '📊'
  return '📎'
}

export default function DocumentosPanel({ modulo, registroId }: Props) {
  const [files, setFiles] = useState<DocFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputId = `docs-${modulo}-${registroId}`

  const load = async () => {
    const res = await fetch(`/api/documentos?modulo=${modulo}&registroId=${registroId}`)
    const data = await res.json()
    setFiles(data.files ?? [])
  }

  useEffect(() => { load() }, [modulo, registroId])

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setError('')
    setUploading(true)
    for (const file of Array.from(fileList)) {
      if (file.size > 52428800) { setError(`"${file.name}" supera 50 MB`); continue }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('modulo', modulo)
      fd.append('registroId', registroId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error al subir'); }
    }
    setUploading(false)
    await load()
  }

  const handleDelete = async (f: DocFile) => {
    if (!confirm(`¿Eliminar "${f.nombre}"?`)) return
    await fetch(`/api/documentos?modulo=${modulo}&registroId=${registroId}&filename=${encodeURIComponent(f.filename)}`, { method: 'DELETE' })
    await load()
  }

  const panelStyle: React.CSSProperties = {
    marginTop: 24,
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  }
  const headerStyle: React.CSSProperties = {
    background: '#1e3a5f',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    border: '2px dashed rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: '20px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    margin: '12px 16px',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: 16 }}>📁</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>DOCUMENTOS Y FOTOS</span>
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
          {files.length} archivo{files.length !== 1 ? 's' : ''}
        </span>
      </div>

      <label
        htmlFor={inputId}
        style={labelStyle}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>⬆️</div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, margin: 0 }}>
          {uploading ? 'Subiendo...' : 'Clic para seleccionar archivos'}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '4px 0 0' }}>
          Fotos, PDF, Word, Excel · Máx. 50 MB
        </p>
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {error && (
        <p style={{ color: '#fca5a5', fontSize: 12, margin: '0 16px 8px', padding: '6px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
          {error}
        </p>
      )}

      {files.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', padding: '16px 0 20px' }}>
          No hay archivos adjuntos
        </p>
      ) : (
        <div style={{ padding: '0 16px 16px' }}>
          {files.map(f => (
            <div key={f.filename} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 18 }}>{fileEmoji(f.nombre)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#ffffff', fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>
                  {fmtSize(f.tamano)} · {fmtFecha(f.fecha)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: '#86efac', fontSize: 11, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(34,197,94,0.25)' }}>
                  Ver
                </a>
                <button onClick={() => handleDelete(f)} style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: 11, fontWeight: 600, border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
