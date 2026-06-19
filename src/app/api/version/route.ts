import { NextResponse } from 'next/server'

// Esta ruta SIEMPRE debe ejecutarse en el servidor en cada request (nunca
// cacheada), para reportar la versión REAL del deploy actual.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const BUILD_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.NEXT_PUBLIC_BUILD_VERSION ||
  'dev'

/**
 * Devuelve la versión del build vivo en producción.
 * El cliente compara esto con la versión embebida en su bundle JS cargado.
 * Si difieren → el navegador está corriendo un bundle viejo (caché) y debe
 * recargar con bypass de caché. No expone datos sensibles.
 */
export function GET() {
  return NextResponse.json(
    { version: BUILD_VERSION },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  )
}
