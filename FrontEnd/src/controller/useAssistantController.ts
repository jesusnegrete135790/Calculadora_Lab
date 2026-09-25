import { useState } from 'react';
import { askAssistant } from '../model/api';

export function useAssistantController(token?: string) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function ask(module: string) {
    if (!question.trim()) { setError('Escribe una pregunta.'); return; }
    setLoading(true); setError(''); setAnswer('');
    try { setAnswer(await askAssistant(question.trim(), module, token)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo consultar el asistente.'); }
    finally { setLoading(false); }
  }
  return { question, setQuestion, answer, error, loading, ask };
}
