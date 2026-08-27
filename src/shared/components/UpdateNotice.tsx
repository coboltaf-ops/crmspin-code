'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Detecta cuando se publica una versión nueva del sistema y avisa al usuario
 * para que actualice (sin perder lo que esté haciendo). Reemplaza la necesidad
 * de limpiar el caché del navegador a mano.
 */
export function UpdateNotice() {
  const initialVersion = useRef<string | null>(null)
  const [hayActualizacion, setHayActualizacion] = useState(false)

  useEffect(() => {
    let activo = true

    const checkVersion = async () => {
      try {
        const res = await fetch('/api/app-version', { cache: 'no-store' })
        if (!res.ok) return
        const { version } = await res.json()
        if (!version) return
        if (initialVersion.current === null) {
          initialVersion.current = version // primera vez: guardamos la versión cargada
        } else if (version !== initialVersion.current) {
          if (activo) setHayActualizacion(true)
        }
      } catch {
        /* sin conexión: ignorar */
      }
    }

    checkVersion() // al cargar
    const intervalo = setInterval(checkVersion, 120000) // cada 2 minutos
    const onFocus = () => checkVersion() // y cuando el usuario vuelve a la pestaña
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      activo = false
      clearInterval(intervalo)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  if (!hayActualizacion) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#1e3a8a',
        color: '#ffffff',
        borderRadius: 14,
        padding: '12px 18px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        maxWidth: '92vw',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600 }}>
        🔄 Hay una versión nueva del sistema
      </span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#ffffff',
          color: '#1e3a8a',
          fontWeight: 800,
          fontSize: 13,
          border: 'none',
          borderRadius: 9,
          padding: '7px 14px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Actualizar
      </button>
    </div>
  )
}

