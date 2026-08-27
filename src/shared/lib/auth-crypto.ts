import crypto from 'crypto'

/**
 * Motor de login seguro (estándar Palomares).
 * - Cifra las claves con scrypt (no se guardan en texto plano).
 * - Firma la sesión con HMAC (cookie httpOnly), no se puede falsificar.
 * - Soporta claves legadas en texto plano durante la migración (se cifran al primer login).
 * Usa solo el módulo nativo `crypto` de Node — sin dependencias externas.
 */

const SECRET =
  process.env.AUTH_SESSION_SECRET ||
  process.env.KV_REST_API_TOKEN ||
  'palomares-dev-secret-cambiar'

// ── Claves ───────────────────────────────────────────────
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function isHashed(stored: string | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith('scrypt$')
}

export function verifyPassword(plain: string, stored: string | undefined): boolean {
  if (!stored) return false
  if (isHashed(stored)) {
    const [, salt, hash] = stored.split('$')
    const test = crypto.scryptSync(plain, salt, 64).toString('hex')
    const a = Buffer.from(hash, 'hex')
    const b = Buffer.from(test, 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  }
  // Clave legada en texto plano (solo durante la migración).
  return stored === plain
}

// ── Sesión (token firmado para cookie httpOnly) ──────────
export function signSession(payload: Record<string, unknown>): string {
  const data = { ...payload, exp: Date.now() + 1000 * 60 * 60 * 12 } // 12 h
  const body = Buffer.from(JSON.stringify(data)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifySession(token: string | undefined): Record<string, unknown> | null {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}
