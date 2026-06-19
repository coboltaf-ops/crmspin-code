'use client'
import { useEffect } from 'react'

/**
 * Auto cache-bust BLINDADO. Resuelve dos causas de "no se actualiza tras deploy":
 *
 *   1) bfcache de Safari: si la página se restaura desde el back-forward cache,
 *      la recargamos para tomar el bundle nuevo.
 *
 *   2) HTML/JS viejo cacheado en disco (la causa real en este proyecto): el
 *      navegador sirve un bundle antiguo que apunta a CSS/JS antiguos
 *      (marcados `immutable`) y nunca vuelve a pedir el HTML nuevo. Para
 *      romperlo, consultamos /api/version (respuesta `no-store`, siempre
 *      fresca del servidor) y la comparamos con la versión embebida en ESTE
 *      bundle. Si difieren, el bundle es viejo → recargamos UNA vez con
 *      bypass de caché.
 *
 * IMPORTANTE: NO borra localStorage ni datos. Solo recarga la página y, como
 * mucho, limpia el Cache Storage del navegador (que NO contiene datos del CRM,
 * solo assets). Los datos de Zustand persist quedan intactos.
 */
const RELOAD_GUARD = 'crm-cache-bust-reloaded'

async function clearAssetCaches() {
  // Borra SOLO el Cache Storage (assets). No toca localStorage/sessionStorage.
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* sin permisos: ignorar */
  }
}

function hardReload() {
  // Marca para evitar bucle infinito de recargas dentro de la misma sesión.
  try {
    sessionStorage.setItem(RELOAD_GUARD, '1')
  } catch {
    /* ignorar */
  }
  // Bypass de caché del documento añadiendo un parámetro efímero.
  const url = new URL(window.location.href)
  url.searchParams.set('_v', Date.now().toString())
  window.location.replace(url.toString())
}

export function useCacheBust(buildVersion: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // (1) bfcache: recargar si la página viene restaurada de la caché de Safari.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', onPageShow)

    // (2) Comparar versión viva del servidor vs versión de este bundle.
    let cancelled = false
    const checkVersion = async () => {
      // Si ya recargamos en esta sesión, no insistir (evita bucles).
      let alreadyReloaded = false
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD) === '1'
      } catch {
        /* ignorar */
      }
      if (alreadyReloaded) return

      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const data: { version?: string } = await res.json()
        const serverVersion = data?.version
        if (cancelled || !serverVersion || serverVersion === 'dev') return

        // El bundle cargado es viejo respecto al deploy vivo → romper caché.
        if (serverVersion !== buildVersion) {
          await clearAssetCaches()
          hardReload()
        }
      } catch {
        /* sin red o error: no hacer nada */
      }
    }
    checkVersion()

    return () => {
      cancelled = true
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [buildVersion])
}
