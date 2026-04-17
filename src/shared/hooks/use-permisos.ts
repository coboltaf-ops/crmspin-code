import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'

export function usePermisos(moduloId: string) {
  const user = useCurrentUserStore(s => s.user)
  if (!user) return { leer: false, editar: false, eliminar: false, esAdmin: false }
  const esAdmin = user.rol.toLowerCase() === 'admin'
  if (esAdmin) return { leer: true, editar: true, eliminar: true, esAdmin: true }
  const p = user.permisos?.find(p => p.modulo === moduloId)
  return { leer: p?.leer ?? false, editar: p?.editar ?? false, eliminar: p?.eliminar ?? false, esAdmin }
}
