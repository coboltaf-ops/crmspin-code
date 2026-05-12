'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUsuariosStore } from '@/features/usuarios-gestion/store/usuarios-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { logAudit } from '@/shared/lib/audit'
import { useEmpresaStore } from '@/features/empresa/store/empresa-store'

export default function LoginPage() {
  const router = useRouter()
  const usuarios = useUsuariosStore(s => s.usuarios)
  const setUser = useCurrentUserStore(s => s.setUser)
  const empresa = useEmpresaStore(s => s.empresas[0])
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const found = usuarios.find(u => u.usuario === usuario && u.clave === clave && u.situacion === 'Activo')
    if (!found) {
      setError('Usuario o clave incorrectos')
      logAudit({ usuario: usuario || 'desconocido', modulo: 'auth', accion: 'OTRO', detalle: `Intento de login fallido para "${usuario}"` })
      return
    }
    setUser(found)
    logAudit({
      usuario: found.usuario,
      usuario_nombre: `${found.nombre} ${found.apellido}`,
      rol: found.rol,
      modulo: 'auth',
      accion: 'LOGIN',
      detalle: `Inicio de sesión correcto`,
    })
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#002366' }}>
      <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: 40, width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {empresa?.logo_url ? (
            <img src={empresa.logo_url} alt={empresa.nombre || 'Logo'} style={{ maxWidth: 180, maxHeight: 120, margin: '0 auto 12px', display: 'block', objectFit: 'contain' }} />
          ) : (
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>CRM SPIN</h1>
          )}
          {empresa?.nombre && <p style={{ color: '#ffffff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{empresa.nombre}</p>}
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Inicia sesión en tu cuenta</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4, display: 'block' }}>Usuario</label>
            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-form-type="other" data-lpignore="true" data-1p-ignore data-bwignore="true" name={`acceso-${Math.random().toString(36).slice(2, 8)}`}  value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="admin" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4, display: 'block' }}>Clave</label>
            <input autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-form-type="other" data-lpignore="true" data-1p-ignore data-bwignore="true" name={`secret-${Math.random().toString(36).slice(2, 8)}`}  type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 14, outline: 'none' }} />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" style={{ padding: '12px', borderRadius: 10, background: '#0A5A5A', color: '#ffffff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 8 }}>
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  )
}
