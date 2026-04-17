'use client'

import { useEffect } from 'react'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useContactosStore } from '@/features/contactos/store/contactos-store'
import { useProductosStore } from '@/features/productos/store/productos-store'
import { useOportunidadesStore } from '@/features/oportunidades/store/oportunidades-store'
import { useProspectosStore } from '@/features/prospectos/store/prospectos-store'

export function useAutoSeed() {
  const clientesCount = useClientesStore(s => s.clientes.length)

  useEffect(() => {
    if (clientesCount > 0) return

    // ========== CLIENTES ==========
    const clientes = [
      {
        id: crypto.randomUUID(), codigo: 'CLI-001', tipo_identificacion: 'NIT', nro_documento: '900123456-7',
        razon_social: 'Grupo Empresarial Andino S.A.S.', nombre_comercial: 'Grupo Andino',
        actividad: 'Construcción', direccion: 'Carrera 15 #93-47 Oficina 501', ciudad: 'Bogotá', pais: 'Colombia',
        codigo_postal: '110221', telefono: '+57 601 7456320', email: 'contacto@grupoandino.co',
        sitio_web: 'www.grupoandino.co', condicion_pago: '30 días', tipo_moneda: 'Pesos Colombianos',
        observaciones: 'Cliente corporativo con proyectos de infraestructura en la región andina.',
        situacion: 'Activo', fecha_registro: '2025-03-15', seguimientos: [], codigo_acceso: 'ACC-GRP001'
      },
      {
        id: crypto.randomUUID(), codigo: 'CLI-002', tipo_identificacion: 'RUC', nro_documento: '20512345678',
        razon_social: 'Tecnología Peruana del Pacífico S.A.C.', nombre_comercial: 'TecPac',
        actividad: 'Tecnología', direccion: 'Av. Javier Prado Este 4600, La Molina', ciudad: 'Lima', pais: 'Perú',
        codigo_postal: '15024', telefono: '+51 1 6178500', email: 'ventas@tecpac.pe',
        sitio_web: 'www.tecpac.pe', condicion_pago: '60 días', tipo_moneda: 'Dólares',
        observaciones: 'Especialistas en soluciones de data center y cloud para empresas medianas.',
        situacion: 'Activo', fecha_registro: '2025-04-02', seguimientos: [], codigo_acceso: 'ACC-TPC002'
      },
      {
        id: crypto.randomUUID(), codigo: 'CLI-003', tipo_identificacion: 'NIT', nro_documento: '860034521-1',
        razon_social: 'Distribuidora Continental de Alimentos Ltda.', nombre_comercial: 'DisConAl',
        actividad: 'Comercio', direccion: 'Calle 80 #68F-95 Bodega 12', ciudad: 'Medellín', pais: 'Colombia',
        codigo_postal: '050040', telefono: '+57 604 3124500', email: 'pedidos@disconal.com',
        sitio_web: 'www.disconal.com', condicion_pago: '15 días', tipo_moneda: 'Pesos Colombianos',
        observaciones: 'Distribuidor mayorista de alimentos con cobertura en 5 departamentos.',
        situacion: 'Activo', fecha_registro: '2025-02-20', seguimientos: [], codigo_acceso: 'ACC-DCA003'
      },
      {
        id: crypto.randomUUID(), codigo: 'CLI-004', tipo_identificacion: 'RUC', nro_documento: '1790456123001',
        razon_social: 'Soluciones Industriales Quito Cía. Ltda.', nombre_comercial: 'SolIndQ',
        actividad: 'Manufactura', direccion: 'Av. 6 de Diciembre N34-12 y Whymper', ciudad: 'Quito', pais: 'Ecuador',
        codigo_postal: '170507', telefono: '+593 2 2567890', email: 'info@solindq.ec',
        sitio_web: 'www.solindq.ec', condicion_pago: '30 días', tipo_moneda: 'Dólares',
        observaciones: 'Fabricación de piezas metalmecánicas para la industria petrolera ecuatoriana.',
        situacion: 'Activo', fecha_registro: '2025-05-10', seguimientos: [], codigo_acceso: 'ACC-SIQ004'
      },
      {
        id: crypto.randomUUID(), codigo: 'CLI-005', tipo_identificacion: 'NIT', nro_documento: '900987654-3',
        razon_social: 'Logística del Caribe S.A.', nombre_comercial: 'LogiCaribe',
        actividad: 'Servicios', direccion: 'Av. Pedro de Heredia Sector Manga Calle 28 #25-40', ciudad: 'Cartagena', pais: 'Colombia',
        codigo_postal: '130001', telefono: '+57 605 6643210', email: 'operaciones@logicaribe.co',
        sitio_web: 'www.logicaribe.co', condicion_pago: '30 días', tipo_moneda: 'Pesos Colombianos',
        observaciones: 'Operador logístico portuario con flota propia de 45 vehículos.',
        situacion: 'Activo', fecha_registro: '2025-01-08', seguimientos: [], codigo_acceso: 'ACC-LGC005'
      },
      {
        id: crypto.randomUUID(), codigo: 'CLI-006', tipo_identificacion: 'RUC', nro_documento: '76123456-K',
        razon_social: 'Minería Verde SpA', nombre_comercial: 'MinVerde',
        actividad: 'Manufactura', direccion: 'Av. Apoquindo 4700 Piso 12, Las Condes', ciudad: 'Santiago', pais: 'Chile',
        codigo_postal: '7560000', telefono: '+56 2 23456789', email: 'proyectos@minverde.cl',
        sitio_web: 'www.minverde.cl', condicion_pago: '90 días', tipo_moneda: 'Dólares',
        observaciones: 'Empresa de minería sustentable con operaciones en Atacama y Antofagasta.',
        situacion: 'Activo', fecha_registro: '2025-06-01', seguimientos: [], codigo_acceso: 'ACC-MVD006'
      },
      {
        id: crypto.randomUUID(), codigo: 'CLI-007', tipo_identificacion: 'Cédula', nro_documento: 'J-30567890-2',
        razon_social: 'Agroindustrias del Llano C.A.', nombre_comercial: 'AgroLlano',
        actividad: 'Comercio', direccion: 'Zona Industrial Norte, Parcela 14', ciudad: 'Barranquilla', pais: 'Colombia',
        codigo_postal: '080020', telefono: '+57 605 3789012', email: 'gerencia@agrollano.co',
        sitio_web: 'www.agrollano.co', condicion_pago: '60 días', tipo_moneda: 'Pesos Colombianos',
        observaciones: 'Procesamiento y exportación de productos agrícolas tropicales.',
        situacion: 'Activo', fecha_registro: '2025-03-28', seguimientos: [], codigo_acceso: 'ACC-AGL007'
      },
      {
        id: crypto.randomUUID(), codigo: 'CLI-008', tipo_identificacion: 'NIT', nro_documento: '830045678-9',
        razon_social: 'Consultores Financieros del Valle S.A.S.', nombre_comercial: 'ConFinValle',
        actividad: 'Servicios', direccion: 'Av. 6N #17A-32 Edificio Centenario', ciudad: 'Cali', pais: 'Colombia',
        codigo_postal: '760045', telefono: '+57 602 4561234', email: 'asesoria@confinvalle.co',
        sitio_web: 'www.confinvalle.co', condicion_pago: 'Contado', tipo_moneda: 'Pesos Colombianos',
        observaciones: 'Firma de consultoría financiera y tributaria con 15 años de trayectoria.',
        situacion: 'Activo', fecha_registro: '2025-07-12', seguimientos: [], codigo_acceso: 'ACC-CFV008'
      }
    ]

    // We need stable IDs for cross-references between entities.
    // Generate them once and reuse across contactos and oportunidades.
    const cid = clientes.map(c => c.id)

    // ========== CONTACTOS ==========
    const contactos = [
      {
        id: crypto.randomUUID(), codigo: 'CON-001', cliente_id: cid[0], cliente_nombre: 'Grupo Andino',
        nombre: 'Carlos', apellido: 'Mendoza Ríos', cargo: 'Gerente de Compras',
        departamento: 'Compras', telefono: '+57 601 7456321', celular: '+57 310 4567890',
        email: 'cmendoza@grupoandino.co', fecha_nacimiento: '1978-05-14',
        nivel_influencia: 'Decisor', es_principal: true,
        observaciones: 'Contacto principal para licitaciones de infraestructura.',
        situacion: 'Activo', fecha_registro: '2025-03-15', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-002', cliente_id: cid[0], cliente_nombre: 'Grupo Andino',
        nombre: 'Ana María', apellido: 'Vargas López', cargo: 'Directora Financiera',
        departamento: 'Finanzas', telefono: '+57 601 7456322', celular: '+57 315 2345678',
        email: 'avargas@grupoandino.co', fecha_nacimiento: '1982-11-22',
        nivel_influencia: 'Influenciador', es_principal: false,
        observaciones: 'Aprueba presupuestos superiores a 50M COP.',
        situacion: 'Activo', fecha_registro: '2025-03-16', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-003', cliente_id: cid[1], cliente_nombre: 'TecPac',
        nombre: 'Roberto', apellido: 'Huamán Castillo', cargo: 'CTO',
        departamento: 'Tecnología', telefono: '+51 1 6178501', celular: '+51 987 654321',
        email: 'rhuaman@tecpac.pe', fecha_nacimiento: '1985-08-03',
        nivel_influencia: 'Decisor', es_principal: true,
        observaciones: 'Lidera la evaluación técnica de todas las propuestas de infraestructura.',
        situacion: 'Activo', fecha_registro: '2025-04-02', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-004', cliente_id: cid[2], cliente_nombre: 'DisConAl',
        nombre: 'Juliana', apellido: 'Ospina Gómez', cargo: 'Jefe de Operaciones',
        departamento: 'Operaciones', telefono: '+57 604 3124501', celular: '+57 300 8901234',
        email: 'jospina@disconal.com', fecha_nacimiento: '1990-02-18',
        nivel_influencia: 'Evaluador Técnico', es_principal: true,
        observaciones: 'Coordina toda la cadena de frío y distribución regional.',
        situacion: 'Activo', fecha_registro: '2025-02-20', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-005', cliente_id: cid[3], cliente_nombre: 'SolIndQ',
        nombre: 'Diego', apellido: 'Paredes Velasco', cargo: 'Gerente General',
        departamento: 'Gerencia', telefono: '+593 2 2567891', celular: '+593 99 8765432',
        email: 'dparedes@solindq.ec', fecha_nacimiento: '1975-12-30',
        nivel_influencia: 'Decisor', es_principal: true,
        observaciones: 'Fundador de la empresa. Toma todas las decisiones de compra mayores.',
        situacion: 'Activo', fecha_registro: '2025-05-10', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-006', cliente_id: cid[4], cliente_nombre: 'LogiCaribe',
        nombre: 'Patricia', apellido: 'Herrera Díaz', cargo: 'Directora Comercial',
        departamento: 'Comercial', telefono: '+57 605 6643211', celular: '+57 316 7890123',
        email: 'pherrera@logicaribe.co', fecha_nacimiento: '1988-07-09',
        nivel_influencia: 'Influenciador', es_principal: true,
        observaciones: 'Responsable de alianzas estratégicas y nuevos contratos logísticos.',
        situacion: 'Activo', fecha_registro: '2025-01-08', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-007', cliente_id: cid[5], cliente_nombre: 'MinVerde',
        nombre: 'Sebastián', apellido: 'Muñoz Arriagada', cargo: 'Jefe de Proyectos',
        departamento: 'Proyectos', telefono: '+56 2 23456790', celular: '+56 9 87654321',
        email: 'smunoz@minverde.cl', fecha_nacimiento: '1983-04-25',
        nivel_influencia: 'Evaluador Técnico', es_principal: true,
        observaciones: 'Supervisa las compras técnicas para operaciones en terreno.',
        situacion: 'Activo', fecha_registro: '2025-06-01', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-008', cliente_id: cid[6], cliente_nombre: 'AgroLlano',
        nombre: 'Fernando', apellido: 'Restrepo Marín', cargo: 'Gerente de Planta',
        departamento: 'Producción', telefono: '+57 605 3789013', celular: '+57 321 4567890',
        email: 'frestrepo@agrollano.co', fecha_nacimiento: '1979-09-11',
        nivel_influencia: 'Patrocinador', es_principal: true,
        observaciones: 'Gestiona la planta de procesamiento y autoriza compras de insumos.',
        situacion: 'Activo', fecha_registro: '2025-03-28', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-009', cliente_id: cid[7], cliente_nombre: 'ConFinValle',
        nombre: 'Valentina', apellido: 'Caicedo Torres', cargo: 'Socia Directora',
        departamento: 'Dirección', telefono: '+57 602 4561235', celular: '+57 318 9012345',
        email: 'vcaicedo@confinvalle.co', fecha_nacimiento: '1980-01-17',
        nivel_influencia: 'Decisor', es_principal: true,
        observaciones: 'Socia fundadora. Aprueba contratos de consultoría y licenciamiento.',
        situacion: 'Activo', fecha_registro: '2025-07-12', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'CON-010', cliente_id: cid[1], cliente_nombre: 'TecPac',
        nombre: 'Milagros', apellido: 'Quispe Fernández', cargo: 'Gerente de Compras',
        departamento: 'Compras', telefono: '+51 1 6178502', celular: '+51 956 123456',
        email: 'mquispe@tecpac.pe', fecha_nacimiento: '1991-06-05',
        nivel_influencia: 'Usuario Final', es_principal: false,
        observaciones: 'Gestiona órdenes de compra y seguimiento a proveedores.',
        situacion: 'Activo', fecha_registro: '2025-04-10', seguimientos: []
      }
    ]

    // Capture contacto IDs for oportunidades cross-references
    const conId = contactos.map(c => c.id)

    // ========== PRODUCTOS ==========
    const productos = [
      {
        id: crypto.randomUUID(), codigo: 'PRD-001', descripcion: 'Licencia ERP Cloud - Plan Empresarial (anual)',
        categoria: 'Software', unidad_medida: 'Unidad', precio_unitario: 24500000,
        tipo_moneda: 'Pesos Colombianos', observaciones: 'Incluye módulos de contabilidad, inventario, RRHH y CRM. Hasta 50 usuarios.',
        situacion: 'Activo', fecha_registro: '2025-01-10', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-002', descripcion: 'Servidor Dell PowerEdge R760 - Rack 2U',
        categoria: 'Hardware', unidad_medida: 'Unidad', precio_unitario: 8500,
        tipo_moneda: 'Dólares', observaciones: 'Intel Xeon 4th Gen, 128GB RAM, 4x 1.92TB SSD. Garantía 3 años on-site.',
        situacion: 'Activo', fecha_registro: '2025-01-15', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-003', descripcion: 'Consultoría en Transformación Digital (hora)',
        categoria: 'Servicios', unidad_medida: 'Unidad', precio_unitario: 350000,
        tipo_moneda: 'Pesos Colombianos', observaciones: 'Diagnóstico, hoja de ruta, implementación y acompañamiento. Mínimo 40 horas.',
        situacion: 'Activo', fecha_registro: '2025-02-01', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-004', descripcion: 'Switch Cisco Catalyst 9300-48P PoE+',
        categoria: 'Hardware', unidad_medida: 'Unidad', precio_unitario: 4200,
        tipo_moneda: 'Dólares', observaciones: '48 puertos PoE+ Gigabit, stack, licencia DNA Essentials incluida.',
        situacion: 'Activo', fecha_registro: '2025-02-10', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-005', descripcion: 'Plataforma de Ciberseguridad - SOC Gestionado (mensual)',
        categoria: 'Servicios', unidad_medida: 'Unidad', precio_unitario: 8900000,
        tipo_moneda: 'Pesos Colombianos', observaciones: 'Monitoreo 24/7, respuesta a incidentes, reportes ejecutivos mensuales.',
        situacion: 'Activo', fecha_registro: '2025-03-05', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-006', descripcion: 'Cable de Red UTP Cat 6A - Bobina 305m',
        categoria: 'Materiales', unidad_medida: 'Caja', precio_unitario: 620000,
        tipo_moneda: 'Pesos Colombianos', observaciones: 'Cable blindado F/UTP, ideal para data centers y entornos industriales.',
        situacion: 'Activo', fecha_registro: '2025-03-12', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-007', descripcion: 'Capacitación Microsoft 365 Admin (grupo hasta 15)',
        categoria: 'Servicios', unidad_medida: 'Unidad', precio_unitario: 5800000,
        tipo_moneda: 'Pesos Colombianos', observaciones: '40 horas presenciales. Incluye laboratorio, material y certificado.',
        situacion: 'Activo', fecha_registro: '2025-04-01', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-008', descripcion: 'Firewall FortiGate 200F',
        categoria: 'Hardware', unidad_medida: 'Unidad', precio_unitario: 6800,
        tipo_moneda: 'Dólares', observaciones: 'Incluye FortiCare + FortiGuard 1 año.',
        situacion: 'Activo', fecha_registro: '2025-04-15', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-009', descripcion: 'Desarrollo de App Móvil - MVP (proyecto)',
        categoria: 'Software', unidad_medida: 'Unidad', precio_unitario: 45000000,
        tipo_moneda: 'Pesos Colombianos', observaciones: 'iOS + Android con React Native. Diseño UX, desarrollo, QA y publicación en stores.',
        situacion: 'Activo', fecha_registro: '2025-05-01', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRD-010', descripcion: 'UPS APC Smart-UPS 3000VA LCD RM 2U',
        categoria: 'Hardware', unidad_medida: 'Unidad', precio_unitario: 2100,
        tipo_moneda: 'Dólares', observaciones: 'Autonomía 10 min a carga completa. Onda sinusoidal pura. Montaje en rack.',
        situacion: 'Activo', fecha_registro: '2025-05-20', seguimientos: []
      }
    ]

    // ========== OPORTUNIDADES ==========
    const oportunidades = [
      {
        id: crypto.randomUUID(), codigo: 'OPR-001', nombre: 'Modernización Data Center Grupo Andino',
        cliente_id: cid[0], cliente_nombre: 'Grupo Andino',
        contacto_id: conId[0], contacto_nombre: 'Carlos Mendoza Ríos',
        valor_estimado: 285000000, tipo_moneda: 'Pesos Colombianos', probabilidad: 70,
        etapa: 'Propuesta', origen: 'Referido',
        fecha_cierre_estimada: '2026-06-30', responsable: 'Juan Pérez',
        observaciones: 'Renovación completa de servidores y networking del data center principal en Bogotá. Incluye 8 servidores, switches y cableado estructurado.',
        situacion: 'Abierta', fecha_registro: '2025-04-10', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'OPR-002', nombre: 'Implementación ERP TecPac',
        cliente_id: cid[1], cliente_nombre: 'TecPac',
        contacto_id: conId[2], contacto_nombre: 'Roberto Huamán Castillo',
        valor_estimado: 95000, tipo_moneda: 'Dólares', probabilidad: 50,
        etapa: 'Calificación', origen: 'Web',
        fecha_cierre_estimada: '2026-08-15', responsable: 'María González',
        observaciones: 'Licenciamiento ERP + consultoría de implementación para 3 sedes en Perú.',
        situacion: 'Abierta', fecha_registro: '2025-05-20', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'OPR-003', nombre: 'SOC Gestionado LogiCaribe 12 meses',
        cliente_id: cid[4], cliente_nombre: 'LogiCaribe',
        contacto_id: conId[5], contacto_nombre: 'Patricia Herrera Díaz',
        valor_estimado: 106800000, tipo_moneda: 'Pesos Colombianos', probabilidad: 85,
        etapa: 'Negociación', origen: 'Llamada',
        fecha_cierre_estimada: '2026-05-15', responsable: 'Juan Pérez',
        observaciones: 'Contrato anual de SOC gestionado. Cliente requiere cumplimiento con normas portuarias de ciberseguridad.',
        situacion: 'En Negociación', fecha_registro: '2025-06-01', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'OPR-004', nombre: 'App Móvil Pedidos DisConAl',
        cliente_id: cid[2], cliente_nombre: 'DisConAl',
        contacto_id: conId[3], contacto_nombre: 'Juliana Ospina Gómez',
        valor_estimado: 68000000, tipo_moneda: 'Pesos Colombianos', probabilidad: 40,
        etapa: 'Prospección', origen: 'Evento',
        fecha_cierre_estimada: '2026-09-30', responsable: 'María González',
        observaciones: 'App para que distribuidores minoristas hagan pedidos. Integración con ERP existente del cliente.',
        situacion: 'Abierta', fecha_registro: '2025-07-15', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'OPR-005', nombre: 'Infraestructura de Red MinVerde Atacama',
        cliente_id: cid[5], cliente_nombre: 'MinVerde',
        contacto_id: conId[6], contacto_nombre: 'Sebastián Muñoz Arriagada',
        valor_estimado: 142000, tipo_moneda: 'Dólares', probabilidad: 60,
        etapa: 'Propuesta', origen: 'Referido',
        fecha_cierre_estimada: '2026-07-20', responsable: 'Juan Pérez',
        observaciones: 'Networking para nueva planta en Atacama: switches industriales, firewalls y enlaces satelitales.',
        situacion: 'Abierta', fecha_registro: '2025-08-05', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'OPR-006', nombre: 'Capacitación M365 y Ciberseguridad AgroLlano',
        cliente_id: cid[6], cliente_nombre: 'AgroLlano',
        contacto_id: conId[7], contacto_nombre: 'Fernando Restrepo Marín',
        valor_estimado: 18500000, tipo_moneda: 'Pesos Colombianos', probabilidad: 90,
        etapa: 'Cierre', origen: 'Redes Sociales',
        fecha_cierre_estimada: '2026-04-30', responsable: 'María González',
        observaciones: 'Paquete de capacitación M365 para 45 empleados + taller de buenas prácticas de ciberseguridad.',
        situacion: 'En Negociación', fecha_registro: '2025-09-01', seguimientos: []
      }
    ]

    // ========== PROSPECTOS ==========
    const prospectos = [
      {
        id: crypto.randomUUID(), codigo: 'PRS-001', nombre: 'Alejandro', apellido: 'Betancourt Ruiz',
        empresa: 'Farmacéuticas del Norte S.A.', correo: 'abetancourt@farmanorte.mx',
        nro_movil: '+52 55 91234567', origen_prospecto: 'Web',
        detalle_requerimiento: 'Buscan plataforma ERP con módulo de trazabilidad farmacéutica y cumplimiento COFEPRIS.',
        actividad: 'Manufactura', ciudad: 'Ciudad de México', pais: 'México',
        situacion: 'Contactado', fecha_registro: '2026-01-15', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRS-002', nombre: 'Lucía', apellido: 'Fernández Soto',
        empresa: 'Exportadora Café Premium SRL', correo: 'lfernandez@cafepremium.do',
        nro_movil: '+1 809 5551234', origen_prospecto: 'Referido',
        detalle_requerimiento: 'Necesitan sistema de gestión de inventario con integración aduanera para exportaciones.',
        actividad: 'Comercio', ciudad: 'Santo Domingo', pais: 'República Dominicana',
        situacion: 'Calificado', fecha_registro: '2026-02-03', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRS-003', nombre: 'Martín', apellido: 'Gutiérrez Paz',
        empresa: 'Constructora Austral S.A.', correo: 'mgutierrez@conaustral.com.ar',
        nro_movil: '+54 11 45678901', origen_prospecto: 'Evento',
        detalle_requerimiento: 'Requieren solución de Project Management integrada con ERP para obras civiles de gran envergadura.',
        actividad: 'Construcción', ciudad: 'Buenos Aires', pais: 'Argentina',
        situacion: 'Nuevo', fecha_registro: '2026-02-20', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRS-004', nombre: 'Camila', apellido: 'Rojas Peña',
        empresa: 'FinTech Andina SpA', correo: 'crojas@fintechandina.cl',
        nro_movil: '+56 9 76543210', origen_prospecto: 'Redes Sociales',
        detalle_requerimiento: 'Startup fintech buscando infraestructura cloud segura con cumplimiento normativo CMF Chile.',
        actividad: 'Tecnología', ciudad: 'Santiago', pais: 'Chile',
        situacion: 'En Negociación', fecha_registro: '2026-03-01', seguimientos: []
      },
      {
        id: crypto.randomUUID(), codigo: 'PRS-005', nombre: 'Eduardo', apellido: 'Morales Vega',
        empresa: 'Transporte Interurbano del Pacífico S.A.C.', correo: 'emorales@tipac.pe',
        nro_movil: '+51 945 678901', origen_prospecto: 'Llamada',
        detalle_requerimiento: 'Buscan sistema de rastreo GPS y gestión de flota para 120 unidades de transporte de carga.',
        actividad: 'Servicios', ciudad: 'Arequipa', pais: 'Perú',
        situacion: 'Sin Contactar', fecha_registro: '2026-03-18', seguimientos: []
      }
    ]

    // Bulk-load all stores
    useClientesStore.setState({ clientes })
    useContactosStore.setState({ contactos })
    useProductosStore.setState({ productos })
    useOportunidadesStore.setState({ oportunidades })
    useProspectosStore.setState({ prospectos })
  }, [clientesCount])
}
