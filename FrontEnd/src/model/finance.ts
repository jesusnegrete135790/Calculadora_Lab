import type { CalculationResult, ChartData } from './types';
import { createSurface } from './surface';

export type FinanceMethod = 'simple' | 'compuesto' | 'valor-actual' | 'descuento-comercial' | 'descuento-racional' | 'descuento-serie' | 'tasa-equivalente' | 'amortizacion';

export interface FinanceInput {
  method: FinanceMethod;
  capital: number;
  annualRate: number;
  years: number;
  periods: number;
  extraPayment: number;
  secondaryRate?: number;
  targetPeriods?: number;
  rateChanges?: string;
  partialPayments?: string;
}

const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);
const timeline = (years: number, value: (time: number) => number, label: string): ChartData => {
  const count = Math.min(60, Math.max(12, Math.ceil(years * 12)));
  const times = Array.from({ length: count + 1 }, (_, index) => years * index / count);
  return { labels: times.map((time) => time.toFixed(2)), values: times.map(value), label, kind: 'line' };
};
const rateSensitivity = (years: number, annualRate: number, value: (time: number, ratePercent: number) => number) => {
  try {
    return createSurface(({ x, y }) => value(x, y), 0, years, 0, Math.max(annualRate * 1.5, 10), 21, 'Monto según años (x) y tasa anual % (y)');
  } catch { return undefined; }
};

