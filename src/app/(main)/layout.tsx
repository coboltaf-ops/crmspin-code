'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { useModulosStore } from '@/features/modulos/store/modulos-store'
import { useAsistenteStore } from '@/shared/stores/asistente-store'
import { useClientesStore } from '@/features/clientes/store/clientes-store'
import { useEmpresaStore } from '@/features/empresa/store/empresa-store'
import { useFlujoListener } from '@/features/flujos/lib/useFlujoListener'
import { useAutoSeed } from '@/shared/hooks/use-auto-seed'

const ROUTE_KEYWORDS: { keywords: string[]; href: string; label: string }[] = [
  { keywords: ['empresa', 'empresas', 'cliente', 'clientes'], href: '/clientes', label: 'Clientes' },
  { keywords: ['contacto', 'contactos'], href: '/contactos', label: 'Contactos' },
  { keywords: ['producto', 'productos', 'servicio', 'servicios'], href: '/productos', label: 'Productos' },
  { keywords: ['cotizacion', 'cotizaciones', 'cotización', 'cotizaciones', 'proforma'], href: '/cotizaciones', label: 'Cotizaciones' },
  { keywords: ['prospecto', 'prospectos', 'lead', 'leads'], href: '/prospectos', label: 'Prospectos' },
  { keywords: ['pqrs', 'queja', 'reclamo', 'peticion', 'petición', 'solicitud'], href: '/pqrs', label: 'PQRS' },
  { keywords: ['oportunidad', 'oportunidades', 'negocio', 'oport'], href: '/oportunidades', label: 'Oportunidades' },
  { keywords: ['correo', 'correos', 'emails', 'email', 'correos enviados'], href: '/correos', label: 'Correos Enviados' },
  { keywords: ['tarea', 'tareas', 'asignacion', 'asignaciones', 'pendiente', 'pendientes'], href: '/tareas', label: 'Tareas' },
  { keywords: ['flujo', 'flujos', 'automatizacion', 'automatizaciones', 'workflow', 'automatizar'], href: '/flujos', label: 'Automatizaciones' },
  { keywords: ['disenador', 'diseñador', 'plantilla correo', 'plantillas correo', 'disenar correo', 'template'], href: '/disenador-correos', label: 'Diseñador Correos' },
  { keywords: ['marketing', 'email marketing', 'campana', 'campanas', 'masivo', 'mailing'], href: '/email-marketing', label: 'Email Marketing' },
  { keywords: ['mi empresa', 'datos empresa', 'datos-empresa'], href: '/datos-empresa', label: 'Mi Empresa' },
  { keywords: ['usuario', 'usuarios', 'user'], href: '/usuarios', label: 'Usuarios' },
  { keywords: ['referencia', 'referencias', 'catalogos', 'catálogos'], href: '/referencias', label: 'Referencias' },
  { keywords: ['dashboard', 'inicio', 'home', 'principal', 'menu', 'menú'], href: '/dashboard', label: 'Dashboard' },
]

