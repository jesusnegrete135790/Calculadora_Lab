import { useState } from 'react';
import { Clock3, Trash2 } from 'lucide-react';
import { clearHistory, getHistory } from '../../model/history';
import ResultPanel from '../components/ResultPanel';

export default function HistoryPage() {
  const [items, setItems] = useState(getHistory);
  const [selected, setSelected] = useState(items[0]?.id ?? '');
  const current = items.find((item) => item.id === selected);
  function removeAll() { clearHistory(); setItems([]); setSelected(''); }
  return <div className="content-container"><div className="page-heading"><div><span className="eyebrow">TU PROGRESO</span><h1>Historial local</h1><p>Revisa los últimos cálculos hechos en este navegador.</p></div>{items.length > 0 && <button className="button button-outline small" onClick={removeAll}><Trash2 size={17}/> Borrar historial</button>}</div><div className="info-strip"><Clock3 size={18}/><span>Se conservan hasta 50 cálculos en el almacenamiento de este navegador. No se sincronizan con la base de datos.</span></div>{items.length ? <div className="history-layout"><div className="history-list">{items.map((item) => <button key={item.id} onClick={() => setSelected(item.id)} className={`history-item${selected === item.id ? ' selected' : ''}`}><strong>{item.method}</strong><small>{new Date(item.createdAt).toLocaleString('es-MX')}</small><span>{item.result.value}</span></button>)}</div><ResultPanel result={current?.result ?? null} error=""/></div> : <div className="empty-card"><Clock3 size={32}/><h2>Todavía no hay cálculos</h2><p>Cuando uses los módulos, podrás revisar aquí los resultados de esta sesión.</p></div>}</div>;
}
