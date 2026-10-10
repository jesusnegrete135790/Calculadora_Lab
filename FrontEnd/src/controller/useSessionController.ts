import { useEffect, useState } from 'react';
import { login, me, readSession, register, storeSession } from '../model/api';
import type { UserSession } from '../model/types';
export function useSessionController() {
  const [session, setSession] = useState<UserSession | null>(() => {
    const stored = readSession();
    if (stored) return stored;
    try { return sessionStorage.getItem('lab-demo') === '1' ? { name: 'Estudiante', mode: 'demo' } : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function signOut() { storeSession(null); sessionStorage.removeItem('lab-demo'); setSession(null); }
  useEffect(() => {
    const expired = () => { signOut(); setError('Tu sesión caducó. Inicia sesión de nuevo.'); };
    window.addEventListener('lab-session-expired', expired);
    return () => window.removeEventListener('lab-session-expired', expired);
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (session?.token) void me(session.token).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se pudo verificar la sesión.'); });
    return () => { cancelled = true; };
  }, [session?.token]);
  function enterDemo() { storeSession(null); sessionStorage.setItem('lab-demo', '1'); setError(''); setSession({ name: 'Estudiante', mode: 'demo' }); }
  async function authenticate(action: () => Promise<UserSession>) {
    setLoading(true); setError('');
    try { const next = await action(); storeSession(next); sessionStorage.removeItem('lab-demo'); setSession(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.'); }
    finally { setLoading(false); }
  }
  const signIn = (email: string, password: string) => authenticate(() => login(email, password));
  const signUp = (name: string, email: string, password: string) => authenticate(() => register(name, email, password));
  return { session, loading, error, enterDemo, signIn, signUp, signOut };
}
