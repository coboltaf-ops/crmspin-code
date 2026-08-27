import { NextResponse } from 'next/server'

// Devuelve un identificador único del deploy actual (cambia en cada publicación).
export const dynamic = 'force-dynamic'

export function GET() {
  const version =
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_URL ||
    'dev'

  return NextResponse.json(
    { version },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
