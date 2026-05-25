'use client'
import { useState, useRef } from 'react'

interface BackupRestoreButtonsProps {
  modulo: string
  label: string
  registros: any[]
  onClear: () => void
  onRestore: (registros: any[]) => void
}

export default function BackupRestoreButtons({ modulo, label, registros, onClear, onRestore }: BackupRestoreButtonsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBackup = () => {
    const data = JSON.stringify(registros, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${modulo}-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (Array.isArray(data)) {
          onRestore(data)
          alert(`✅ ${data.length} registros restaurados en ${label}`)
        }
      } catch (err) {
        alert('❌ Error al leer archivo')
      }
    }
    reader.readAsText(file)
  }

  const handleClear = () => {
    if (!confirm(`⚠️ Eliminar TODOS los ${registros.length} registros de ${label}?\n\nEsta acción NO se puede deshacer.`)) return
    const txt = prompt('Para confirmar, escribe: ELIMINAR TODO')
    if (txt !== 'ELIMINAR TODO') return
    onClear()
    alert(`✅ ${label} eliminados`)
  }

  const btnStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button onClick={handleBackup} style={btnStyle} title={`Descargar JSON de ${registros.length} registros`}>
        💾 Descargar
      </button>
      <button onClick={() => fileInputRef.current?.click()} style={btnStyle} title={`Restaurar desde archivo JSON`}>
        📂 Restaurar
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleRestore}
        style={{ display: 'none' }}
      />
      {registros.length > 0 && (
        <button onClick={handleClear} style={{ ...btnStyle, color: '#fca5a5', borderColor: 'rgba(252,165,165,0.3)' }} title={`Eliminar todos los registros`}>
          🗑️ Eliminar Base
        </button>
      )}
    </div>
  )
}
