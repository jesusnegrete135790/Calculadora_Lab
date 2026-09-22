import { useState } from 'react';
import { saveHistory } from '../model/history';
import type { CalculationResult, ModuleId } from '../model/types';

export function useCalculationController<T>(module: ModuleId, calculate: (input: T) => CalculationResult) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState('');
  function run(method: string, input: T) {
    setError('');
    try {
      const next = calculate(input);
      setResult(next);
      saveHistory({ module, method, input: JSON.stringify(input), result: next });
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : 'No se pudo calcular el resultado.');
    }
  }
  function reset() { setResult(null); setError(''); }
  return { result, error, run, reset };
}
