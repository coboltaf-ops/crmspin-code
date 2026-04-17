'use client'
import { useState } from 'react'
import { useUsuariosStore } from '@/features/usuarios-gestion/store/usuarios-store'
import { useCurrentUserStore } from '@/features/usuarios-gestion/store/current-user-store'
import { useRolesStore } from '@/features/usuarios-gestion/store/roles-store'
import { Usuario, MODULOS_CRM, ESTADOS_CONFIG } from '@/features/usuarios-gestion/types'
import { exportToPDF, exportToExcel } from '@/shared/lib/export-report'

export default function UsuariosPage() {
  const { usuarios, addUsuario, updateUsuario, deleteUsuario } = useUsuariosStore()
  const currentUser = useCurrentUserStore(s => s.user)
  const { roles, addRol, updateRol, deleteRol } = useRolesStore()

  const [selected, setSelected] = useState<Usuario | null>(null)
  const [isForm, setIsForm] = useState(false)
  const [tab, setTab] = useState<'usuarios' | 'roles' | 'reportes'>('usuarios')
  const [selectedRolId, setSelectedRolId] = useState(roles[0]?.id || '')
  const [nuevoRolNombre, setNuevoRolNombre] = useState('')
  const [showNewRol, setShowNewRol] = useState(false)

  if (currentUser?.rol.toLowerCase() !== 'admin') {
    return <div style={{ color: '#fca5a5', padding: 40, textAlign: 'center' }}>No tienes acceso a esta sección</div>
  }

  const selectedRolObj = roles.find(r => r.id === selectedRolId)
  const rolNames = roles.map(r => r.nombre)

  const emptyUser = (): Usuario => {
    const firstNonAdmin = roles.find(r => r.nombre !== 'Admin')
    return {
      id: '', nombre: '', apellido: '', usuario: '', clave: '', correo: '',
      rol: firstNonAdmin?.nombre || 'Ventas', situacion: 'Activo',
      permisos: firstNonAdmin?.permisos || MODULOS_CRM.map(m => ({ modulo: m.id, leer: true, editar: false, eliminar: false })),
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    // Assign permisos from the role
    const rol = roles.find(r => r.nombre === selected.rol)
    const withPermisos = { ...selected, permisos: rol?.permisos || selected.permisos }
    if (withPermisos.id) {
      const toUpdate = withPermisos.clave ? withPermisos : { ...withPermisos, clave: usuarios.find(u => u.id === withPermisos.id)?.clave || '' }
      updateUsuario(withPermisos.id, toUpdate)
    } else {
      if (!withPermisos.clave) { alert('La clave es requerida para usuarios nuevos'); return }
      addUsuario({ ...withPermisos, id: crypto.randomUUID() })
    }
    setIsForm(false); setSelected(null)
  }

  const handleCreateRol = () => {
    if (!nuevoRolNombre.trim()) return
    if (roles.some(r => r.nombre.toLowerCase() === nuevoRolNombre.trim().toLowerCase())) {
      alert('Ya existe un rol con ese nombre'); return
    }
    addRol({
      id: crypto.randomUUID(),
      nombre: nuevoRolNombre.trim(),
      permisos: MODULOS_CRM.map(m => ({ modulo: m.id, leer: true, editar: false, eliminar: false })),
    })
    setNuevoRolNombre('')
    setShowNewRol(false)
  }

  const handleDeleteRol = (rolId: string) => {
    const rol = roles.find(r => r.id === rolId)
    if (!rol) return
    if (rol.nombre === 'Admin') { alert('No se puede eliminar el rol Admin'); return }
    const usersWithRol = usuarios.filter(u => u.rol === rol.nombre)
    if (usersWithRol.length > 0) { alert(`No se puede eliminar: ${usersWithRol.length} usuario(s) tienen este rol asignado`); return }
    if (confirm(`¿Eliminar el rol "${rol.nombre}"?`)) {
      deleteRol(rolId)
      if (selectedRolId === rolId) setSelectedRolId(roles[0]?.id || '')
    }
  }

  const updateRolPermiso = (moduloId: string, campo: 'leer' | 'editar' | 'eliminar', value: boolean) => {
    if (!selectedRolObj || selectedRolObj.nombre === 'Admin') return
    const newPermisos = selectedRolObj.permisos.map(p => p.modulo === moduloId ? { ...p, [campo]: value } : p)
    updateRol(selectedRolObj.id, { permisos: newPermisos })
    // Update all users with this role
    usuarios.filter(u => u.rol === selectedRolObj.nombre).forEach(u => updateUsuario(u.id, { permisos: newPermisos }))
  }

  const setAllPermisos = (value: boolean) => {
    if (!selectedRolObj || selectedRolObj.nombre === 'Admin') return
    const newPermisos = MODULOS_CRM.map(m => ({ modulo: m.id, leer: value, editar: value, eliminar: value }))
    updateRol(selectedRolObj.id, { permisos: newPermisos })
    usuarios.filter(u => u.rol === selectedRolObj.nombre).forEach(u => updateUsuario(u.id, { permisos: newPermisos }))
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: 13, outline: 'none' }
  const btnStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({ ...btnStyle, background: active ? '#1e3a8a' : 'rgba(255,255,255,0.15)', color: active ? '#ffffff' : 'rgba(255,255,255,0.7)', border: active ? '1px solid #2563eb' : '1px solid rgba(255,255,255,0.2)' })

  const reportOpts = {
    title: 'Gestión de Usuarios',
    columns: [
      { header: 'Usuario', key: 'usuario' }, { header: 'Nombre', key: 'nombre' },
      { header: 'Apellido', key: 'apellido' }, { header: 'Correo', key: 'correo' },
      { header: 'Rol', key: 'rol' }, { header: 'Estado', key: 'situacion' },
    ],
    rows: usuarios.map(u => ({ usuario: u.usuario, nombre: u.nombre, apellido: u.apellido, correo: u.correo, rol: u.rol, situacion: u.situacion })),
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Gestión de Usuarios</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Administra usuarios, roles y permisos del sistema</p>
        </div>
        {tab === 'usuarios' && !isForm && <button onClick={() => { setSelected(emptyUser()); setIsForm(true) }} style={{ ...btnStyle, background: '#0f1b3d', color: '#ffffff' }}>+ Nuevo Usuario</button>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('usuarios')} style={tabBtnStyle(tab === 'usuarios')}>👤 Usuarios</button>
        <button onClick={() => setTab('roles')} style={tabBtnStyle(tab === 'roles')}>🔐 Roles y Permisos</button>
        <button onClick={() => setTab('reportes')} style={tabBtnStyle(tab === 'reportes')}>📊 Reportes</button>
      </div>

      {/* ═══ TAB: USUARIOS ═══ */}
      {tab === 'usuarios' && !isForm && (
        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Usuario', 'Nombre', 'Apellido', 'Correo', 'Rol', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', background: '#1e3a5f', color: '#fff', fontSize: 12, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => {
                const est = ESTADOS_CONFIG[u.situacion] || {}
                return (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{u.usuario}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{u.nombre}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', fontSize: 13 }}>{u.apellido}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{u.correo}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#4ade80', fontSize: 13 }}>{u.rol}</td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: est.bg, color: est.color, border: est.border }}>{u.situacion}</span>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setSelected(u); setIsForm(true) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>Editar</button>
                        {u.id !== 'admin-1' && <button onClick={() => { if (confirm(`¿Eliminar usuario "${u.usuario}"?`)) deleteUsuario(u.id) }} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ TAB: FORM USUARIO ═══ */}
      {tab === 'usuarios' && isForm && selected && (
        <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
          <h3 style={{ color: '#ffffff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{selected.id ? 'Editar' : 'Nuevo'} Usuario</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Nombre', key: 'nombre' }, { label: 'Apellido', key: 'apellido' },
              { label: 'Usuario', key: 'usuario' }, { label: 'Correo', key: 'correo' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>{f.label}</label>
                <input value={(selected as unknown as Record<string, string>)[f.key] || ''} onChange={e => setSelected({ ...selected, [f.key]: e.target.value })} required style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Clave {selected.id && '(dejar vacío = mantener)'}</label>
              <input type="password" value={selected.clave || ''} onChange={e => setSelected({ ...selected, clave: e.target.value })} required={!selected.id} style={inputStyle} />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Rol</label>
              <select value={selected.rol} onChange={e => {
                const rol = roles.find(r => r.nombre === e.target.value)
                setSelected({ ...selected, rol: e.target.value, permisos: rol?.permisos || selected.permisos })
              }} style={inputStyle}>
                {rolNames.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Situación</label>
              <select value={selected.situacion} onChange={e => setSelected({ ...selected, situacion: e.target.value })} style={inputStyle}>
                {['Activo', 'Inactivo', 'Bloqueado'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ ...btnStyle, background: '#0f1b3d', color: '#ffffff' }}>Guardar</button>
            <button type="button" onClick={() => { setIsForm(false); setSelected(null) }} style={{ ...btnStyle, background: '#64748b', color: '#ffffff' }}>Cancelar</button>
          </div>
        </form>
      )}

      {/* ═══ TAB: ROLES Y PERMISOS ═══ */}
      {tab === 'roles' && (
        <div>
          {/* Lista de roles + crear nuevo */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {roles.map(r => (
              <button key={r.id} onClick={() => setSelectedRolId(r.id)}
                style={{ ...btnStyle, background: '#000000', color: '#ffffff', border: '1px solid #333333', fontSize: 14 }}>
                {r.nombre}
                {r.nombre !== 'Admin' && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>({usuarios.filter(u => u.rol === r.nombre).length})</span>
                )}
              </button>
            ))}
            {!showNewRol ? (
              <button onClick={() => setShowNewRol(true)} style={{ ...btnStyle, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>+ Nuevo Rol</button>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={nuevoRolNombre} onChange={e => setNuevoRolNombre(e.target.value)} placeholder="Nombre del rol..." style={{ ...inputStyle, width: 180 }} onKeyDown={e => e.key === 'Enter' && handleCreateRol()} autoFocus />
                <button onClick={handleCreateRol} style={{ ...btnStyle, background: '#0f1b3d', color: '#ffffff' }}>Crear</button>
                <button onClick={() => { setShowNewRol(false); setNuevoRolNombre('') }} style={{ ...btnStyle, background: '#64748b', color: '#ffffff' }}>×</button>
              </div>
            )}
          </div>

          {/* Permisos del rol seleccionado */}
          {selectedRolObj && (
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: 18, fontWeight: 700 }}>Permisos: {selectedRolObj.nombre}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    {selectedRolObj.nombre === 'Admin' ? 'Acceso total al sistema (no editable)' : `Configura los permisos para el rol ${selectedRolObj.nombre}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>
                    {usuarios.filter(u => u.rol === selectedRolObj.nombre).length} usuario(s)
                  </span>
                  {selectedRolObj.nombre !== 'Admin' && (
                    <button onClick={() => handleDeleteRol(selectedRolObj.id)} style={{ ...btnStyle, padding: '4px 12px', fontSize: 11, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Eliminar Rol</button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MODULOS_CRM.map((m, i) => {
                  const perms = selectedRolObj.permisos.find(p => p.modulo === m.id)
                  const isAdmin = selectedRolObj.nombre === 'Admin'
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 600 }}>{m.label}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 24 }}>
                        {(['leer', 'editar', 'eliminar'] as const).map(p => (
                          <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: isAdmin ? 'not-allowed' : 'pointer' }}>
                            <input type="checkbox"
                              checked={perms?.[p] ?? false}
                              disabled={isAdmin}
                              onChange={e => updateRolPermiso(m.id, p, e.target.checked)}
                              style={{ accentColor: p === 'leer' ? '#16a34a' : p === 'editar' ? '#1e3a8a' : '#dc2626', width: 18, height: 18, cursor: isAdmin ? 'not-allowed' : 'pointer' }}
                            />
                            <span style={{ color: p === 'leer' ? '#22c55e' : p === 'editar' ? '#3b82f6' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
                              {p === 'leer' ? 'Leer' : p === 'editar' ? 'Editar' : 'Eliminar'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {selectedRolObj.nombre !== 'Admin' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setAllPermisos(true)} style={{ ...btnStyle, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>Marcar Todos</button>
                  <button onClick={() => setAllPermisos(false)} style={{ ...btnStyle, background: '#dc2626', color: '#ffffff', border: '1px solid #ef4444' }}>Desmarcar Todos</button>
                </div>
              )}
            </div>
          )}

          {/* Usuarios con este rol */}
          {selectedRolObj && usuarios.filter(u => u.rol === selectedRolObj.nombre).length > 0 && (
            <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.15)' }}>
              <p style={{ color: '#ffffff', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Usuarios con rol {selectedRolObj.nombre}:</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {usuarios.filter(u => u.rol === selectedRolObj.nombre).map(u => (
                  <span key={u.id} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, background: 'rgba(34,197,94,0.15)', color: '#86efac', border: '1px solid rgba(34,197,94,0.2)' }}>
                    {u.nombre} {u.apellido}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: REPORTES ═══ */}
      {tab === 'reportes' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => exportToPDF(reportOpts)} style={{ ...btnStyle, background: '#b91c1c', color: '#ffffff', border: '1px solid #dc2626' }}>Exportar PDF</button>
          <button onClick={() => exportToExcel(reportOpts)} style={{ ...btnStyle, background: '#15803d', color: '#ffffff', border: '1px solid #16a34a' }}>Exportar Excel</button>
        </div>
      )}
    </div>
  )
}
