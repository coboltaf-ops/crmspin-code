'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUsuariosStore } from '@/features/usuarios-gestion/store/usuarios-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'

export default function LoginPage() {
  const router = useRouter()
  const usuarios = useUsuariosStore(s => s.usuarios)
  const setUser = useCurrentUserStore(s => s.setUser)
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const found = usuarios.find(u => u.usuario === usuario && u.clave === clave && u.situacion === 'Activo')
    if (!found) { setError('Usuario o clave incorrectos'); return }
    setUser(found)
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e3a8a' }}>
      <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: 40, width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>CRM SPIN</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Inicia sesión en tu cuenta</p>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4, display: 'block' }}>Usuario</label>
            <input value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="admin" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4, display: 'block' }}>Clave</label>
            <input type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 14, outline: 'none' }} />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button type="submit" style={{ padding: '12px', borderRadius: 10, background: '#0f1b3d', color: '#ffffff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 8 }}>
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  )
}
