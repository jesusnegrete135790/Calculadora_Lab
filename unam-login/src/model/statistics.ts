import type { CalculationResult } from './types';

export type StatisticsMethod = 'descriptiva' | 'binomial' | 'poisson' | 'normal';
export interface StatisticsInput { method: StatisticsMethod; data: string; n: number; k: number; p: number; lambda: number; mean: number; deviation: number; x: number; }
const fmt = (value: number) => Number(value.toPrecision(7));

function logFactorial(n: number): number { let value = 0; for (let i = 2; i <= n; i++) value += Math.log(i); return value; }
function combination(n: number, k: number): number { let value = 1; for (let i = 1; i <= k; i++) value = value * (n - i + 1) / i; return value; }
function erf(x: number): number {
  const sign = Math.sign(x); const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  return sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z));
}

export function calculateStatistics(input: StatisticsInput): CalculationResult {
  const { method, data, n, k, p, lambda, mean, deviation, x } = input;
  if (method === 'descriptiva') {
    const values = data.split(/[\s,;]+/).filter(Boolean).map(Number);
    if (!values.length || values.length > 1000 || values.some((value) => !Number.isFinite(value))) throw new Error('Ingresa entre 1 y 1000 números separados por comas o espacios.');
    const sorted = [...values].sort((a, b) => a - b);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
    const sigma = Math.sqrt(variance);
    const skew = sigma ? values.reduce((sum, value) => sum + ((value - average) / sigma) ** 3, 0) / values.length : 0;
    const kurtosis = sigma ? values.reduce((sum, value) => sum + ((value - average) / sigma) ** 4, 0) / values.length - 3 : 0;
    const counts = new Map<number, number>();
    sorted.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    const maxCount = Math.max(...counts.values());
    const modes = [...counts].filter(([, count]) => count === maxCount).map(([value]) => value);
    const table = [...counts].map(([value, count]) => [value, count, fmt(count / values.length), fmt([...counts].filter(([v]) => v <= value).reduce((sum, [, c]) => sum + c, 0) / values.length)]);
    return { title: 'Media', value: String(fmt(average)), subtitle: `${values.length} datos · Mediana ${fmt(median)}`, steps: [{ title: 'Tendencia central', detail: `Media = Σx/n = ${fmt(average)}; mediana = ${fmt(median)}; moda = ${modes.length === counts.size ? 'sin moda única' : modes.join(', ')}.` }, { title: 'Dispersión', detail: `Varianza poblacional = ${fmt(variance)}; desviación estándar = ${fmt(sigma)}.` }, { title: 'Forma', detail: `Asimetría = ${fmt(skew)}; exceso de curtosis = ${fmt(kurtosis)}.` }], table: { columns: ['Valor', 'Frecuencia', 'Relativa', 'Acumulada'], rows: table }, chart: counts.size <= 30 ? { labels: [...counts.keys()].map(String), values: [...counts.values()], label: 'Frecuencia' } : undefined, note: counts.size > 30 ? 'La gráfica se omite cuando hay más de 30 valores distintos.' : undefined };
  }
  if (method === 'binomial') {
    if (!Number.isInteger(n) || n < 0 || n > 170 || !Number.isInteger(k) || k < 0 || k > n || p < 0 || p > 1) throw new Error('Usa n entero entre 0 y 170, k entre 0 y n, y p entre 0 y 1.');
    const probability = combination(n, k) * p ** k * (1 - p) ** (n - k);
    const chart = n <= 30 ? Array.from({ length: n + 1 }, (_, i) => combination(n, i) * p ** i * (1 - p) ** (n - i)) : undefined;
    return { title: `P(X = ${k})`, value: fmt(probability).toString(), subtitle: `${fmt(probability * 100)}%`, steps: [{ title: 'Modelo', detail: `X ~ Binomial(n=${n}, p=${p}).` }, { title: 'Fórmula', detail: `P(X=k) = C(n,k) · p^k · (1−p)^(n−k).` }, { title: 'Sustitución', detail: `C(${n},${k}) × ${p}^${k} × ${1 - p}^${n - k} = ${fmt(probability)}.` }], chart: chart ? { labels: chart.map((_, i) => String(i)), values: chart, label: 'P(X=k)' } : undefined };
  }
  if (method === 'poisson') {
    if (!Number.isInteger(k) || k < 0 || k > 170 || lambda < 0 || lambda > 100 || !Number.isFinite(lambda)) throw new Error('Usa k entero entre 0 y 170 y λ entre 0 y 100.');
    const poisson = (events: number) => lambda === 0 ? Number(events === 0) : Math.exp(-lambda + events * Math.log(lambda) - logFactorial(events));
    const probability = poisson(k);
    const last = Math.min(30, Math.max(k + 4, Math.ceil(lambda + 4 * Math.sqrt(lambda))));
    const chart = Array.from({ length: last + 1 }, (_, i) => poisson(i));
    return { title: `P(X = ${k})`, value: fmt(probability).toString(), subtitle: `${fmt(probability * 100)}%`, steps: [{ title: 'Modelo', detail: `X ~ Poisson(λ=${lambda}).` }, { title: 'Fórmula', detail: `P(X=k) = e^(−λ) λ^k / k!.` }, { title: 'Sustitución', detail: `e^(−${lambda}) × ${lambda}^${k} / ${k}! = ${fmt(probability)}.` }], chart: { labels: chart.map((_, i) => String(i)), values: chart, label: 'P(X=k)' } };
  }
  if (!Number.isFinite(mean) || !Number.isFinite(deviation) || !Number.isFinite(x) || deviation <= 0) throw new Error('La media y x deben ser finitas; la desviación debe ser positiva.');
  const z = (x - mean) / deviation;
  const probability = (1 + erf(z / Math.SQRT2)) / 2;
  const labels = Array.from({ length: 41 }, (_, i) => fmt(mean + (i - 20) * deviation / 5));
  const density = labels.map((point) => Math.exp(-0.5 * ((point - mean) / deviation) ** 2) / (deviation * Math.sqrt(2 * Math.PI)));
  return { title: `P(X ≤ ${x})`, value: fmt(probability).toString(), subtitle: `${fmt(probability * 100)}% · z = ${fmt(z)}`, steps: [{ title: 'Estandarización', detail: `z = (x − μ)/σ = (${x} − ${mean})/${deviation} = ${fmt(z)}.` }, { title: 'Área bajo la curva', detail: `P(X ≤ ${x}) = Φ(${fmt(z)}) ≈ ${fmt(probability)}.` }], chart: { labels: labels.map(String), values: density, label: 'Densidad normal', shadeThroughIndex: labels.reduce((last, point, index) => point <= x ? index : last, -1) }, note: 'La zona sombreada aproxima el área acumulada a la izquierda de x.' };
}
