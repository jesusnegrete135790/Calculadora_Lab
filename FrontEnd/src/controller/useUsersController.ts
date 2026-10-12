import { useEffect, useState } from 'react';
import { createUser, deleteUser, listUserRoles, listUsers, updateUser } from '../model/api';
import type { ManagedUser, UserCreate, UserRole, UserUpdate } from '../model/types';

const message = (reason: unknown) => reason instanceof Error ? reason.message : 'No se pudo completar la operación.';
export function useUsersController(token: string) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [filters, setFilters] = useState({ offset: 0, q: '', rol: '', activo: '' });
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setUsers([]);
    void Promise.all([listUsers(token, filters), listUserRoles(token)])
      .then(([page, catalog]) => { if (!cancelled) { setUsers(page); setRoles(catalog); } })
      .catch((reason: unknown) => { if (!cancelled) setError(message(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, filters, revision]);
  async function mutate(action: () => Promise<unknown>, notice: string) {
    setSaving(true); setError(''); setSuccess('');
    try {
      await action(); setSuccess(notice); setRevision((value) => value + 1); return true;
    } catch (reason) { setError(message(reason)); return false; }
    finally { setSaving(false); }
  }
  function save(id: number | null, payload: UserCreate | UserUpdate) {
    return mutate(() => id === null ? createUser(payload as UserCreate, token) : updateUser(id, payload, token), id === null ? 'Cuenta creada.' : 'Cuenta actualizada.');
  }
  function remove(user: ManagedUser) {
    return mutate(async () => {
      await deleteUser(user.id, token);
      if (users.length === 1 && filters.offset > 0) setFilters((current) => ({ ...current, offset: Math.max(0, current.offset - 50) }));
    }, 'Cuenta eliminada.');
  }
  return { users, roles, filters, setFilters, loading, saving, error, success, save, remove, reload: () => setRevision((value) => value + 1) };
}
