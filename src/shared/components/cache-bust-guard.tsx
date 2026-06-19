'use client'
import { useCacheBust } from '@/shared/hooks/use-cache-bust'

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev'

/**
 * Monta el guard de caché en TODA la app (incluido /login y páginas públicas),
 * no solo en el área autenticada. Así, un navegador atascado con HTML/JS viejo
 * se auto-repara en la primera pantalla que vea, sin necesidad de loguearse.
 * No renderiza nada visible.
 */
export function CacheBustGuard() {
  useCacheBust(BUILD_VERSION)
  return null
}
