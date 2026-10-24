import { useState } from 'react';
import { Clock3, Trash2 } from 'lucide-react';
import { deleteCalculation } from '../../model/api';
import { useHistoryController } from '../../controller/useHistoryController';
import ResultPanel from '../components/ResultPanel';

export default function HistoryPage() {
  const { items, setItems, error, setError, loading, more, loadMore } = useHistoryController();
  const [selected, setSelected] = useState(items[0]?.id ?? '');
  const current = items.find((item) => item.id === selected) ?? items[0];
  async function removeCurrent() {
    if (!current) return;
    try { await deleteCalculation(current.id); setItems((old) => old.filter((item) => item.id !== current.id)); setSelected(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo eliminar.'); }
  }
  return <div className="content-container"><div className="page-heading"><div><span className="eyebrow">TU PROGRESO</span><h1>Mi historial</h1><p>Revisa tus cálculos guardados en SQL Server.</p></div>{items.length > 0 && <button className="button button-outline small" disabled={loading} onClick={() => void removeCurrent()}><Trash2 size={17}/> Eliminar cálculo seleccionado</button>}</div><div className="info-strip"><Clock3 size={18}/><span>Solo se muestran los registros de tu cuenta.</span></div>{error && <p className="error-message" role="alert">{error}</p>}{loading && <p role="status">Cargando historial…</p>}{more && <button className="button button-outline" disabled={loading} onClick={() => void loadMore()}>Cargar más</button>}{items.length ? <div className="history-layout"><div className="history-list">{items.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={`history-item${current?.id === item.id ? ' selected' : ''}`}><strong>{item.method}</strong><small>{new Date(item.createdAt).toLocaleString('es-MX')}</small><span>{item.result.value}</span></button>)}</div><ResultPanel result={current?.result ?? null} error=""/></div> : <div className="empty-card"><Clock3 size={32}/><h2>Todavía no hay cálculos</h2><p>Cuando uses los módulos, podrás revisar aquí los resultados de esta sesión.</p></div>}</div>;
}
