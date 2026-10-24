import { useContext, useEffect, useState } from 'react';
import { remoteHistory } from '../model/api';
import { SessionContext } from '../model/sessionContext';
import type { HistoryRecord } from '../model/types';

export function useHistoryController() {
  const session = useContext(SessionContext);
  const [items, setItems] = useState<HistoryRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setItems([]); setError(''); setMore(false);
    if (!session?.token) return;
    setLoading(true);
    void remoteHistory().then((data) => { if (!cancelled) { setItems(data); setMore(data.length === 50); } })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el historial.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.token]);
  async function loadMore() {
    setLoading(true); setError('');
    try { const data = await remoteHistory(items.length); setItems((old) => [...old, ...data]); setMore(data.length === 50); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cargar el historial.'); }
    finally { setLoading(false); }
  }
  return { items, setItems, error, setError, loading, more, loadMore };
}
