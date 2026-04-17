import { useFlujosStore, Flujo, Condicion, Accion, Ejecucion } from '../store/flujos-store'
import { useTareasStore } from '@/features/tareas/store/tareas-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useOportunidadesStore } from '@/features/oportunidades/store/oportunidades-store'
import { useCotizacionesStore } from '@/features/cotizaciones/store/cotizaciones-store'
import { useProspectosStore } from '@/features/prospectos/store/prospectos-store'
import { usePQRSStore } from '@/features/pqrs/store/pqrs-store'

function todayCO() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) }
function nowISO() { return new Date().toISOString() }

// Interpolar variables {{campo}} en un texto
function interpolar(template: string, registro: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, campo) => {
    const val = registro[campo.trim()]
    return val !== undefined && val !== null ? String(val) : ''
  })
}

// Evaluar una condicion contra un registro
function evaluarCondicion(cond: Condicion, registro: Record<string, unknown>): boolean {
  const valor = String(registro[cond.campo] ?? '')
  const esperado = cond.valor
  switch (cond.operador) {
    case 'equals': return valor.toLowerCase() === esperado.toLowerCase()
    case 'not_equals': return valor.toLowerCase() !== esperado.toLowerCase()
    case 'contains': return valor.toLowerCase().includes(esperado.toLowerCase())
    case 'greater_than': return parseFloat(valor) > parseFloat(esperado)
    case 'less_than': return parseFloat(valor) < parseFloat(esperado)
    default: return false
  }
}

// Evaluar todas las condiciones
function evaluarCondiciones(flujo: Flujo, registro: Record<string, unknown>): boolean {
  if (flujo.condiciones.length === 0) return true
  if (flujo.condiciones_operador === 'AND') {
    return flujo.condiciones.every(c => evaluarCondicion(c, registro))
  }
  return flujo.condiciones.some(c => evaluarCondicion(c, registro))
}

// Ejecutar una accion individual
async function ejecutarAccion(accion: Accion, registro: Record<string, unknown>, flujo: Flujo): Promise<string> {
  const config = accion.config
  switch (accion.tipo) {
    case 'send_email': {
      const to = interpolar(config.to || '', registro)
      const asunto = interpolar(config.asunto || '', registro)
      const contenido = interpolar(config.contenido || '', registro)
      if (!to) return 'Email omitido: sin destinatario'
      try {
        await fetch('/api/send-email-marketing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinatarios: [{ email: to, nombre: interpolar(config.nombre_destino || '{{nombre}}', registro) }],
            asunto, contenido,
            campana_codigo: `FLUJO-${flujo.codigo}`,
            empresa_nombre: config.empresa_nombre || 'CRM SPIN',
          }),
        })
        return `Email enviado a ${to}`
      } catch (err) { return `Error email: ${err}` }
    }

    case 'create_tarea': {
      const tareasStore = useTareasStore.getState()
      const codigo = `TAR-${String(tareasStore.tareas.length + 1).padStart(3, '0')}`
      const tarea = {
        id: crypto.randomUUID(),
        codigo,
        fecha_asignacion: todayCO(),
        hora_asignacion: '',
        persona_asigna: interpolar(config.persona_asigna || 'Sistema', registro),
        persona_ejecuta: interpolar(config.persona_ejecuta || '', registro),
        fecha_requerida_fin: config.dias_plazo ? calcularFecha(parseInt(config.dias_plazo)) : todayCO(),
        fecha_real_fin: '',
        descripcion: interpolar(config.descripcion || '', registro),
        situacion: 'Pendiente',
        fecha_registro: todayCO(),
        seguimientos: [],
      }
      tareasStore.addTarea(tarea)
      return `Tarea ${codigo} creada → ${tarea.persona_ejecuta}`
    }

    case 'update_field': {
      const campo = config.campo || ''
      const valor = interpolar(config.valor || '', registro)
      const modulo = accion.modulo_destino || flujo.modulo
      const store = getStore(modulo)
      if (store && registro.id) {
        store.update(String(registro.id), { [campo]: valor })
        return `Campo "${campo}" actualizado a "${valor}" en ${modulo}`
      }
      return 'Update omitido: store no encontrado'
    }

    case 'add_seguimiento': {
      const modulo = accion.modulo_destino || flujo.modulo
      const store = getStore(modulo)
      if (store && registro.id) {
        const seguimientos = (registro.seguimientos as Array<Record<string, unknown>>) || []
        const nuevoSeg = {
          id: crypto.randomUUID(),
          fecha: nowISO(),
          detalle: interpolar(config.detalle || 'Accion automatica', registro),
          persona_actividad: 'Sistema (Flujo)',
          situacion: interpolar(config.situacion || String(registro.situacion || ''), registro),
          usuario: 'Sistema',
        }
        store.update(String(registro.id), { seguimientos: [...seguimientos, nuevoSeg] })
        return `Seguimiento agregado en ${modulo}`
      }
      return 'Seguimiento omitido: store no encontrado'
    }

    case 'create_record': {
      const modulo = accion.modulo_destino
      const store = getStore(modulo)
      if (!store) return `Modulo destino "${modulo}" no encontrado`
      const nuevoRegistro: Record<string, unknown> = { id: crypto.randomUUID() }
      Object.keys(config).forEach(k => {
        if (k !== 'modulo_destino') nuevoRegistro[k] = interpolar(config[k], registro)
      })
      nuevoRegistro.fecha_registro = todayCO()
      nuevoRegistro.seguimientos = []
      store.add(nuevoRegistro)
      return `Registro creado en ${modulo}`
    }

    default:
      return `Tipo de accion desconocido: ${accion.tipo}`
  }
}