function resolveRoute(text: string): { href: string; label: string } | null {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const r of ROUTE_KEYWORDS) {
    if (r.keywords.some(k => t.includes(k))) return r
  }
  return null
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  useAutoSeed()
  useFlujoListener()
  const router = useRouter()
  const pathname = usePathname()
  const user = useCurrentUserStore(s => s.user)
  const logout = useCurrentUserStore(s => s.logout)
  const modulos = useModulosStore(s => s.modulos)
  const clientes = useClientesStore(s => s.clientes)
  const empresa = useEmpresaStore(s => s.empresas[0])
  const { setPending } = useAsistenteStore()
  const [collapsed, setCollapsed] = useState(false)
  const [showAsistente, setShowAsistente] = useState(false)
  const [comando, setComando] = useState('')
  const [hint, setHint] = useState('')
  const [listening, setListening] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<unknown>(null)

  useEffect(() => { if (!user) router.push('/login') }, [user, router])

  // Sincronizar códigos de acceso de clientes al servidor para validación en formulario público
  useEffect(() => {
    if (!clientes.length) return
    const activos = clientes.filter(c => c.situacion === 'Activo' && c.codigo_acceso)
    if (!activos.length) return
    fetch('/api/clientes-acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientes: activos.map(c => ({ id: c.id, codigo: c.codigo, razon_social: c.razon_social, codigo_acceso: c.codigo_acceso })) }),
    }).catch(() => {})
  }, [clientes])

  // Sincronizar info de la empresa (logo + nombre) al servidor para formularios públicos
  useEffect(() => {
    if (!empresa) return
    fetch('/api/empresa-publico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: empresa.nombre,
        logo_url: empresa.logo_url,
        nro_documento: empresa.nro_documento,
        ciudad: empresa.ciudad,
      }),
    }).catch(() => {})
  }, [empresa])

  useEffect(() => {
    if (user && !sessionStorage.getItem('asistente-shown')) {
      setShowAsistente(true)
      sessionStorage.setItem('asistente-shown', '1')
    }
  }, [user])

  useEffect(() => {
    if (showAsistente) setTimeout(() => inputRef.current?.focus(), 100)
  }, [showAsistente])

  const ejecutar = (txt: string) => {
    const clean = txt.trim()
    if (!clean) { setShowAsistente(false); return }
    const match = resolveRoute(clean)
    if (match) {
      // Detectar acción: nuevo / crear / agregar
      const esNuevo = /\b(nuevo|nueva|crear|agregar|registrar)\b/i.test(clean)
      // Extraer término de búsqueda: quitar palabras de acción y palabras clave del módulo
      const stopWords = ['busca', 'buscar', 'ver', 'mostrar', 'muéstrame', 'muestrame',
        'quiero', 'ir', 'abrir', 'el', 'la', 'los', 'las', 'de', 'un', 'una',
        'nuevo', 'nueva', 'crear', 'agregar', 'registrar',
        ...match.label.toLowerCase().split(' '),
        ...(ROUTE_KEYWORDS.find(r => r.href === match.href)?.keywords ?? []),
      ]
      const words = clean.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1 && !stopWords.includes(w))
      const searchTerm = words.join(' ').trim()

      setPending(searchTerm, esNuevo ? 'nuevo' : null)
      setShowAsistente(false)
      setComando('')
      setHint('')
      router.push(match.href)
    } else {
      setHint(`No encontré "${clean}". Intenta: clientes, cotizaciones, pqrs, productos...`)
    }
  }

  const handleComando = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') { setHint(''); return }
    ejecutar(comando)
  }

  const startVoice = () => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setHint('Tu navegador no soporta reconocimiento de voz. Usa Chrome.')
      return
    }
    const rec = new (SpeechRecognition as new () => {
      lang: string; interimResults: boolean; maxAlternatives: number
      onresult: ((e: { results: { transcript: string }[][] }) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
      start: () => void
    })()
    rec.lang = 'es-CO'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const texto = e.results[0][0].transcript
      setComando(texto)
      setListening(false)
      setTimeout(() => ejecutar(texto), 300)
    }
    rec.onerror = () => { setListening(false); setHint('Error de micrófono. Intenta de nuevo.') }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    setListening(true)
    setHint('')
    rec.start()
  }

  if (!user) return null

  const isAdmin = user.rol.toLowerCase() === 'admin'
  const configModuleIds = ['usuarios', 'email-marketing', 'flujos', 'datos-empresa', 'disenador-correos', 'modulos', 'auditoria']
  const mainItems = modulos
    .filter(m => m.activo && (m.grupo === 'principal' || !configModuleIds.includes(m.id)))
    .filter(m => m.grupo === 'principal')
    .map(m => ({ href: m.href, icon: m.icon, label: m.label }))
  const configItems = isAdmin ? modulos
    .filter(m => m.activo && m.grupo === 'configuracion')
    .map(m => ({ href: m.href, icon: m.icon, label: m.label })) : []

  const sideW = collapsed ? 64 : 240

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: pathname === '/dashboard' ? '#252533' : '#1e3a8a' }}>

      {/* Asistente de bienvenida */}
      {showAsistente && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#172554', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 36, width: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 8 }}>Hola, {user.nombre} 👋</p>
            <h2 style={{ color: '#ffffff', fontSize: 22, fontWeight: 800, marginBottom: 24 }}>¿Qué deseas hacer?</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                value={comando}
                onChange={e => { setComando(e.target.value); setHint('') }}
                onKeyDown={handleComando}
                placeholder="Escribe o usa el micrófono..."
                style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 15, outline: 'none' }}
              />
              <button
                onClick={startVoice}
                title={listening ? 'Escuchando...' : 'Hablar'}
                style={{
                  padding: '0 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 22,
                  background: listening ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.2)',
                  color: listening ? '#fca5a5' : '#86efac',
                  animation: listening ? 'pulse 1s infinite' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {listening ? '⏹' : '🎤'}
              </button>
            </div>
            {listening && <p style={{ color: '#86efac', fontSize: 12, marginTop: 8 }}>🔴 Escuchando... habla ahora</p>}
            {hint && <p style={{ color: '#fca5a5', fontSize: 12, marginTop: 8 }}>{hint}</p>}
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 12 }}>
              Ejemplos: "clientes", "cotizaciones", "pqrs" · Enter vacío → menú normal
            </p>
          </div>
        </div>
      )}
      {/* Sidebar vTiger style — solo visible en Dashboard */}
      {pathname === '/dashboard' && (
      <aside style={{
        width: sideW, transition: 'width 0.3s ease', flexShrink: 0,
        background: '#172554',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: collapsed ? '16px 8px' : '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 64 }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: 18, padding: 4, borderRadius: 6, flexShrink: 0 }}>
            {collapsed ? '☰' : '✕'}
          </button>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
              {empresa?.logo_url ? (
                <img src={empresa.logo_url} alt={empresa.nombre || 'Logo'} style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }} />
              ) : (
                <p style={{ color: '#ffffff', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>CRM SPIN</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
          {mainItems.map(item => {
            const active = pathname === item.href
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.85)',
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  transition: 'all 0.2s',
                  borderLeft: active ? '3px solid #ffffff' : '3px solid transparent',
                }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}

          {/* Separador + Configuración */}
          {configItems.length > 0 && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 4px' }} />
              <button onClick={() => setConfigOpen(!configOpen)}
                title={collapsed ? 'Configuración' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: configOpen ? 'rgba(139,92,246,0.15)' : 'transparent',
                  color: configOpen ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                  fontSize: 14, fontWeight: 600,
                  transition: 'all 0.2s',
                  borderLeft: '3px solid transparent',
                }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚙️</span>
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>Configuración</span>
                    <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: configOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </>
                )}
              </button>
              {(configOpen || collapsed) && configItems.map(item => {
                const active = pathname === item.href
                return (
                  <button key={item.href} onClick={() => router.push(item.href)}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: collapsed ? '8px 0' : '8px 12px 8px 28px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: active ? 'rgba(139,92,246,0.2)' : 'transparent',
                      color: active ? '#a78bfa' : 'rgba(255,255,255,0.7)',
                      fontSize: 13, fontWeight: active ? 700 : 500,
                      transition: 'all 0.2s',
                      borderLeft: active ? '3px solid #a78bfa' : '3px solid transparent',
                    }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                )
              })}
            </>
          )}
        </nav>

        {/* Cerrar Sesión */}
        <div style={{ padding: collapsed ? '12px 8px' : '12px 16px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <button onClick={() => {
            if (confirm('¿Cerrar sesión?')) { logout(); router.push('/login') }
          }}
            title={collapsed ? 'Cerrar Sesión' : undefined}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: collapsed ? '10px 0' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10, border: '1px solid #dc2626', cursor: 'pointer',
              background: '#b91c1c', color: '#ffffff',
              fontSize: 13, fontWeight: 700,
            }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🚪</span>
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
      )}

      {/* Main content */}
      <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '10px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {empresa?.logo_url ? (
              <img src={empresa.logo_url} alt={empresa.nombre || 'Logo'} style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain', background: '#ffffff', borderRadius: 6, padding: 3 }} />
            ) : (
              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 14 }}>{empresa?.nombre || 'CRM SPIN'}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 900, fontSize: 14 }}>
              {user.nombre[0]}{user.apellido[0]}
            </div>
            <div>
              <p style={{ color: '#ffffff', fontSize: 15, fontWeight: 900, margin: 0 }}>{user.nombre} {user.apellido}</p>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 700, margin: 0 }}>{user.rol}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pathname !== '/dashboard' && (
              <button onClick={() => router.push('/dashboard')}
                style={{
                  padding: '8px 20px', borderRadius: 8,
                  background: '#dc2626', border: '1px solid #ef4444',
                  color: '#ffffff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                }}>
                Menú Principal
              </button>
            )}
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
