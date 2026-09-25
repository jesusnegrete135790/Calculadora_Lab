import { ClipboardList, Info } from 'lucide-react';

export default function EvaluationPage() {
  return <div className="content-container"><div className="page-heading"><div><span className="eyebrow">EVALÚA TU APRENDIZAJE</span><h1>Evaluaciones</h1><p>Exámenes y seguimiento de resultados.</p></div></div><div className="empty-card evaluation-card"><ClipboardList size={36}/><h2>Fuera del esquema actual</h2><p>La versión actual de SQLQuery1.sql y su diagrama ya no incluyen tablas de exámenes, preguntas, respuestas o calificaciones. Esta sección informativa se conserva hasta que el equipo confirme si las evaluaciones seguirán en el alcance.</p><div className="inline-note"><Info size={18}/> Para activar esta herramienta hacen falta el modelo de datos, las reglas de evaluación y el contrato de API del backend.</div></div></div>;
}
