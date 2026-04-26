export interface BaseReference {
  id: string
  descripcion: string
  situacion: boolean
  codigo?: string
  departamento?: string
}

export interface Vendedor {
  id: string
  codigo: string
  nombre: string
  apellido: string
  correo: string
  nro_movil: string
  situacion: boolean
}

export const REFERENCE_TABLES = [
  { id: 'pais', label: 'País' },
  { id: 'departamento', label: 'Departamento' },
  { id: 'ciudad', label: 'Ciudad' },
  { id: 'macro_sector', label: 'Macro Sector' },
  { id: 'actividad_cliente', label: 'Actividad Económica CIU' },
  { id: 'situacion_cliente', label: 'Situación Empresa' },
  { id: 'situacion_contacto', label: 'Situación Contacto' },
  { id: 'situacion_cotizacion', label: 'Situación Cotización' },
  { id: 'situacion_lista', label: 'Situación Lista' },
  { id: 'situacion_oportunidad', label: 'Situación Oportunidad' },
  { id: 'situacion_pqrs', label: 'Situación PQRS' },
  { id: 'tipo_pqrs', label: 'Tipo PQRS' },
  { id: 'tipo_identificacion', label: 'Tipo Documento' },
  { id: 'tipo_moneda', label: 'Tipo Moneda' },
  { id: 'condiciones_pago', label: 'Condiciones de Pago' },
  { id: 'origen_oportunidad', label: 'Origen Oportunidad' },
  { id: 'etapa_oportunidad', label: 'Etapa Oportunidad' },
  { id: 'prioridad_pqrs', label: 'Prioridad PQRS' },
  { id: 'roles', label: 'Roles' },
  { id: 'nivel_influencia', label: 'Nivel Influencia' },
  { id: 'porcentaje_impuestos', label: '% Impuestos' },
  { id: 'categoria_productos', label: 'Categoría Productos' },
  { id: 'tipo_empaque', label: 'Tipo Empaque' },
  { id: 'tipo_formula', label: 'Tipo Fórmula' },
  { id: 'tipo_precio', label: 'Tipo Precio' },
  { id: 'unidad_medida', label: 'Unidad de Medida' },
  { id: 'situacion_prospecto', label: 'Situación Prospecto' },
  { id: 'origen_prospecto', label: 'Origen Prospecto' },
  { id: 'como_nos_conocio', label: 'Cómo Nos Conoció' },
  { id: 'producto_interes', label: 'Producto de Interés' },
  { id: 'tipo_retencion_fuente', label: 'Tipo Retención Fuente' },
  { id: 'tipo_retencion_iva', label: 'Tipo Retención IVA' },
  { id: 'naturaleza_cuenta', label: 'Naturaleza de la Cuenta' },
  { id: 'tipo_cuenta', label: 'Tipo de Cuenta en Banco' },
  { id: 'tipo_cuenta_cliente', label: 'Tipo de Cuenta' },
  { id: 'clase_cliente', label: 'Clase de Cliente' },
  { id: 'clasificacion_tributaria', label: 'Clasificación Tributaria' },
  { id: 'calificacion_pagador', label: 'Calificación como Pagador' },
  { id: 'vendedores', label: 'Vendedores', custom: true },
] as const

export type ReferenceTableId = typeof REFERENCE_TABLES[number]['id']
