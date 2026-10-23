import { describe, expect, it } from 'vitest';
import { calculateLogic, truthTable } from './logic';

describe('tablas, constantes y mapas de Karnaugh', () => {
  it.each([
    ['A ∨ ¬A', 'Tautología'], ['A ∧ ¬A', 'Contradicción'], ['A → B', 'Contingencia'],
  ])('clasifica %s', (expression, classification) => {
    expect(truthTable(expression).steps.find((step) => step.title === 'Clasificación')?.detail).toContain(classification);
  });

  it.each(['A', '¬A', '1', '0', 'A ∧ 1', 'A ∨ 0'])('mantiene el mapa alineado con la tabla para %s', (expression) => {
    const result = truthTable(expression);
    const rows = result.table!.rows;
    expect(result.logicMap!.cells).toHaveLength(rows.length);
    result.logicMap!.cells.forEach((cell) => expect(cell.value).toBe(rows[cell.minterm].at(-1)));
  });

  it('asocia el condicional a la derecha y respeta los paréntesis', () => {
    expect(calculateLogic({ method: 'equivalence', left: 'A → B → C', right: 'A → (B → C)' }).value).toBe('Equivalentes');
    expect(calculateLogic({ method: 'equivalence', left: 'A → B → C', right: '(A → B) → C' }).value).toBe('No equivalentes');
  });
});

describe('equivalencia e inferencia', () => {
  it.each([
    ['¬(A ∧ B)', '¬A ∨ ¬B'], ['A → B', '¬A ∨ B'], ['A ↔ B', '(A → B) ∧ (B → A)'], ['A ∨ (A ∧ B)', 'A'],
  ])('verifica %s ≡ %s', (left, right) => {
    expect(calculateLogic({ method: 'equivalence', left, right }).value).toBe('Equivalentes');
  });

  it.each([
    ['A → B; A', 'B'], ['A → B; ¬B', '¬A'], ['A → B; B → C', 'A → C'], ['A ∨ B; ¬A', 'B'],
    ['A → B\nB → C\nA', 'C'], ['A ∧ B', 'A'], ['A', 'A ∨ B'],
  ])('valida la inferencia desde %s', (premises, conclusion) => {
    const result = calculateLogic({ method: 'argument', premises, conclusion });
    expect(result.value).toBe('Argumento válido');
    expect(result.table!.rows.every((row) => row.at(-1) === 0)).toBe(true);
  });

  it.each([['A → B; B', 'A'], ['A → B; ¬A', '¬B']])('encuentra contraejemplos a una falacia', (premises, conclusion) => {
    const result = calculateLogic({ method: 'argument', premises, conclusion });
    expect(result.value).toBe('Argumento no válido');
    const row = result.table!.rows.find((values) => values.at(-1) === 1)!;
    expect(row.slice(2, 4)).toEqual([1, 1]);
    expect(row.at(-2)).toBe(0);
    expect(result.steps.at(-1)?.detail).toContain('A = 0');
  });

  it('distingue consistencia y validez por vacuidad', () => {
    expect(calculateLogic({ method: 'consistency', premises: 'A ∨ B; ¬A' }).value).toBe('Consistentes');
    expect(calculateLogic({ method: 'consistency', premises: 'A; ¬A' }).value).toBe('Inconsistentes');
    const result = calculateLogic({ method: 'argument', premises: 'A; ¬A', conclusion: 'B' });
    expect(result.value).toBe('Argumento válido');
    expect(result.steps.at(-1)?.detail).toContain('vacuidad');
  });

  it('valida el número de premisas y el límite compartido de variables', () => {
    expect(() => calculateLogic({ method: 'argument', premises: ' ; ', conclusion: 'A' })).toThrow('premisas');
    expect(() => calculateLogic({ method: 'consistency', premises: 'A; B; C; D; A' })).toThrow('premisas');
    expect(() => calculateLogic({ method: 'equivalence', left: 'A ∧ B ∧ C', right: 'D ∧ E' })).toThrow('cuatro variables');
    expect(() => truthTable('A ∧')).toThrow();
    expect(() => truthTable('A'.repeat(256))).toThrow('255');
  });
});

describe('predicados sobre dominios finitos', () => {
  const base = { method: 'predicate' as const, domain: '-2, -1, 0, 1, 2', expression: 'x^2', relation: '>' as const, target: 0 };
  it('distingue cuantificación universal y existencial y muestra testigos', () => {
    const result = calculateLogic(base);
    expect(result.value).toBe('∀x P(x): falso · ∃x P(x): verdadero');
    expect(result.table!.rows.map((row) => row[2])).toEqual([1, 1, 0, 1, 1]);
    expect(result.steps[2].detail).toContain('x = 0');
    expect(calculateLogic({ ...base, relation: '>=' }).value).toBe('∀x P(x): verdadero · ∃x P(x): verdadero');
    expect(calculateLogic({ ...base, target: 10 }).value).toBe('∀x P(x): falso · ∃x P(x): falso');
  });
  it('trata el dominio como conjunto y admite igualdad y desigualdad', () => {
    expect(calculateLogic({ ...base, domain: '1, 1, 2', relation: '=', target: 1 }).table!.rows).toEqual([[1, 1, 1], [2, 4, 0]]);
    expect(calculateLogic({ ...base, domain: '1, 2', relation: '!=', target: 1 }).table!.rows.at(-1)!.at(-1)).toBe(1);
  });
  it('rechaza dominios inválidos, funciones no definidas e instrucciones externas', () => {
    for (const domain of ['', 'NaN', '1, Infinity', '0x10', Array.from({ length: 17 }, (_, i) => i).join(',')]) {
      expect(() => calculateLogic({ ...base, domain })).toThrow();
    }
    expect(() => calculateLogic({ ...base, expression: '1/x' })).toThrow('no está definida');
    expect(() => calculateLogic({ ...base, expression: 'alert(x)' })).toThrow();
  });
});

describe('demostraciones y sumatorias por inducción', () => {
  it.each([
    ['naturales' as const, 10, 55, 10], ['impares' as const, 5, 25, 9], ['cuadrados' as const, 4, 30, 16],
  ])('desarrolla la serie %s', (series, n, sum, term) => {
    const result = calculateLogic({ method: 'induction', series, n });
    expect(result.table!.rows.at(-1)).toEqual([n, term, sum, sum]);
    expect(result.steps.map((step) => step.title)).toContain('Paso inductivo');
    expect(result.steps.find((step) => step.title === 'Conclusión por inducción')?.detail).toContain('todo entero');
  });
  it.each(['naturales', 'impares', 'cuadrados'] as const)('comprueba el caso base y las sumas hasta n = 1000: %s', (series) => {
    expect(calculateLogic({ method: 'induction', series, n: 1 }).table!.rows).toEqual([[1, 1, 1, 1]]);
    const rows = calculateLogic({ method: 'induction', series, n: 1000 }).table!.rows;
    expect(rows).toHaveLength(1000);
    expect(rows.every((row) => row[2] === row[3])).toBe(true);
  });
  it.each([0, -1, 1.5, 1001, NaN])('rechaza n = %s', (n) => {
    expect(() => calculateLogic({ method: 'induction', series: 'naturales', n })).toThrow('entero');
  });
});
