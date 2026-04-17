'use client'
import { useEffect, useRef } from 'react'
import { useFlujosStore } from '../store/flujos-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useOportunidadesStore } from '@/features/oportunidades/store/oportunidades-store'
import { useCotizacionesStore } from '@/features/cotizaciones/store/cotizaciones-store'
import { useProspectosStore } from '@/features/prospectos/store/prospectos-store'
import { usePQRSStore } from '@/features/pqrs/store/pqrs-store'
import { useTareasStore } from '@/features/tareas/store/tareas-store'
import { ejecutarFlujos, ejecutarFlujoProgramado } from './ejecutor'

// Hook que escucha cambios en los stores y dispara flujos activos
export function useFlujoListener() {
  const flujos = useFlujosStore(s => s.flujos)
  const hasActiveFlujos = flujos.some(f => f.activo)

  const clientes = useClientesStore(s => s.clientes)
  const contactos = useContactosStore(s => s.contactos)
  const oportunidades = useOportunidadesStore(s => s.oportunidades)
  const cotizaciones = useCotizacionesStore(s => s.cotizaciones)
  const prospectos = useProspectosStore(s => s.prospectos)
  const pqrs = usePQRSStore(s => s.pqrs)
  const tareas = useTareasStore(s => s.tareas)

  // Refs para detectar cambios
  const prevRef = useRef<Record<string, number>>({})
  const initialized = useRef(false)
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Listener de cambios en registros
  useEffect(() => {
    if (!hasActiveFlujos) return

    const counts: Record<string, number> = {
      clientes: clientes.length,
      contactos: contactos.length,
      oportunidades: oportunidades.length,
      cotizaciones: cotizaciones.length,
      prospectos: prospectos.length,
      pqrs: pqrs.length,
      tareas: tareas.length,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records: Record<string, any[]> = {
      clientes, contactos, oportunidades, cotizaciones, prospectos, pqrs, tareas,
    }

    // Skip first render (initialization)
    if (!initialized.current) {
      prevRef.current = { ...counts }
      initialized.current = true
      return
    }

    // Detectar nuevos registros (record_created)
    for (const modulo of Object.keys(counts)) {
      const prev = prevRef.current[modulo] || 0
      const curr = counts[modulo]
      if (curr > prev) {
        const nuevoRegistro = records[modulo][curr - 1]
        if (nuevoRegistro) {
          ejecutarFlujos(modulo, 'record_created', nuevoRegistro)
        }
      }
    }

    prevRef.current = { ...counts }
  }, [hasActiveFlujos, clientes, contactos, oportunidades, cotizaciones, prospectos, pqrs, tareas])

  // Scheduler para flujos programados - revisa cada 30 segundos
  useEffect(() => {
    if (schedulerRef.current) clearInterval(schedulerRef.current)

    schedulerRef.current = setInterval(() => {
      const { flujos: currentFlujos } = useFlujosStore.getState()
      const ahora = new Date()
      const fechaHoy = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
      const horaAhora = ahora.toLocaleTimeString('en-CA', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false })

      const programados = currentFlujos.filter(f =>
        f.activo &&
        f.trigger === 'scheduled' &&
        !f.ejecutado_programado &&
        f.fecha_programada &&
        f.fecha_programada <= fechaHoy &&
        (!f.hora_programada || f.hora_programada <= horaAhora)
      )

      for (const flujo of programados) {
        ejecutarFlujoProgramado(flujo)
        // Marcar como ejecutado
        useFlujosStore.getState().updateFlujo(flujo.id, { ejecutado_programado: true })
      }
    }, 30000) // cada 30 segundos

    return () => { if (schedulerRef.current) clearInterval(schedulerRef.current) }
  }, [])
}
