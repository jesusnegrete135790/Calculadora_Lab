import { compileExpression } from './expression';
import type { CalculationResult } from './types';

export type NumericMethod = 'biseccion' | 'newton' | 'lagrange' | 'newton-interpolacion' | 'euler' | 'euler-mejorado' | 'runge-kutta';
export interface NumericInput {
  method: NumericMethod;
  expression: string;
  a: number;
  b: number;
  x0: number;
  y0: number;
  tolerance: number;
  iterations: number;
  points: string;
}
const fmt = (n: number) => Number(n.toPrecision(8));

function parsePoints(source: string): Array<[number, number]> {
  const points = source.split(/[;\n]+/).filter(Boolean).map((entry) => {
    const parts = entry.trim().split(/[,\s]+/).map(Number);
    if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) throw new Error('Escribe los puntos como x,y; x,y; ...');
    return parts as [number, number];
  });
  if (points.length < 2 || points.length > 12) throw new Error('Ingresa entre 2 y 12 puntos.');
  if (new Set(points.map(([x]) => x)).size !== points.length) throw new Error('Los valores de x no pueden repetirse.');
  return points;
}

export function calculateNumeric(input: NumericInput): CalculationResult {
  const { method, expression, a, b, x0, y0, tolerance, iterations, points: pointsText } = input;
  if (!Number.isFinite(x0) || !Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(y0)) throw new Error('Los parámetros deben ser números finitos.');
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 200) throw new Error('Usa entre 1 y 200 iteraciones.');
  if (tolerance <= 0 || !Number.isFinite(tolerance)) throw new Error('La tolerancia debe ser mayor que cero.');

  if (method === 'lagrange' || method === 'newton-interpolacion') {
    const points = parsePoints(pointsText);
    const rows: Array<Array<string | number>> = [];
    if (method === 'lagrange') {
      const terms = points.map(([xi, yi], i) => {
        const basis = points.reduce((product, [xj], j) => j === i ? product : product * (x0 - xj) / (xi - xj), 1);
        rows.push([i, fmt(xi), fmt(yi), fmt(basis), fmt(yi * basis)]);
        return yi * basis;
      });
      const value = terms.reduce((sum, term) => sum + term, 0);
      return { title: `P(${fmt(x0)})`, value: String(fmt(value)), subtitle: 'Interpolación de Lagrange', steps: [{ title: 'Base de Lagrange', detail: 'Lᵢ(x) = ∏(x − xⱼ)/(xᵢ − xⱼ) para j ≠ i.' }, { title: 'Polinomio evaluado', detail: `P(${fmt(x0)}) = Σ yᵢLᵢ(${fmt(x0)}) = ${fmt(value)}.` }], table: { columns: ['i', 'xᵢ', 'yᵢ', `Lᵢ(${fmt(x0)})`, 'Aporte'], rows } };
    }
    const divided = points.map(([, y]) => y);
    const coefficients = [divided[0]];
    for (let order = 1; order < points.length; order++) {
      for (let i = 0; i < points.length - order; i++) divided[i] = (divided[i + 1] - divided[i]) / (points[i + order][0] - points[i][0]);
      coefficients.push(divided[0]);
    }
    let value = coefficients[0];
    let product = 1;
    coefficients.forEach((coefficient, index) => {
      if (index > 0) { product *= x0 - points[index - 1][0]; value += coefficient * product; }
      rows.push([index, fmt(coefficient), fmt(product), fmt(coefficient * product)]);
    });
    return { title: `P(${fmt(x0)})`, value: String(fmt(value)), subtitle: 'Interpolación de Newton', steps: [{ title: 'Diferencias divididas', detail: 'Se calculan los coeficientes f[x₀,…,xᵢ].' }, { title: 'Evaluación', detail: `P(${fmt(x0)}) = ${fmt(value)}.` }], table: { columns: ['Orden', 'Coeficiente', 'Producto', 'Aporte'], rows } };
  }

  if (method === 'euler' || method === 'euler-mejorado' || method === 'runge-kutta') {
    if (b <= a) throw new Error('El extremo final debe ser mayor que el inicial.');
    const f = compileExpression(expression, ['x', 'y']);
    const h = (b - a) / iterations;
    let x = a;
    let y = y0;
    const rows: Array<Array<string | number>> = [[0, fmt(x), fmt(y), '—']];
    for (let i = 1; i <= iterations; i++) {
      const slope = f({ x, y });
      if (method === 'euler') y += h * slope;
      else if (method === 'euler-mejorado') {
        const predictor = y + h * slope;
        y += h * (slope + f({ x: x + h, y: predictor })) / 2;
      } else {
        const k1 = slope;
        const k2 = f({ x: x + h / 2, y: y + h * k1 / 2 });
        const k3 = f({ x: x + h / 2, y: y + h * k2 / 2 });
        const k4 = f({ x: x + h, y: y + h * k3 });
        y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
      }
      x = a + i * h;
      if (!Number.isFinite(y)) throw new Error('El método produjo un valor no finito. Revisa función, intervalo y pasos.');
      rows.push([i, fmt(x), fmt(y), fmt(slope)]);
    }
    const name = { euler: 'Euler', 'euler-mejorado': 'Euler mejorado', 'runge-kutta': 'Runge–Kutta de orden 4' }[method];
    return { title: `y(${fmt(b)}) aproximado`, value: String(fmt(y)), subtitle: name, steps: [{ title: 'Modelo', detail: `y′ = ${expression}, y(${a}) = ${y0}.` }, { title: 'Paso', detail: `h = (${b} − ${a}) / ${iterations} = ${fmt(h)}.` }, { title: 'Método', detail: method === 'euler' ? 'yₙ₊₁ = yₙ + h·f(xₙ,yₙ).' : method === 'euler-mejorado' ? 'Se promedian las pendientes inicial y predictora.' : 'Se ponderan k₁, k₂, k₃ y k₄ en cada paso.' }], table: { columns: ['Paso', 'x', 'y', 'Pendiente inicial'], rows }, chart: { labels: rows.map((row) => String(row[1])), values: rows.map((row) => Number(row[2])), label: 'Solución aproximada' } };
  }

  const f = compileExpression(expression);
  const rows: Array<Array<string | number>> = [];
  if (method === 'biseccion') {
    if (b <= a) throw new Error('El extremo final debe ser mayor que el inicial.');
    let left = a; let right = b;
    let fl = f({ x: left });
    const fr = f({ x: right });
    if (Math.abs(fl) <= tolerance) return { title: 'Raíz exacta en a', value: String(fmt(left)), steps: [{ title: 'Verificación', detail: `|f(${left})| = ${fmt(Math.abs(fl))} ≤ ${tolerance}.` }] };
    if (Math.abs(fr) <= tolerance) return { title: 'Raíz exacta en b', value: String(fmt(right)), steps: [{ title: 'Verificación', detail: `|f(${right})| = ${fmt(Math.abs(fr))} ≤ ${tolerance}.` }] };
    if (fl * fr > 0) throw new Error('f(a) y f(b) deben tener signos opuestos.');
    let middle = left;
    for (let i = 1; i <= iterations; i++) {
      middle = (left + right) / 2;
      const fm = f({ x: middle });
      rows.push([i, fmt(left), fmt(right), fmt(middle), fmt(fm), fmt((right - left) / 2)]);
      if (Math.abs(fm) <= tolerance || (right - left) / 2 <= tolerance) break;
      if (fl * fm <= 0) right = middle;
      else { left = middle; fl = fm; }
    }
    return { title: 'Raíz aproximada', value: String(fmt(middle)), subtitle: `${rows.length} iteraciones · Bisección`, steps: [{ title: 'Intervalo inicial', detail: `[${a}, ${b}], con f(a)·f(b) ≤ 0.` }, { title: 'Reducción', detail: 'En cada paso se conserva la mitad del intervalo que contiene el cambio de signo.' }, { title: 'Criterio', detail: `Se detiene cuando |f(c)| o la mitad del intervalo es ≤ ${tolerance}, o al llegar al máximo.` }], table: { columns: ['n', 'a', 'b', 'c', 'f(c)', 'Error máx.'], rows } };
  }
  let x = x0;
  for (let i = 1; i <= iterations; i++) {
    const fx = f({ x });
    const h = Math.max(1e-6, Math.abs(x) * 1e-6);
    const derivative = (f({ x: x + h }) - f({ x: x - h })) / (2 * h);
    if (Math.abs(derivative) < 1e-12) throw new Error('La derivada numérica es casi cero; prueba otro valor inicial.');
    const next = x - fx / derivative;
    if (!Number.isFinite(next)) throw new Error('La iteración produjo un valor no finito.');
    rows.push([i, fmt(x), fmt(fx), fmt(derivative), fmt(next), fmt(Math.abs(next - x))]);
    if (Math.abs(next - x) <= tolerance || Math.abs(fx) <= tolerance) { x = next; break; }
    x = next;
  }
  return { title: 'Raíz aproximada', value: String(fmt(x)), subtitle: `${rows.length} iteraciones · Newton–Raphson`, steps: [{ title: 'Valor inicial', detail: `x₀ = ${x0}.` }, { title: 'Derivada', detail: 'f′(x) se aproxima mediante diferencia central.' }, { title: 'Iteración', detail: 'xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ).' }], table: { columns: ['n', 'xₙ', 'f(xₙ)', 'f′(xₙ)', 'xₙ₊₁', 'Cambio'], rows } };
}
