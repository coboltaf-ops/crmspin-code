/**
 * Calcula el siguiente número consecutivo basado en los códigos existentes.
 * Extrae el número del código (ej: "CLI-00003" → 3) y retorna max + 1.
 */
export function nextConsecutivo(prefix: string, existingCodes: string[]): { nro: number; codigo: string } {
  const maxNro = existingCodes.reduce((max, code) => {
    const match = code.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      return n > max ? n : max
    }
    return max
  }, 0)
  const nro = maxNro + 1
  return { nro, codigo: `${prefix}${String(nro).padStart(5, '0')}` }
}
