import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware de anti-caché para DOCUMENTOS HTML.
 *
 * PROBLEMA QUE RESUELVE:
 *   Tras un deploy, navegadores (sobre todo Safari) seguían sirviendo el HTML
 *   viejo desde su caché de disco. Ese HTML viejo apuntaba al CSS/JS viejo
 *   (que está marcado `immutable`), así que el navegador NUNCA volvía a pedir
 *   el HTML nuevo y nunca veía los estilos nuevos.
 *
 * SOLUCIÓN:
 *   Forzar `Cache-Control: no-store` en TODA respuesta de documento HTML
 *   (navegaciones), en tiempo de ejecución. A diferencia de `headers()` en
 *   next.config (que se aplica sobre prerenders potencialmente cacheados por
 *   la CDN), el middleware corre en cada request y garantiza que el documento
 *   nunca se almacene. Los assets con hash (`/_next/static/...`) NO pasan por
 *   aquí (ver `matcher`), así que conservan su caché `immutable`.
 *
 * NO toca localStorage ni datos: solo cabeceras HTTP.
 */
export function middleware(request: NextRequest) {
  const res = NextResponse.next()

  // Solo afecta a documentos/navegaciones (el matcher ya excluye assets/API).
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('CDN-Cache-Control', 'no-store')
  res.headers.set('Vercel-CDN-Cache-Control', 'no-store')
  // Cabeceras legacy para navegadores que ignoran Cache-Control en heurística.
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')

  return res
}

export const config = {
  // Aplica a todo MENOS:
  //  - /_next/static  (JS/CSS/fuentes con hash → deben quedar immutable)
  //  - /_next/image   (optimización de imágenes)
  //  - /api           (rutas de API gestionan su propia caché)
  //  - favicon y archivos con extensión (assets públicos estáticos)
  matcher: [
    '/((?!_next/static|_next/image|api|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)',
  ],
}
