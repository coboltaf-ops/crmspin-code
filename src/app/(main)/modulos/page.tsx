'use client'
import { useModulosStore } from '@/features/modulos/store/modulos-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'

export default function ModulosPage() {
  const currentUser = useCurrentUserStore(s => s.user)
  const { modulos, toggleModulo } = useModulosStore()

  if (currentUser?.rol.toLowerCase() !== 'admin') {
    return <div style={{ color: '#fca5a5', padding: 40, textAlign: 'center' }}>No tienes acceso a esta sección</div>
  }

  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }

  const activos = modulos.filter(m => m.activo).length
  const inactivos = modulos.filter(m => !m.activo).length

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Módulos del Sistema</h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 20 }}>Activa o desactiva los módulos disponibles en el menú</p>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div className="crm-white" style={{ background: '#166534', borderRadius: 12, padding: '12px 24px', border: '1px solid #15803d', textAlign: 'center' }}>
          <p style={{ color: '#ffffff', fontSize: 28, fontWeight: 800 }}>{activos}</p>
          <p style={{ color: '#ffffff', fontSize: 12 }}>Activos</p>
        </div>
        <div className="crm-white" style={{ background: '#b91c1c', borderRadius: 12, padding: '12px 24px', border: '1px solid #dc2626', textAlign: 'center' }}>
          <p style={{ color: '#ffffff', fontSize: 28, fontWeight: 800 }}>{inactivos}</p>
          <p style={{ color: '#ffffff', fontSize: 12 }}>Inactivos</p>
        </div>
      </div>

      {/* Lista de módulos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modulos.map((m) => {
          const isProtected = m.id === 'dashboard' || m.id === 'usuarios' || m.id === 'modulos'
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', padding: '16px 20px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <span style={{ fontSize: 24, marginRight: 16 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#ffffff', fontSize: 15, fontWeight: 600 }}>{m.label}</p>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12.5 }}>{m.href}</p>
              </div>
              {isProtected ? (
                <div className="crm-white" style={{ ...btnStyle, background: '#166534', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#ffffff', fontSize: 12.5, fontWeight: 700 }}>Siempre activo</span>
                  <div style={{ width: 48, height: 26, borderRadius: 13, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 3px' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
                  </div>
                </div>
              ) : (
                <button onClick={() => toggleModulo(m.id)} style={{ ...btnStyle, background: m.activo ? '#166534' : '#b91c1c', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>
                    {m.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <div style={{
                    width: 48, height: 26, borderRadius: 13,
                    background: 'rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: m.activo ? 'flex-end' : 'flex-start',
                    padding: '0 3px', transition: 'all 0.3s',
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.3s' }} />
                  </div>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
