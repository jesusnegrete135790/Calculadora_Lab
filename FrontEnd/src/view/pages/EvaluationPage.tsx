import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react';
import { evaluationHistory, getEvaluation, listEvaluations, submitEvaluation } from '../../model/api';
import type { EvaluationAnswer, EvaluationAttempt, EvaluationDetail, EvaluationSummary } from '../../model/types';

const moduleNames: Record<EvaluationSummary['module'], string> = {
  logica: 'Lógica matemática',
  finanzas: 'Matemáticas financieras',
  computacionales: 'Matemáticas computacionales',
  estadistica: 'Probabilidad y estadística',
};

export default function EvaluationPage({ token }: { token?: string }) {
  const [exams, setExams] = useState<EvaluationSummary[]>([]);
  const [attempts, setAttempts] = useState<EvaluationAttempt[]>([]);
  const [active, setActive] = useState<EvaluationDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, EvaluationAnswer['option']>>({});
  const [result, setResult] = useState<EvaluationAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setError('Inicia sesión con una cuenta para responder evaluaciones y guardar tus resultados en SQL Server.');
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    void Promise.all([listEvaluations(token), evaluationHistory(token)])
      .then(([catalog, history]) => {
        if (!cancelled) { setExams(catalog); setAttempts(history); setError(''); }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las evaluaciones.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  async function start(exam: EvaluationSummary) {
    if (!token) return;
    setLoading(true); setError(''); setMessage(''); setResult(null); setAnswers({});
    try { setActive(await getEvaluation(exam.id, token)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo abrir la evaluación.'); }
    finally { setLoading(false); }
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    if (!active || !token || Object.keys(answers).length !== active.questions.length) return;
    setSaving(true); setError(''); setMessage('');
    const payload = active.questions.map((question) => ({ questionId: question.id, option: answers[question.id] }));
    try {
      const saved = await submitEvaluation(active.id, payload, token);
      setResult(saved);
      setMessage('Evaluación guardada en tu historial de SQL Server.');
      setAttempts(await evaluationHistory(token));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la evaluación.');
    } finally { setSaving(false); }
  }

  return <div className="content-container">
    <div className="page-heading"><div><span className="eyebrow">EVALÚA TU APRENDIZAJE</span><h1>Evaluaciones</h1><p>Responde cinco preguntas por módulo y revisa tus resultados guardados.</p></div></div>
    {!token && <div className="inline-note">{error}</div>}
    {token && error && <p className="error-message" role="alert">{error}</p>}
    {token && message && <p className="evaluation-saved" role="status"><CheckCircle2 size={18}/>{message}</p>}
    {loading && <p role="status">Cargando evaluaciones…</p>}

    {token && !loading && !active && <section className="evaluation-grid" aria-label="Evaluaciones disponibles">
      {exams.map((exam) => <article className="form-card evaluation-exam" key={exam.id}>
        <div className="form-card-head"><span className="form-head-icon"><ClipboardList size={22}/></span><div><h2>{exam.title}</h2><p>{moduleNames[exam.module]} · {exam.questionCount} preguntas</p></div></div>
        <button className="button button-primary" onClick={() => void start(exam)}>Iniciar evaluación <ArrowRight size={17}/></button>
      </article>)}
    </section>}

    {active && <section className="form-card evaluation-active">
      <button className="text-button" onClick={() => { setActive(null); setResult(null); setAnswers({}); setMessage(''); }}><ArrowLeft size={16}/> Volver a evaluaciones</button>
      <div className="form-card-head"><span className="form-head-icon"><ClipboardList size={22}/></span><div><h2>{active.title}</h2><p>Responde las cinco preguntas. Tu calificación se calculará y guardará en la base de datos.</p></div></div>
      {result && <div className="evaluation-score"><strong>{result.correct} de {result.total} correctas</strong><span>Calificación: {Number(result.score).toFixed(0)}%</span></div>}
      <form className="evaluation-form" onSubmit={(event) => void finish(event)}>
        {active.questions.map((question) => {
          const review = result?.answers.find((answer) => answer.questionId === question.id);
          return <fieldset className="evaluation-question" key={question.id}>
            <legend>{question.order}. {question.prompt}</legend>
            <div className="evaluation-options">
              {Object.entries(question.options).map(([letter, label]) => <label className={`evaluation-option${answers[question.id] === letter ? ' selected' : ''}`} key={letter}>
                <input type="radio" name={`question-${question.id}`} value={letter} checked={answers[question.id] === letter} disabled={Boolean(result) || saving} onChange={() => setAnswers((current) => ({ ...current, [question.id]: letter as EvaluationAnswer['option'] }))}/>
                <strong>{letter}</strong><span>{label}</span>
              </label>)}
            </div>
            {review && <p className={`evaluation-review${review.isCorrect ? ' correct' : ' incorrect'}`}>
              {review.isCorrect ? 'Correcta.' : `Tu respuesta: ${review.selected}. Correcta: ${review.correctOption}.`} {review.explanation}
            </p>}
          </fieldset>;
        })}
        {!result && <button className="button button-primary" disabled={saving || Object.keys(answers).length !== active.questions.length}>{saving ? 'Guardando resultado…' : 'Enviar evaluación'} <ArrowRight size={17}/></button>}
      </form>
    </section>}

    {token && attempts.length > 0 && <section className="evaluation-history">
      <div className="section-header"><div><span className="eyebrow">TUS RESULTADOS</span><h2>Intentos guardados</h2></div></div>
      <div className="history-list">{attempts.map((attempt) => <article className="history-item evaluation-attempt" key={attempt.id}>
        <strong>{attempt.title}</strong><small>{moduleNames[attempt.module]} · {new Date(attempt.createdAt).toLocaleString('es-MX')}</small>
        <span>{attempt.correct}/{attempt.total} correctas · {Number(attempt.score).toFixed(0)}%</span>
      </article>)}</div>
    </section>}
  </div>;
}
