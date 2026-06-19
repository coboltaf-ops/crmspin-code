import type { NextConfig } from "next";

// Versión del build: fija al hacer `next build`. Sirve para detectar deploys
// nuevos y evitar que el navegador sirva CSS/JS viejo desde caché.
const BUILD_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || String(Date.now());

const nextConfig: NextConfig = {
  // Oculta el indicador de Next.js en desarrollo.
  devIndicators: false,

  env: {
    NEXT_PUBLIC_BUILD_VERSION: BUILD_VERSION,
  },

  // Headers de caché — evita que Safari/Chrome sirvan HTML/CSS/JS antiguo.
  // Sin esto, tras un deploy el navegador sigue mostrando los estilos viejos.
  async headers() {
    return [
      {
        // Estáticos con hash en el nombre (JS, CSS, fuentes): cacheables para
        // siempre porque al cambiar el contenido cambia el hash del archivo.
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // HTML: el navegador y la CDN deben revalidar SIEMPRE, para tomar el
        // último bundle (los estilos nuevos) en cada deploy.
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
