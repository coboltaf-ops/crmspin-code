import { readList, writeList } from './kv-store'
import { hashPassword } from './auth-crypto'
import { PERMISOS_DEFAULT } from '@/features/usuarios-gestion/types'

export const USUARIOS_KEY = 'usuarios-datos'

/**
 * Usuarios SEMILLA (se crean automáticamente la primera vez, ya cifrados):
 *  - admin / admin123  (admin inicial)
 *  - jpalomares / 8002colombiacrm2026  (llave maestra de José)
 */
function semilla() {
  return [
    {
      id: 'admin-1', nombre: 'Admin', apellido: 'CRM', usuario: 'admin',
      clave: hashPassword('admin123'), correo: 'admin@crmspin.com',
      rol: 'Admin', situacion: 'Activo', permisos: PERMISOS_DEFAULT['Admin'],
    },
    {
      id: 'jpalomares-maestro', nombre: 'Jose', apellido: 'Palomares', usuario: 'jpalomares',
      clave: hashPassword('8002colombiacrm2026'), correo: 'jpalomares@palomares.com',
      rol: 'Admin', situacion: 'Activo', permisos: PERMISOS_DEFAULT['Admin'],
    },
  ]
}

// Lee los usuarios de la nube; si está vacío, los siembra y guarda.
export async function getUsuariosServer(): Promise<Record<string, unknown>[]> {
  const users = await readList<Record<string, unknown>>(USUARIOS_KEY)
  if (!users || users.length === 0) {
    const seed = semilla()
    await writeList(USUARIOS_KEY, seed)
    return seed
  }
  return users
}
