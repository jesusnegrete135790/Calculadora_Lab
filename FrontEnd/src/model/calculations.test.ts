import { describe, expect, it } from 'vitest';
import { truthTable } from './logic';
import { calculateFinance } from './finance';
import { calculateNumeric, type NumericInput } from './numeric';
import { calculateStatistics, type StatisticsInput } from './statistics';
import { compileExpression } from './expression';
import { createSurface } from './surface';

describe('lógica matemática', () => {
  it('evalúa condicionales y simplifica cuatro o menos variables', () => {
    const result = truthTable('(A ∧ B) → C');
    expect(result.table?.rows).toHaveLength(8);
    expect(result.table?.rows.filter((row) => row.at(-1) === 1)).toHaveLength(7);
    expect(result.value).toContain('C');
    expect(result.circuitTerms?.length).toBeGreaterThan(0);
  });
  it('rechaza sintaxis ajena al lenguaje lógico', () => {
    expect(() => truthTable('A && alert(1)')).toThrow();
  });
});

describe('matemáticas financieras', () => {
  it('calcula interés simple y amortización sin interés', () => {
    expect(calculateFinance({ method: 'simple', capital: 1000, annualRate: 10, years: 2, periods: 12, extraPayment: 0 }).value).toContain('1,200');
    const amortization = calculateFinance({ method: 'amortizacion', capital: 1200, annualRate: 0, years: 1, periods: 12, extraPayment: 0 });
    expect(amortization.table?.rows).toHaveLength(12);
    expect(amortization.table?.rows.at(-1)?.at(-1)).toContain('0.00');
  });
  it('calcula descuentos sucesivos, tasas equivalentes y cambios de tasa', () => {
    const base = { capital: 1000, annualRate: 10, years: 1, periods: 12, extraPayment: 0 };
    expect(calculateFinance({ ...base, method: 'descuento-serie', secondaryRate: 20 }).value).toContain('720.00');
    expect(Number(calculateFinance({ ...base, method: 'tasa-equivalente', targetPeriods: 12 }).value.replace('%', ''))).toBeCloseTo(10 / 12, 5);
    const schedule = calculateFinance({ ...base, method: 'amortizacion', rateChanges: '7:20' });
    expect(schedule.table?.rows[5][1]).toBe('10.00%');
    expect(schedule.table?.rows[6][1]).toBe('20.00%');
  });
  it('aplica un abono extraordinario solo en el periodo indicado', () => {
    const base = { method: 'amortizacion' as const, capital: 1200, annualRate: 0, years: 1, periods: 12, extraPayment: 0 };
    const ordinary = calculateFinance(base);
    const withPayment = calculateFinance({ ...base, partialPayments: '2:300' });
    expect(withPayment.table?.rows).toHaveLength(12);
    expect(withPayment.table?.rows[0][5]).toBe(ordinary.table?.rows[0][5]);
    expect(withPayment.table?.rows[1][5]).toContain('400.00');
    expect(() => calculateFinance({ ...base, partialPayments: '13:300' })).toThrow();
  });
  it('ofrece curvas y una superficie de sensibilidad para interés compuesto', () => {
    const result = calculateFinance({ method: 'compuesto', capital: 1000, annualRate: 12, years: 2, periods: 12, extraPayment: 0 });
    expect(result.charts).toHaveLength(2);
    expect(result.surface3d?.z[0][0]).toBe(1000);
    expect(result.surface3d?.z.at(-1)?.at(-1)).toBeGreaterThan(1000);
  });
});

const numericBase: NumericInput = { method: 'biseccion', expression: 'x^2-2', a: 1, b: 2, x0: 1.5, y0: 1, tolerance: 1e-8, iterations: 50, points: '0,1;1,3;2,7' };
describe('matemáticas computacionales', () => {
  it('analiza funciones sin ejecutar código externo', () => {
    expect(compileExpression('sin(pi/2)+x^2')({ x: 2 })).toBeCloseTo(5);
    expect(() => compileExpression('window.alert(1)')).toThrow();
  });
  it('aproxima raíces e interpola', () => {
    expect(Number(calculateNumeric(numericBase).value)).toBeCloseTo(Math.SQRT2, 6);
    expect(Number(calculateNumeric({ ...numericBase, method: 'newton' }).value)).toBeCloseTo(Math.SQRT2, 6);
    expect(Number(calculateNumeric({ ...numericBase, method: 'lagrange', x0: 1.5 }).value)).toBeCloseTo(4.75, 6);
  });
  it('resuelve una EDO con Runge-Kutta', () => {
    const result = calculateNumeric({ ...numericBase, method: 'runge-kutta', expression: 'y', a: 0, b: 1, y0: 1, iterations: 10 });
    expect(Number(result.value)).toBeCloseTo(Math.E, 4);
  });
  it('calcula una superficie de dos variables y valida su dominio', () => {
    const result = calculateNumeric({ ...numericBase, method: 'superficie-3d', expression: 'x+y', a: -1, b: 1, yMin: -1, yMax: 1 });
    expect(result.surface3d?.z).toHaveLength(25);
    expect(result.surface3d?.z[12][12]).toBeCloseTo(0);
    expect(() => createSurface(({ x, y }) => x + y, 1, -1, -1, 1)).toThrow();
  });
});

const statisticsBase: StatisticsInput = { method: 'descriptiva', data: '1,2,3', n: 10, k: 3, p: 0.4, lambda: 4, mean: 100, deviation: 15, x: 100 };
describe('probabilidad y estadística', () => {
  it('calcula medidas descriptivas y probabilidades', () => {
    expect(Number(calculateStatistics(statisticsBase).value)).toBe(2);
    const frequencyTable = calculateStatistics(statisticsBase).table;
    expect(frequencyTable?.columns).toContain('Frecuencia acumulada');
    expect(frequencyTable?.rows.at(-1)?.at(-1)).toBe(3);
    expect(Number(calculateStatistics({ ...statisticsBase, method: 'binomial' }).value)).toBeCloseTo(0.21499, 4);
    expect(Number(calculateStatistics({ ...statisticsBase, method: 'poisson' }).value)).toBeCloseTo(0.19537, 4);
    expect(Number(calculateStatistics({ ...statisticsBase, method: 'normal' }).value)).toBeCloseTo(0.5, 5);
  });
});
