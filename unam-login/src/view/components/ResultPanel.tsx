import { Download, Info, ListOrdered, RotateCcw } from 'lucide-react';
import type { CalculationResult } from '../../model/types';

function downloadCsv(result: CalculationResult) {
  if (!result.table) return;
  const lines = [result.table.columns, ...result.table.rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'resultado-laboratorio.csv'; anchor.click();
  URL.revokeObjectURL(url);
}

function MiniChart({ labels, values, label, shadeThroughIndex }: { labels: string[]; values: number[]; label: string; shadeThroughIndex?: number }) {
  if (values.length < 2) return null;
  const width = 700, height = 210, padding = 32;
  const low = Math.min(0, ...values), high = Math.max(...values);
  const range = high - low || 1;
  const points = values.map((value, index) => `${padding + index / (values.length - 1) * (width - padding * 2)},${height - padding - (value - low) / range * (height - padding * 2)}`).join(' ');
  const shaded = shadeThroughIndex === undefined || shadeThroughIndex < 0 ? '' : `${padding},${height - padding} ${values.slice(0, shadeThroughIndex + 1).map((value, index) => `${padding + index / (values.length - 1) * (width - padding * 2)},${height - padding - (value - low) / range * (height - padding * 2)}`).join(' ')} ${padding + shadeThroughIndex / (values.length - 1) * (width - padding * 2)},${height - padding}`;
  const bars = values.length <= 30;
  return <div className="chart-box" role="img" aria-label={`Gráfica de ${label}; valores desde ${labels[0]} hasta ${labels.at(-1)}${shadeThroughIndex !== undefined ? ', con área acumulada sombreada' : ''}`}><div className="chart-heading"><strong>{label}</strong><span>{labels[0]} — {labels.at(-1)}</span></div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true"><line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis"/>{bars ? values.map((value, index) => { const x = padding + index / (values.length - 1) * (width - padding * 2); const y = height - padding - (value - low) / range * (height - padding * 2); return <rect key={index} x={x - Math.min(10, 230 / values.length)} y={y} width={Math.min(20, 460 / values.length)} height={height - padding - y} rx="3" className="chart-bar"/>; }) : <>{shaded && <polygon points={shaded} className="chart-shaded"/>}<polyline points={points} className="chart-line"/></>}</svg><div className="chart-scale"><span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels.at(-1)}</span></div></div>;
}

function LogicVisuals({ result }: { result: CalculationResult }) {
  if (!result.logicMap) return null;
  const { rowLabels, columnLabels, cells } = result.logicMap;
  return <div className="logic-visuals"><div><h3>Mapa de Karnaugh</h3><div className="kmap" style={{ gridTemplateColumns: `44px repeat(${columnLabels.length}, minmax(44px, 1fr))` }}><div className="kmap-label">↓ / →</div>{columnLabels.map((label) => <div className="kmap-label" key={label}>{label}</div>)}{rowLabels.map((row, rowIndex) => <div className="kmap-row" key={row} style={{ gridColumn: `1 / span ${columnLabels.length + 1}`, gridTemplateColumns: `44px repeat(${columnLabels.length}, minmax(44px, 1fr))` }}><div className="kmap-label">{row || '—'}</div>{columnLabels.map((column, columnIndex) => { const cell = cells[rowIndex * columnLabels.length + columnIndex]; return <div className={`kmap-cell${cell.value ? ' true' : ''}`} key={column} title={`Mintermino ${cell.minterm}`}><strong>{cell.value}</strong><span>m{cell.minterm}</span><i>{cell.groups.map((group) => <b className={`group-dot group-${group % 4}`} key={group}/>)}</i></div>; })}</div>)}</div><p className="visual-caption">Las marcas de color indican los grupos usados en la simplificación.</p></div><div><h3>Esquema de compuertas</h3><div className="circuit-diagram">{result.circuitTerms?.length ? <><div className="circuit-terms">{result.circuitTerms.map((term, index) => <div className="circuit-term" key={index}><span className="circuit-inputs">{term.map((literal) => <span className="circuit-literal" key={literal}><span>{literal.replace('¬', '')}</span>{literal.startsWith('¬') && <span className="not-gate">NOT</span>}</span>)}</span><span className="gate-symbol">{term.length > 1 ? 'AND' : 'BUF'}</span></div>)}</div><span className="circuit-connector"/><span className="gate-symbol or-gate">{result.circuitTerms.length > 1 ? 'OR' : 'OUT'}</span><span className="circuit-output">F</span></> : <div className="circuit-constant">Salida constante: {result.value.startsWith('1') ? '1' : '0'}</div>}</div><p className="visual-caption">Los literales negados pasan por NOT; los productos se unen en OR.</p></div></div>;
}

export default function ResultPanel({ result, error, reset }: { result: CalculationResult | null; error: string; reset?: () => void }) {
  if (error) return <div className="error-box" role="alert"><Info size={20}/><span>{error}</span></div>;
  if (!result) return <div className="empty-result"><div className="empty-result-icon"><ListOrdered size={26}/></div><h3>Tu resultado aparecerá aquí</h3><p>Completa los datos del formulario y ejecuta la herramienta para ver el procedimiento.</p></div>;
  return <section className="result-panel" aria-live="polite"><div className="result-top"><div><span className="eyebrow">RESULTADO</span><h2>{result.title}</h2><div className="result-value">{result.value}</div>{result.subtitle && <p className="result-subtitle">{result.subtitle}</p>}</div>{reset && <button className="icon-button reset-button" aria-label="Limpiar resultado" title="Limpiar resultado" onClick={reset}><RotateCcw size={18}/></button>}</div><div className="result-body"><h3>Procedimiento</h3><ol className="steps-list">{result.steps.map((step, index) => <li key={`${step.title}-${index}`}><span className="step-number">{index + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div></li>)}</ol><LogicVisuals result={result}/>{result.chart && <MiniChart {...result.chart}/ >}{result.table && <div className="table-section"><div className="table-heading"><h3>Tabla de resultados</h3><button className="text-button" onClick={() => downloadCsv(result)}><Download size={16}/> Descargar CSV</button></div><div className="table-scroll"><table><thead><tr>{result.table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{result.table.rows.map((row, index) => <tr key={index}>{row.map((cell, at) => <td key={at}>{cell}</td>)}</tr>)}</tbody></table></div></div>}{result.note && <p className="result-note"><Info size={17}/>{result.note}</p>}</div></section>;
}
