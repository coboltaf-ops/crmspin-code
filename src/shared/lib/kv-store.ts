/**
 * Almacenamiento dual:
 *   - Producción (Vercel Blob): si existe BLOB_READ_WRITE_TOKEN, persiste JSON en Vercel Blob.
 *   - Fallback legacy Vercel KV: si existen KV_REST_API_URL + KV_REST_API_TOKEN.
 *   - Desarrollo local: lee/escribe en data/{key}.json.
 *
 * API: readList<T>(key) / writeList<T>(key, data).
 */
import fs from 'fs'
import path from 'path'
import type { PutBlobResult } from '@vercel/blob'

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

function filePath(key: string) {
  return path.join(process.cwd(), 'data', `${key}.json`)
}

function blobPath(key: string) {
  return `kv/${key}.json`
}

async function readBlobList<T>(key: string): Promise<T[]> {
  const { list } = await import('@vercel/blob')
  const target = blobPath(key)
  const { blobs } = await list({ prefix: target, limit: 1 })
  const found = blobs.find(b => b.pathname === target)
  if (!found) return []
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(found.url, { cache: 'no-store', headers })
  if (!res.ok) return []
  const data = (await res.json()) as T[]
  return Array.isArray(data) ? data : []
}

async function writeBlobList<T>(key: string, data: T[]): Promise<PutBlobResult> {
  const { put } = await import('@vercel/blob')
  const opts = {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    addRandomSuffix: false,
  } as unknown as Parameters<typeof put>[2]
  return put(blobPath(key), JSON.stringify(data), opts)
}

export async function readList<T>(key: string): Promise<T[]> {
  if (useBlob) {
    try { return await readBlobList<T>(key) }
    catch (err) { console.error('[kv-store] readBlobList error:', err); return [] }
  }
  if (useKV) {
    try {
      const mod = await import('@vercel/kv')
      const data = await mod.kv.get<T[]>(key)
      return data || []
    } catch (err) {
      console.error('[kv-store] kv.get error:', err)
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
  if (useBlob) {
    await writeBlobList(key, data)
    return
  }
  if (useKV) {
    const mod = await import('@vercel/kv')
    await mod.kv.set(key, data)
    return
  }
  const fp = filePath(key)
  const dir = path.dirname(fp)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8')
}
