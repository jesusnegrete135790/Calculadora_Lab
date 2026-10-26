import { useEffect, useState } from 'react';
import { login, register, me, readSession, sessionWithUser, storeSession } from '../model/api';
import type { UserSession } from '../model/types';
export function useSessionController() {
  const [session, setSession] = useState<UserSession | null>(readSession);
  const [verifying, setVerifying] = useState(() => Boolean(readSession()?.token));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  function signOut() { storeSession(null); setSession(null); setVerifying(false); }
  useEffect(() => {
    const expired = () => { signOut(); setError('Tu sesión caducó. Inicia sesión de nuevo.'); };
    window.addEventListener('lab-session-expired', expired);
    return () => window.removeEventListener('lab-session-expired', expired);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const token = session?.token;
    async function refresh() {
      if (!token) { setVerifying(false); return; }
      try {
        const user = await me(token);
        const next = sessionWithUser({ name: '', mode: 'api', token }, user);
        if (!cancelled) setSession((current) => {
          if (current?.token !== token) return current;
          storeSession(next); return next;
        });
      } catch (reason) {
        if (!cancelled) {
          setSession((current) => {
            if (current?.token !== token) return current;
            storeSession(null); return null;
          });
          setError(reason instanceof Error ? reason.message : 'No se pudo verificar la sesión.');
        }
      } finally { if (!cancelled) setVerifying(false); }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    const refreshOnFocus = () => void refresh();
    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('lab-permissions-changed', refreshOnFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', refreshOnFocus); window.removeEventListener('lab-permissions-changed', refreshOnFocus); };
  }, [session?.token]);
  async function signIn(email: string, password: string) {
    setLoading(true); setError('');
    try { const next = await login(email, password); storeSession(next); setSession(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.'); }
    finally { setLoading(false); }
  }
  async function signUp(name: string, email: string, password: string) {
    setLoading(true); setError('');
    try { const next = await register(name, email, password); storeSession(next); setSession(next); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo crear la cuenta.'); }
    finally { setLoading(false); }
  }
  return { session, verifying, loading, error, signIn, signUp, signOut, clearError: () => setError('') };
}
