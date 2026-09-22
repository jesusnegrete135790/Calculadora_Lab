import { ClipboardList, Info } from 'lucide-react';

export default function EvaluationPage() {
  return <div className="content-container"><div className="page-heading"><div><span className="eyebrow">EVALÚA TU APRENDIZAJE</span><h1>Evaluaciones</h1><p>Exámenes y seguimiento de resultados.</p></div></div><div className="empty-card evaluation-card"><ClipboardList size={36}/><h2>Pendiente de integración</h2><p>El diagrama muestra exámenes, preguntas, respuestas y calificaciones, pero esas tablas no están en el script SQL recibido. Esta sección quedará activa cuando el equipo confirme el esquema y las reglas de evaluación.</p><div className="inline-note"><Info size={18}/> Se necesita el contrato de API para consultar exámenes y enviar respuestas.</div></div></div>;
}
