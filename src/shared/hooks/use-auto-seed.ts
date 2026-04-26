'use client'

import { useEffect } from 'react'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useProductosStore } from '@/features/productos/store/productos-store'
import { useOportunidadesStore } from '@/features/oportunidades/store/oportunidades-store'
import { useProspectosStore } from '@/features/prospectos/store/prospectos-store'
import { usePQRSStore } from '@/features/pqrs/store/pqrs-store'
import { useTareasStore } from '@/features/tareas/store/tareas-store'

const RESET_FLAG = 'crm-reset-v1'

export function useAutoSeed() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(RESET_FLAG)) return

    useClientesStore.setState({ clientes: [] })
    useContactosStore.setState({ contactos: [] })
    useProductosStore.setState({ productos: [] })
    useOportunidadesStore.setState({ oportunidades: [] })
    useProspectosStore.setState({ prospectos: [] })
    usePQRSStore.setState({ pqrs: [] })
    useTareasStore.setState({ tareas: [] })

    localStorage.setItem(RESET_FLAG, '1')
  }, [])
}