function calcularFecha(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

// Obtener store por modulo
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStore(modulo: string): { update: (id: string, data: any) => void; add: (data: any) => void } | null {
  switch (modulo) {
    case 'clientes': {
      const s = useClientesStore.getState()
      return { update: s.updateCliente, add: s.addCliente }
    }
    case 'contactos': {
      const s = useContactosStore.getState()
      return { update: s.updateContacto, add: s.addContacto }
    }
    case 'oportunidades': {
      const s = useOportunidadesStore.getState()
      return { update: s.updateOportunidad, add: s.addOportunidad }
    }
    case 'cotizaciones': {
      const s = useCotizacionesStore.getState()
      return { update: s.updateCotizacion, add: s.addCotizacion }
    }
    case 'prospectos': {
      const s = useProspectosStore.getState()
      return { update: s.updateProspecto, add: s.addProspecto }
    }
    case 'pqrs': {
      const s = usePQRSStore.getState()
      return { update: s.updatePQRS, add: s.addPQRS }
    }
    case 'tareas': {
      const s = useTareasStore.getState()
      return { update: s.updateTarea, add: s.addTarea }
    }
    default: return null
  }
}

// ════════════════════════════════════════════
// FUNCION PRINCIPAL: Ejecutar flujos para un evento
// ════════════════════════════════════════════
export async function ejecutarFlujos(
  modulo: string,
  trigger: 'record_created' | 'record_updated' | 'field_changed',
  registro: Record<string, unknown>,
  campoModificado?: string,
) {
  const { flujos, addEjecucion } = useFlujosStore.getState()

  const flujosActivos = flujos.filter(f =>
    f.activo &&
    f.modulo === modulo &&
    f.trigger === trigger &&
    (trigger !== 'field_changed' || f.trigger_campo === campoModificado)
  )

  for (const flujo of flujosActivos) {
    // Evaluar condiciones
    if (!evaluarCondiciones(flujo, registro)) continue

    // Ejecutar acciones en secuencia
    const detalles: string[] = []
    let hayError = false

    for (const accion of flujo.acciones) {
      try {
        const resultado = await ejecutarAccion(accion, registro, flujo)
        detalles.push(resultado)
      } catch (err) {
        detalles.push(`Error: ${err}`)
        hayError = true
      }
    }

    // Registrar ejecucion
    const ejecucion: Ejecucion = {
      id: crypto.randomUUID(),
      fecha: nowISO(),
      registro_id: String(registro.id || ''),
      registro_codigo: String(registro.codigo || ''),
      estado: hayError ? 'error' : 'exitoso',
      detalle: detalles.join(' | '),
    }
    addEjecucion(flujo.id, ejecucion)
  }
}

// ════════════════════════════════════════════
// Ejecutar flujo programado (sin registro origen)
// ════════════════════════════════════════════
export async function ejecutarFlujoProgramado(flujo: Flujo) {
  const { addEjecucion } = useFlujosStore.getState()

  // Registro virtual con datos del flujo como contexto
  const registroVirtual: Record<string, unknown> = {
    id: flujo.id,
    codigo: flujo.codigo,
    nombre: flujo.nombre,
    modulo: flujo.modulo,
    fecha_programada: flujo.fecha_programada || '',
    hora_programada: flujo.hora_programada || '',
  }

  // Si el flujo tiene modulo, tomar todos los registros activos de ese modulo
  const store = getStore(flujo.modulo)
  if (store) {
    // Obtener registros del modulo para evaluar condiciones
    const storeState = getStoreRecords(flujo.modulo)
    const registrosValidos = storeState.filter(r => evaluarCondiciones(flujo, r as Record<string, unknown>))

    if (registrosValidos.length > 0) {
      // Ejecutar acciones sobre cada registro que cumple las condiciones
      const detalles: string[] = []
      let hayError = false

      for (const reg of registrosValidos) {
        for (const accion of flujo.acciones) {
          try {
            const resultado = await ejecutarAccion(accion, reg as Record<string, unknown>, flujo)
            detalles.push(resultado)
          } catch (err) {
            detalles.push(`Error: ${err}`)
            hayError = true
          }
        }
      }

      const ejecucion: Ejecucion = {
        id: crypto.randomUUID(), fecha: nowISO(),
        registro_id: 'programado', registro_codigo: `${registrosValidos.length} registro(s)`,
        estado: hayError ? 'error' : 'exitoso',
        detalle: detalles.join(' | '),
      }
      addEjecucion(flujo.id, ejecucion)
      return
    }
  }

  // Sin registros o sin condiciones: ejecutar acciones con registro virtual
  const detalles: string[] = []
  let hayError = false
  for (const accion of flujo.acciones) {
    try {
      const resultado = await ejecutarAccion(accion, registroVirtual, flujo)
      detalles.push(resultado)
    } catch (err) {
      detalles.push(`Error: ${err}`)
      hayError = true
    }
  }

  const ejecucion: Ejecucion = {
    id: crypto.randomUUID(), fecha: nowISO(),
    registro_id: 'programado', registro_codigo: flujo.codigo,
    estado: hayError ? 'error' : 'exitoso',
    detalle: detalles.join(' | '),
  }
  addEjecucion(flujo.id, ejecucion)
}

// Obtener registros de un modulo
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStoreRecords(modulo: string): any[] {
  switch (modulo) {
    case 'clientes': return useClientesStore.getState().clientes
    case 'contactos': return useContactosStore.getState().contactos
    case 'oportunidades': return useOportunidadesStore.getState().oportunidades
    case 'cotizaciones': return useCotizacionesStore.getState().cotizaciones
    case 'prospectos': return useProspectosStore.getState().prospectos
    case 'pqrs': return usePQRSStore.getState().pqrs
    case 'tareas': return useTareasStore.getState().tareas
    default: return []
  }
}
