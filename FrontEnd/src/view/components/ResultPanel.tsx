import { lazy, Suspense } from 'react';
import { Download, Info, ListOrdered, Printer, RotateCcw } from 'lucide-react';
import type { CalculationResult } from '../../model/types';
import CircuitDiagram from './CircuitDiagram';

const EChart2D = lazy(() => import('./EChart2D'));
const SurfaceChart3D = lazy(() => import('./SurfaceChart3D'));

function downloadCsv(result: CalculationResult) {
  if (!result.table) return;
  const lines = [result.table.columns, ...result.table.rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'resultado-laboratorio.csv'; anchor.click();
  URL.revokeObjectURL(url);
}

function LogicVisuals({ result }: { result: CalculationResult }) {
  if (!result.logicMap) return null;
  const { rowLabels, columnLabels, cells } = result.logicMap;
  return <div className="logic-visuals">
    <div><h3>Mapa de Karnaugh</h3><div className="kmap" style={{ gridTemplateColumns: `44px repeat(${columnLabels.length}, minmax(44px, 1fr))` }}>
      <div className="kmap-label">↓ / →</div>{columnLabels.map((label) => <div className="kmap-label" key={label}>{label}</div>)}
      {rowLabels.map((row, rowIndex) => <div className="kmap-row" key={row} style={{ gridColumn: `1 / span ${columnLabels.length + 1}`, gridTemplateColumns: `44px repeat(${columnLabels.length}, minmax(44px, 1fr))` }}>
        <div className="kmap-label">{row || '—'}</div>
        {columnLabels.map((column, columnIndex) => { const cell = cells[rowIndex * columnLabels.length + columnIndex]; return <div className={`kmap-cell${cell.value ? ' true' : ''}`} key={column} title={`Mintermino ${cell.minterm}`}><strong>{cell.value}</strong><span>m{cell.minterm}</span><i>{cell.groups.map((group) => <b className={`group-dot group-${group % 4}`} key={group}/>)}</i></div>; })}
      </div>)}
    </div><p className="visual-caption">Las marcas de color indican los grupos usados en la simplificación.</p></div>
    <div><h3>Circuito lógico simplificado</h3><CircuitDiagram terms={result.circuitTerms ?? []} constant={result.value}/><p className="visual-caption">Cada literal negado pasa por NOT; los productos se combinan con OR.</p></div>
  </div>;
}

export default function ResultPanel({ result, error, reset }: { result: CalculationResult | null; error: string; reset?: () => void }) {
  if (error) return <div className="error-box" role="alert"><Info size={20}/><span>{error}</span></div>;
  if (!result) return <div className="empty-result"><div className="empty-result-icon"><ListOrdered size={26}/></div><h3>Tu resultado aparecerá aquí</h3><p>Completa los datos del formulario y ejecuta la herramienta para ver el procedimiento.</p></div>;
  const charts = [...(result.chart ? [result.chart] : []), ...(result.charts ?? [])];
  return <section className="result-panel" aria-live="polite">
    <div className="report-masthead"><img src="/unam-escudo-oscuro.png" alt="Escudo de la UNAM"/><div><strong>Laboratorio Matemático</strong><span>Informe de resultado · {new Date().toLocaleDateString('es-MX')}</span></div></div>
    <div className="result-top"><div><span className="eyebrow">RESULTADO</span><h2>{result.title}</h2><div className="result-value">{result.value}</div>{result.subtitle && <p className="result-subtitle">{result.subtitle}</p>}</div><div className="result-actions no-print"><button className="button button-outline small" onClick={() => window.print()} title="Imprimir o guardar como PDF"><Printer size={16}/> Imprimir / PDF</button>{reset && <button className="icon-button reset-button" aria-label="Limpiar resultado" title="Limpiar resultado" onClick={reset}><RotateCcw size={18}/></button>}</div></div>
    <div className="result-body">
      <h3>Procedimiento</h3><ol className="steps-list">{result.steps.map((step, index) => <li key={`${step.title}-${index}`}><span className="step-number">{index + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div></li>)}</ol>
      <LogicVisuals result={result}/>
      {charts.map((chart, index) => <Suspense key={`${chart.label}-${index}`} fallback={<div className="chart-box">Cargando gráfica…</div>}><EChart2D {...chart}/></Suspense>)}
      {result.surface3d && <Suspense fallback={<div className="surface-card">Cargando superficie 3D…</div>}><SurfaceChart3D surface={result.surface3d}/></Suspense>}
      {result.table && <div className="table-section"><div className="table-heading"><h3>Tabla de resultados</h3><button className="text-button no-print" onClick={() => downloadCsv(result)}><Download size={16}/> Descargar CSV</button></div><div className="table-scroll"><table><thead><tr>{result.table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{result.table.rows.map((row, index) => <tr key={index}>{row.map((cell, at) => <td key={at}>{cell}</td>)}</tr>)}</tbody></table></div></div>}
      {result.note && <p className="result-note"><Info size={17}/>{result.note}</p>}
    </div>
    <div className="report-footer">© {new Date().getFullYear()} Equipo 1 · Proyecto académico. El escudo y nombre de la UNAM pertenecen a la Universidad Nacional Autónoma de México.</div>
  </section>;
}
