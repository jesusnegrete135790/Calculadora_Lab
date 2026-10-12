import { useState, type FormEvent } from 'react';
import { Pencil, Plus, RefreshCw, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { useUsersController } from '../../controller/useUsersController';
import type { ManagedUser, UserCreate, UserRole, UserSession, UserUpdate } from '../../model/types';

const emptyForm: UserCreate = { nombre: '', correo: '', contrasena: '', rol: 'Usuario', activo: true };
export default function UsersPage({ session }: { session: UserSession }) {
  const manager = useUsersController(session.token!);
  const [editing, setEditing] = useState<ManagedUser | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState<ManagedUser | null>(null);
  const [search, setSearch] = useState('');
  const busy = manager.loading || manager.saving;
  const ownAccount = editing?.id === session.id;
  function openForm(user: ManagedUser | null) {
    setEditing(user); setPendingDelete(null);
    setForm(user ? { nombre: user.nombre, correo: user.correo, rol: user.rol, activo: user.activo, contrasena: '' } : { ...emptyForm });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (editing === undefined || busy) return;
    const payload: UserUpdate = { ...form, nombre: form.nombre.trim(), correo: form.correo.trim() };
    if (editing && !form.contrasena) delete payload.contrasena;
    if (await manager.save(editing?.id ?? null, payload)) {
      setEditing(undefined); setForm({ ...emptyForm });
      window.dispatchEvent(new Event('lab-permissions-changed'));
    }
  }
  async function confirmDelete() {
    if (pendingDelete && await manager.remove(pendingDelete)) setPendingDelete(null);
  }
  return <div className="content-container users-page">
    <div className="page-heading"><div><span className="eyebrow">ADMINISTRACIÓN</span><h1>Gestor de usuarios</h1><p>Administra las cuentas, sus roles y su acceso al laboratorio.</p></div><button className="button button-primary" disabled={busy || !manager.roles.length} onClick={() => openForm(null)}><Plus size={17}/> Nueva cuenta</button></div>
    <div className="info-strip"><ShieldCheck size={18}/><span>Solo los administradores pueden gestionar cuentas. Las cuentas desactivadas conservan su historial.</span></div>
    {manager.error && <p className="error-message" role="alert">{manager.error}</p>}
    {manager.success && <p className="evaluation-saved" role="status">{manager.success}</p>}
    <form className="users-filters" onSubmit={(event) => { event.preventDefault(); manager.setFilters((current) => ({ ...current, offset: 0, q: search.trim() })); }}>
      <label className="field"><span>Nombre o correo</span><input type="search" value={search} maxLength={100} placeholder="Buscar cuenta" onChange={(event) => setSearch(event.target.value)}/></label>
      <label className="field"><span>Rol</span><select disabled={busy} value={manager.filters.rol} onChange={(event) => manager.setFilters((current) => ({ ...current, offset: 0, rol: event.target.value }))}><option value="">Todos los roles</option>{manager.roles.map((role) => <option key={role}>{role}</option>)}</select></label>
      <label className="field"><span>Estado</span><select disabled={busy} value={manager.filters.activo} onChange={(event) => manager.setFilters((current) => ({ ...current, offset: 0, activo: event.target.value }))}><option value="">Todas las cuentas</option><option value="true">Activas</option><option value="false">Desactivadas</option></select></label>
      <button className="button button-outline" disabled={busy}>Buscar</button><button type="button" className="icon-button" disabled={busy} aria-label="Actualizar usuarios" onClick={manager.reload}><RefreshCw size={18}/></button>
    </form>
    {editing !== undefined && <section className="form-card users-editor" aria-labelledby="user-form-title">
      <div className="users-card-heading"><h2 id="user-form-title">{editing ? 'Editar cuenta' : 'Nueva cuenta'}</h2><button className="icon-button" aria-label="Cerrar edición" disabled={manager.saving} onClick={() => { setEditing(undefined); setForm({ ...emptyForm }); }}><X size={19}/></button></div>
      <form onSubmit={(event) => void submit(event)}><fieldset disabled={busy} className="users-fieldset">
        <div className="field-row"><label className="field"><span>Nombre</span><input required maxLength={100} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })}/></label><label className="field"><span>Correo</span><input type="email" required maxLength={100} value={form.correo} onChange={(event) => setForm({ ...form, correo: event.target.value })}/></label></div>
        <div className="field-row"><label className="field"><span>Rol</span><select disabled={ownAccount} value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value as UserRole })}>{manager.roles.map((role) => <option key={role}>{role}</option>)}</select></label><label className="field"><span>Estado</span><select disabled={ownAccount} value={String(form.activo)} onChange={(event) => setForm({ ...form, activo: event.target.value === 'true' })}><option value="true">Activa</option><option value="false">Desactivada</option></select></label></div>
        <label className="field"><span>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</span><input type="password" autoComplete="new-password" required={!editing} minLength={10} maxLength={128} value={form.contrasena} onChange={(event) => setForm({ ...form, contrasena: event.target.value })}/><small>{editing ? 'Deja el campo vacío para conservarla. Al cambiarla se cierran las sesiones anteriores.' : 'Entre 10 y 128 caracteres.'}</small></label>
        {ownAccount && <p className="inline-note">Puedes editar tu perfil. Tu rol y estado se mantienen para conservar el acceso de administración.</p>}
        <div className="users-actions"><button className="button button-primary">{manager.saving ? 'Guardando…' : 'Guardar cuenta'}</button><button type="button" className="button button-outline" onClick={() => { setEditing(undefined); setForm({ ...emptyForm }); }}>Cancelar</button></div>
      </fieldset></form>
    </section>}
    {pendingDelete && <section className="users-delete-confirm" aria-labelledby="delete-user-title"><h2 id="delete-user-title">Eliminar a {pendingDelete.nombre}</h2><p>Se eliminará la cuenta {pendingDelete.correo}. Si tiene historial, desactívala desde Editar cuenta para conservar sus registros.</p><div className="users-actions"><button className="button users-danger" disabled={busy} onClick={() => void confirmDelete()}>Confirmar eliminación</button><button className="button button-outline" disabled={busy} onClick={() => setPendingDelete(null)}>Cancelar</button></div></section>}
    {manager.loading ? <p role="status">Cargando usuarios…</p> : manager.users.length ? <div className="table-scroll users-table"><table><caption className="sr-only">Cuentas del laboratorio</caption><thead><tr><th scope="col">Usuario</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{manager.users.map((user) => <tr key={user.id}><td><strong>{user.nombre}</strong>{user.id === session.id && <small className="users-self">Tu cuenta</small>}</td><td>{user.correo}</td><td>{user.rol}</td><td><span className={`users-status${user.activo ? ' active' : ''}`}>{user.activo ? 'Activa' : 'Desactivada'}</span></td><td><div className="users-actions"><button className="button button-outline small" disabled={busy} aria-label={`Editar a ${user.nombre}`} onClick={() => openForm(user)}><Pencil size={14}/> Editar</button><button className="icon-button users-danger-icon" disabled={busy || user.id === session.id} aria-label={`Eliminar a ${user.nombre}`} title={user.id === session.id ? 'No puedes eliminar tu propia cuenta' : 'Eliminar cuenta'} onClick={() => { setPendingDelete(user); setEditing(undefined); setForm({ ...emptyForm }); }}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div> : <div className="empty-card"><Users size={30}/><h2>{manager.error ? 'Usuarios no disponibles' : 'No se encontraron cuentas'}</h2><p>{manager.error ? 'Revisa el mensaje e intenta actualizar.' : 'Prueba con otro nombre, rol o estado.'}</p></div>}
    <div className="users-pagination"><button className="button button-outline small" disabled={busy || manager.filters.offset === 0} onClick={() => manager.setFilters((current) => ({ ...current, offset: Math.max(0, current.offset - 50) }))}>Anterior</button><span>Página {Math.floor(manager.filters.offset / 50) + 1}</span><button className="button button-outline small" disabled={busy || manager.users.length < 50} onClick={() => manager.setFilters((current) => ({ ...current, offset: current.offset + 50 }))}>Siguiente</button></div>
  </div>;
}
