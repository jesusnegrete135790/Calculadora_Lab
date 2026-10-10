import { useContext, useRef, useState } from 'react';
import { saveHistory } from '../model/history';
import { saveCalculation } from '../model/api';
import { SessionContext } from '../model/sessionContext';
import type { CalculationResult, ModuleId } from '../model/types';
export function useCalculationController<T>(module: ModuleId, calculate: (input: T) => CalculationResult) {
  const session = useContext(SessionContext);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const generation = useRef(0);
  const pending = useRef(false);
  async function run(method: string, input: T) {
    if (pending.current) return;
    const current = ++generation.current;
    setError(''); setSaveStatus('');
    let next: CalculationResult;
    try { next = calculate(input); setResult(next); }
    catch (reason) { setResult(null); setError(reason instanceof Error ? reason.message : 'No se pudo calcular.'); return; }
    if (session?.mode === 'api' && session.token) {
      pending.current = true; setSaving(true);
      try { await saveCalculation(module, method, input, next, session.token); if (current === generation.current) setSaveStatus('Guardado en tu historial.'); }
      catch (reason) { if (current === generation.current) setSaveStatus(`El cálculo está disponible, pero no se guardó: ${reason instanceof Error ? reason.message : 'Error de conexión'}`); }
      finally { pending.current = false; setSaving(false); }
    } else { saveHistory({ module, method, input: JSON.stringify(input), result: next }); setSaveStatus('Guardado en el historial local de demostración.'); }
  }
  function reset() { generation.current++; setResult(null); setError(''); setSaveStatus(''); }
  return { result, error, run, reset, saving, saveStatus };
}
