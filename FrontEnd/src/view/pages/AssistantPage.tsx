import { FormEvent, useEffect, useState } from 'react';
import { Bot, Info, MessageCircle, Send } from 'lucide-react';
import { assistantHistory, type AssistantRecord, hasApi } from '../../model/api';
import { useAssistantController } from '../../controller/useAssistantController';

export default function AssistantPage({ token }: { token?: string }) {
  const [history, setHistory] = useState<AssistantRecord[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [module, setModule] = useState('Lógica matemática');
  const assistant = useAssistantController(token);
  useEffect(() => {
    let cancelled = false;
    if (token) void assistantHistory(token).then((records) => { if (!cancelled) setHistory(records); }).catch((reason: unknown) => { if (!cancelled) setHistoryError(reason instanceof Error ? reason.message : 'No se pudo cargar el historial.'); });
    return () => { cancelled = true; };
  }, [token, assistant.answer]);
  function submit(event: FormEvent) { event.preventDefault(); void assistant.ask(module); }
  return <div className="content-container"><div className="page-heading"><div><span className="eyebrow">APRENDE CON APOYO</span><h1>Asistente de dudas</h1><p>Pregunta sobre los conceptos o el procedimiento de algún módulo.</p></div></div><div className="assistant-layout"><section className="form-card"><div className="form-card-head"><span className="form-head-icon"><MessageCircle size={23}/></span><div><h2>Haz una pregunta</h2><p>Selecciona el área para contextualizar tu duda.</p></div></div><form onSubmit={submit} className="fields"><label className="field"><span>Módulo</span><select value={module} onChange={(event) => setModule(event.target.value)}><option>Lógica matemática</option><option>Matemáticas financieras</option><option>Matemáticas computacionales</option><option>Probabilidad y estadística</option></select></label><label className="field"><span>Tu pregunta</span><textarea value={assistant.question} onChange={(event) => assistant.setQuestion(event.target.value)} rows={6} placeholder="Por ejemplo: ¿por qué cambia el abono a capital después de un pago adicional?"/></label><button className="button button-primary" disabled={assistant.loading || !hasApi || !token}>{assistant.loading ? 'Consultando…' : 'Enviar pregunta'}<Send size={17}/></button></form>{(!hasApi || !token) && <div className="inline-note"><Info size={18}/> No se pudo habilitar el asistente. Revisa la conexión con el servidor y vuelve a iniciar sesión.</div>}</section><section className="assistant-answer"><div className="assistant-avatar"><Bot size={30}/></div><h2>Respuesta del asistente</h2>{assistant.error ? <p className="error-message" role="alert">{assistant.error}</p> : assistant.answer ? <p className="answer-text">{assistant.answer}</p> : <p>Cuando el backend esté conectado, aquí aparecerá la explicación a tu pregunta.</p>}</section></div>{historyError && <p role="alert" className="error-message">{historyError}</p>}{history.length > 0 && <section className="form-card"><h2>Mis consultas anteriores</h2>{history.map((item) => <details key={item.id}><summary>{item.pregunta} · {new Date(item.fecha).toLocaleString()}</summary><p className="answer-text">{item.respuesta}</p></details>)}</section>}</div>;
}