export function calculateFinance(input: FinanceInput): CalculationResult {
  const { method, capital, annualRate, years, periods, extraPayment, secondaryRate = 0, targetPeriods = 12, rateChanges = '', partialPayments = '' } = input;
  if (![capital, annualRate, years, periods, extraPayment, secondaryRate, targetPeriods].every(Number.isFinite) || capital <= 0 || annualRate < 0 || years <= 0 || periods < 1 || !Number.isInteger(periods) || extraPayment < 0 || secondaryRate < 0 || targetPeriods < 1 || !Number.isInteger(targetPeriods)) {
    throw new Error('Revisa los datos: capital, plazo y periodos deben ser positivos; tasa y pago adicional no pueden ser negativos.');
  }
  const rate = annualRate / 100;
  const base = [{ title: 'Datos', detail: `Capital: ${money(capital)} · Tasa anual: ${annualRate}% · Tiempo: ${years} años.` }];
  if (method === 'simple') {
    const interest = capital * rate * years;
    const surface3d = rateSensitivity(years, annualRate, (time, percent) => capital * (1 + percent / 100 * time));
    return { title: 'Monto final', value: money(capital + interest), subtitle: `Interés generado: ${money(interest)}`, steps: [...base, { title: 'Interés simple', detail: `I = C × i × t = ${money(capital)} × ${rate} × ${years} = ${money(interest)}.` }, { title: 'Monto', detail: `M = C + I = ${money(capital + interest)}.` }], charts: [timeline(years, (time) => capital * (1 + rate * time), 'Monto en el tiempo'), timeline(years, (time) => capital * rate * time, 'Interés acumulado')], surface3d, note: surface3d ? 'La superficie 3D compara el monto para distintos plazos y tasas; las curvas 2D usan la tasa ingresada.' : undefined };
  }
  if (method === 'compuesto') {
    const n = Math.min(60, Math.max(1, Math.round(years * periods)));
    const amount = capital * (1 + rate / periods) ** (years * periods);
    const labels = Array.from({ length: n + 1 }, (_, i) => (years * i / n).toFixed(2));
    const values = labels.map((_, i) => capital * (1 + rate / periods) ** (years * periods * i / n));
    const surface3d = rateSensitivity(years, annualRate, (time, percent) => capital * (1 + percent / 100 / periods) ** (time * periods));
    return { title: 'Monto final', value: money(amount), subtitle: `Interés generado: ${money(amount - capital)}`, steps: [...base, { title: 'Tasa por periodo', detail: `iₚ = ${rate} / ${periods} = ${(rate / periods * 100).toFixed(4)}%.` }, { title: 'Capitalización', detail: `M = C(1 + iₚ)^n, con n = ${years} × ${periods} = ${years * periods}.` }], charts: [{ labels, values, label: 'Capitalización · años', kind: 'line' }, { labels, values: values.map((value) => value - capital), label: 'Interés acumulado · años', kind: 'line' }], surface3d, note: surface3d ? 'La superficie 3D compara el monto para distintos plazos y tasas; las curvas 2D usan la tasa ingresada.' : undefined };
  }
  if (method === 'valor-actual') {
    const present = capital / (1 + rate / periods) ** (years * periods);
    return { title: 'Valor actual', value: money(present), subtitle: `Descuento por capitalización: ${money(capital - present)}`, steps: [...base, { title: 'Tasa por periodo', detail: `iₚ = ${rate} / ${periods} = ${(rate / periods * 100).toFixed(4)}%.` }, { title: 'Valor actual', detail: `VA = M / (1 + iₚ)^(t × m) = ${money(present)}.` }], charts: [timeline(years, (time) => capital / (1 + rate / periods) ** (time * periods), 'Valor actual por plazo')] };
  }
  if (method === 'descuento-comercial') {
    const discount = capital * rate * years;
    return { title: 'Valor actual', value: money(capital - discount), subtitle: `Descuento comercial: ${money(discount)}`, steps: [...base, { title: 'Descuento', detail: `D = N × d × t = ${money(discount)}.` }, { title: 'Valor actual', detail: `VA = N − D = ${money(capital - discount)}.` }], charts: [timeline(years, (time) => capital * (1 - rate * time), 'Valor actual por plazo'), timeline(years, (time) => capital * rate * time, 'Descuento acumulado')], note: capital - discount < 0 ? 'El valor actual es negativo; revisa la tasa y el plazo.' : undefined };
  }
  if (method === 'descuento-racional') {
    const present = capital / (1 + rate * years);
    return { title: 'Valor actual', value: money(present), subtitle: `Descuento racional: ${money(capital - present)}`, steps: [...base, { title: 'Valor actual', detail: `VA = N / (1 + i × t) = ${money(present)}.` }, { title: 'Descuento', detail: `D = N − VA = ${money(capital - present)}.` }], charts: [timeline(years, (time) => capital / (1 + rate * time), 'Valor actual por plazo')] };
  }
  if (method === 'descuento-serie') {
    if (annualRate >= 100 || secondaryRate >= 100) throw new Error('Cada descuento sucesivo debe ser menor al 100%.');
    const first = capital * (1 - rate);
    const final = first * (1 - secondaryRate / 100);
    const equivalent = (1 - (1 - rate) * (1 - secondaryRate / 100)) * 100;
    return { title: 'Valor después de descuentos', value: money(final), subtitle: `Descuento equivalente: ${equivalent.toFixed(4)}%`, steps: [{ title: 'Primer descuento', detail: `${money(capital)} × (1 − ${annualRate}%) = ${money(first)}.` }, { title: 'Segundo descuento', detail: `${money(first)} × (1 − ${secondaryRate}%) = ${money(final)}.` }, { title: 'Tasa única equivalente', detail: `dₑ = 1 − (1 − d₁)(1 − d₂) = ${equivalent.toFixed(4)}%.` }], charts: [{ labels: ['Nominal', 'Primer descuento', 'Segundo descuento'], values: [capital, first, final], label: 'Valor tras cada descuento', kind: 'bar' }], note: 'En descuento en serie, cada porcentaje se aplica al saldo anterior; el plazo no interviene.' };
  }
  if (method === 'tasa-equivalente') {
    const effectiveAnnual = (1 + rate / periods) ** periods - 1;
    const targetRate = (1 + effectiveAnnual) ** (1 / targetPeriods) - 1;
    return { title: `Tasa por periodo (${targetPeriods}/año)`, value: `${(targetRate * 100).toFixed(6)}%`, subtitle: `Tasa efectiva anual: ${(effectiveAnnual * 100).toFixed(6)}%`, steps: [{ title: 'Tasa nominal de origen', detail: `${annualRate}% anual con ${periods} capitalizaciones por año.` }, { title: 'Tasa efectiva anual', detail: `TEA = (1 + j/${periods})^${periods} − 1 = ${(effectiveAnnual * 100).toFixed(6)}%.` }, { title: 'Tasa equivalente de destino', detail: `i = (1 + TEA)^(1/${targetPeriods}) − 1 = ${(targetRate * 100).toFixed(6)}%.` }], charts: [{ labels: Array.from({ length: 12 }, (_, i) => String(i + 1)), values: Array.from({ length: 12 }, (_, i) => ((1 + rate / (i + 1)) ** (i + 1) - 1) * 100), label: 'Tasa efectiva anual según capitalizaciones', kind: 'line' }], note: 'El capital y el plazo no intervienen en una conversión de tasas.' };
  }
  const n = Math.round(years * periods);
  if (n < 1 || n > 600) throw new Error('La amortización admite entre 1 y 600 pagos.');
  const changes = new Map<number, number>();
  for (const entry of rateChanges.split(/[,;\n]+/).map((part) => part.trim()).filter(Boolean)) {
    const match = /^(\d+)\s*:\s*(\d+(?:\.\d+)?)$/.exec(entry);
    if (!match) throw new Error('Escribe cambios de tasa como periodo:tasa; por ejemplo, 7:15.');
    const period = Number(match[1]), newRate = Number(match[2]);
    if (period < 1 || period > n || newRate > 100) throw new Error('Cada cambio debe usar un periodo válido y una tasa entre 0 y 100%.');
    changes.set(period, newRate / 100);
  }
  const payments = new Map<number, number>();
  for (const entry of partialPayments.split(/[,;\n]+/).map((part) => part.trim()).filter(Boolean)) {
    const match = /^(\d+)\s*:\s*(\d+(?:\.\d{1,2})?)$/.exec(entry);
    if (!match) throw new Error('Escribe abonos por periodo como periodo:monto; por ejemplo, 7:500.');
    const period = Number(match[1]), amount = Number(match[2]);
    if (period < 1 || period > n || !Number.isFinite(amount) || amount <= 0) throw new Error('Cada abono necesita un periodo válido y un monto positivo.');
    payments.set(period, (payments.get(period) ?? 0) + amount);
  }
  const initialPeriodicRate = rate / periods;
  const initialPayment = initialPeriodicRate === 0 ? capital / n : capital * initialPeriodicRate / (1 - (1 + initialPeriodicRate) ** -n);
  let balance = capital;
  let activeRate = rate;
  const rows: Array<Array<string | number>> = [];
  for (let period = 1; period <= n && balance > 0.005; period++) {
    if (changes.has(period)) activeRate = changes.get(period)!;
    const periodicRate = activeRate / periods;
    const remaining = n - period + 1;
    const payment = periodicRate === 0 ? balance / remaining : balance * periodicRate / (1 - (1 + periodicRate) ** -remaining);
    const initial = balance;
    const interest = balance * periodicRate;
    const actual = Math.min(balance + interest, payment + extraPayment + (payments.get(period) ?? 0));
    const principal = actual - interest;
    balance = Math.max(0, balance - principal);
    rows.push([period, `${(activeRate * 100).toFixed(2)}%`, money(initial), money(interest), money(principal), money(actual), money(balance)]);
  }
  const total = rows.reduce((sum, row) => sum + Number(String(row[5]).replace(/[^\d.-]/g, '')), 0);
  const labels = rows.map((row) => String(row[0]));
  const asNumber = (value: string | number) => Number(String(value).replace(/[^\d.-]/g, ''));
  return { title: 'Cuota inicial', value: money(initialPayment), subtitle: `${rows.length} pagos · Pago adicional: ${money(extraPayment)}`, steps: [...base, { title: 'Tasa periódica inicial', detail: `iₚ = ${rate} / ${periods} = ${(initialPeriodicRate * 100).toFixed(4)}%.` }, { title: 'Cuota recalculada', detail: 'En cada periodo se calcula P = saldo × iₚ / (1 − (1 + iₚ)^−plazos restantes). Cuando la tasa cambia, se recalcula la cuota para el saldo restante.' }, { title: 'Abonos adicionales', detail: `Se aplica ${money(extraPayment)} recurrente por periodo${payments.size ? ` y abonos programados en los periodos ${[...payments.keys()].join(', ')}` : ''}. Total aproximado pagado: ${money(total)}.` }], table: { columns: ['Periodo', 'Tasa anual', 'Saldo inicial', 'Interés', 'Abono capital', 'Pago', 'Saldo final'], rows }, charts: [{ labels, values: rows.map((row) => asNumber(row[6])), label: 'Saldo pendiente por periodo', kind: 'line' }, { labels, values: rows.map((row) => asNumber(row[3])), label: 'Interés por periodo', kind: 'line' }, { labels, values: rows.map((row) => asNumber(row[4])), label: 'Abono a capital por periodo', kind: 'line' }] };
}
