/**
 * Almacenamiento dual: Vercel KV en producción, JSON en disco en desarrollo.
 *
 * Detecta automáticamente: si las variables KV_REST_API_URL y KV_REST_API_TOKEN
 * están presentes (Vercel inyecta esto al crear una KV database), usa Vercel KV.
 * Si no, lee/escribe en data/{key}.json — comportamiento idéntico al original.
 */
import fs from 'fs'
import path from 'path'

const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

async function getKv() {
  const mod = await import('@vercel/kv')
  return mod.kv
}

function filePath(key: string) {
  return path.join(process.cwd(), 'data', `${key}.json`)
}

export async function readList<T>(key: string): Promise<T[]> {
  if (useKV) {
    try {
      const kv = await getKv()
      const data = await kv.get<T[]>(key)
      return data || []
    } catch (err) {
      console.error('[kv-store] readList error:', err)
      return []
    }
  }
  try {
    const fp = filePath(key)
    if (!fs.existsSync(fp)) return []
    return JSON.parse(fs.readFileSync(fp, 'utf-8'))
  } catch {
    return []
  }
}

export async function writeList<T>(key: string, data: T[]): Promise<void> {
  if (useKV) {
    const kv = await getKv()
    await kv.set(key, data)
    return
  }
  const fp = filePath(key)
  const dir = path.dirname(fp)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
}
