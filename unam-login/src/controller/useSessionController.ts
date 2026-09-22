import { useState } from 'react';
import { login } from '../model/api';
import type { UserSession } from '../model/types';

export function useSessionController() {
  const [session, setSession] = useState<UserSession | null>(() => {
    try { return sessionStorage.getItem('lab-demo') === '1' ? { name: 'Estudiante', mode: 'demo' } : null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function enterDemo() {
    sessionStorage.setItem('lab-demo', '1');
    setError('');
    setSession({ name: 'Estudiante', mode: 'demo' });
  }
  async function signIn(email: string, password: string) {
    setLoading(true); setError('');
    try { setSession(await login(email, password)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.'); }
    finally { setLoading(false); }
  }
  function signOut() { sessionStorage.removeItem('lab-demo'); setSession(null); }
  return { session, loading, error, enterDemo, signIn, signOut };
}
