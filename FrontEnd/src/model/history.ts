import type { HistoryRecord } from './types';

const KEY = 'laboratorio-matematico-history-v1';

export function getHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as HistoryRecord[] : [];
  } catch {
    return [];
  }
}

export function saveHistory(record: Omit<HistoryRecord, 'id' | 'createdAt'>): HistoryRecord[] {
  const next = [{ ...record, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...getHistory()].slice(0, 50);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* El cálculo sigue disponible aunque el navegador bloquee el almacenamiento. */ }
  return next;
}

export function clearHistory(): void {
  try { localStorage.removeItem(KEY); } catch { /* Sin almacenamiento disponible. */ }
}
