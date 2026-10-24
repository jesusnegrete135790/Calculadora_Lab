import { useState, type FormEvent } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { useCalculationController } from '../../controller/useCalculationController';
import { calculateMatrix, matrixNames, parseMatrixCells, type MatrixMethod } from '../../model/matrices';
import ResultPanel from '../components/ResultPanel';

const unique = [['2', '1', '-1', '8'], ['-3', '-1', '2', '-11'], ['-2', '1', '2', '-3']];
const additionA = [['1', '2'], ['3', '4']];
const additionB = [['5', '6'], ['7', '8']];
const sizes = [1, 2, 3, 4, 5, 6];
const resize = (values: string[][], rows: number, columns: number) => Array.from({ length: rows }, (_, i) => Array.from({ length: columns }, (_, j) => values[i]?.[j] ?? '0'));

function MatrixEditor({ label, values, augmented, onChange }: { label: string; values: string[][]; augmented?: boolean; onChange: (values: string[][]) => void }) {
  return <div className="matrix-editor"><h3>{label}</h3><div className="matrix-input-scroll" role="region" aria-label={`Editor de ${label}`} tabIndex={0}>
    <table><thead><tr><th scope="col">Fila</th>{values[0].map((_, j) => <th scope="col" className={augmented && j === values[0].length - 1 ? 'matrix-rhs' : ''} key={j}>{augmented ? j === values[0].length - 1 ? 'b' : `x${j + 1}` : `C${j + 1}`}</th>)}</tr></thead>
      <tbody>{values.map((row, i) => <tr key={i}><th scope="row">F{i + 1}</th>{row.map((cell, j) => <td className={augmented && j === row.length - 1 ? 'matrix-rhs' : ''} key={j}><input type="text" inputMode="text" value={cell} maxLength={50} spellCheck={false} required aria-label={`${label}, fila ${i + 1}, ${augmented && j === row.length - 1 ? 'término independiente b' : `columna ${j + 1}`}`} onChange={(event) => onChange(values.map((current, at) => at === i ? current.map((value, column) => column === j ? event.target.value : value) : current))}/></td>)}</tr>)}</tbody>
    </table></div></div>;
}

export default function MatrixView() {
  const [method, setMethod] = useState<MatrixMethod>('matriz-reduccion');
  const [inverseOnly, setInverseOnly] = useState(false);
  const [matrix, setMatrix] = useState(unique);
  const [second, setSecond] = useState(additionB);
  const [tolerance, setTolerance] = useState('1e-10');
  const [inputError, setInputError] = useState('');
  const controller = useCalculationController('computacionales', calculateMatrix);
  const sum = method === 'matriz-suma';
  const inverse = method === 'matriz-inversa';
  const columns = matrix[0].length;
  function changeMethod(next: MatrixMethod) {
    if ((next === 'matriz-suma') !== sum) {
      setMatrix(next === 'matriz-suma' ? additionA : unique);
      setSecond(additionB);
    }
    if (next === 'matriz-inversa' && matrix.length !== columns - 1) setMatrix(unique);
    setInverseOnly(false);
    setMethod(next); setInputError(''); controller.reset();
  }
  function changeSize(rows: number, width: number) {
    setMatrix((current) => sum ? resize(current, rows, width) : Array.from({ length: rows }, (_, i) => [...Array.from({ length: width - 1 }, (_, j) => j < current[0].length - 1 ? current[i]?.[j] ?? '0' : '0'), current[i]?.at(-1) ?? '0']));
    if (sum) setSecond((current) => resize(current, rows, width));
    setInputError(''); controller.reset();
  }
  function submit(event: FormEvent) {
    event.preventDefault(); setInputError('');
    try {
      void controller.run(matrixNames[method], { method, matrix: parseMatrixCells(inverse && inverseOnly ? matrix.map((row) => row.slice(0, -1)) : matrix), ...(sum ? { secondMatrix: parseMatrixCells(second) } : {}), ...(inverse && inverseOnly ? { inverseOnly: true } : {}), tolerance: sum ? 1e-10 : Number(tolerance) });
    } catch (reason) { controller.reset(); setInputError(reason instanceof Error ? reason.message : 'Revisa los elementos de las matrices.'); }
  }
  function loadExample(kind: 'unique' | 'infinite' | 'inconsistent') {
    setMatrix(kind === 'unique' ? unique : kind === 'infinite' ? [['1', '2', '3'], ['2', '4', '6']] : [['1', '2', '3'], ['2', '4', '7']]);
    setInputError(''); controller.reset();
  }
  return <div className="matrix-workspace workspace-grid">
    <section className="form-card no-print">
      <div className="form-card-head"><span className="form-head-icon">{inverse && inverseOnly ? 'A⁻¹' : 'A|b'}</span><div><h2>Matrices y sistemas lineales</h2><p>{sum ? 'Suma matrices de las mismas dimensiones.' : inverse ? 'Calcula A⁻¹ o resuelve Ax = b con x = A⁻¹b.' : 'Resuelve hasta 6 ecuaciones con 6 incógnitas.'}</p></div></div>
      <form className="fields" onSubmit={submit}><fieldset className="matrix-fields" disabled={controller.saving}>
        <label className="field"><span>Método de matrices</span><select value={method} onChange={(event) => changeMethod(event.target.value as MatrixMethod)}><optgroup label="Métodos de resolución">{(['matriz-reduccion', 'matriz-gauss-jordan', 'matriz-inversa'] as const).map((key) => <option key={key} value={key}>{matrixNames[key]}</option>)}</optgroup><optgroup label="Operaciones con matrices"><option value="matriz-suma">{matrixNames['matriz-suma']}</option></optgroup></select></label>
        {inverse && <label className="field"><span>Objetivo</span><select value={inverseOnly ? 'inverse' : 'system'} onChange={(event) => { setInverseOnly(event.target.value === 'inverse'); setInputError(''); controller.reset(); }}><option value="system">Resolver Ax = b mediante A⁻¹b</option><option value="inverse">Calcular solamente A⁻¹</option></select></label>}
        {inverse ? <label className="field"><span>Orden de la matriz A</span><select value={matrix.length} onChange={(event) => { const size = Number(event.target.value); changeSize(size, size + 1); }}>{sizes.map((size) => <option key={size} value={size}>{size} × {size}</option>)}</select></label> : <div className="field-row"><label className="field"><span>{sum ? 'Filas' : 'Ecuaciones'}</span><select value={matrix.length} onChange={(event) => changeSize(Number(event.target.value), columns)}>{sizes.map((size) => <option key={size}>{size}</option>)}</select></label><label className="field"><span>{sum ? 'Columnas' : 'Incógnitas'}</span><select value={sum ? columns : columns - 1} onChange={(event) => changeSize(matrix.length, Number(event.target.value) + (sum ? 0 : 1))}>{sizes.map((size) => <option key={size}>{size}</option>)}</select></label></div>}
        <p className="matrix-input-hint">{sum ? 'A y B deben tener el mismo número de filas y columnas.' : inverse && inverseOnly ? 'Introduce una matriz cuadrada A. No se necesita el vector b.' : 'Cada fila es una ecuación; la columna b contiene el término independiente.'} Acepta decimales, negativos y fracciones como 1/2.</p>
        <MatrixEditor label={sum || (inverse && inverseOnly) ? 'Matriz A' : 'Matriz aumentada [A | b]'} values={inverse && inverseOnly ? matrix.map((row) => row.slice(0, -1)) : matrix} augmented={!sum && !(inverse && inverseOnly)} onChange={(values) => setMatrix(inverse && inverseOnly ? values.map((row, i) => [...row, matrix[i]?.at(-1) ?? '0']) : values)}/>
        {sum && <MatrixEditor label="Matriz B" values={second} onChange={setSecond}/>}
        {!sum && <label className="field"><span>Tolerancia numérica</span><input type="number" value={tolerance} min={1e-14} max={1e-4} step="any" onChange={(event) => setTolerance(event.target.value)} required/><small>Entre 1e-14 y 1e-4. Controla la detección numérica de pivotes y filas nulas.</small></label>}
        <button className="button button-primary" disabled={controller.saving}>{controller.saving ? 'Guardando…' : sum ? 'Sumar matrices' : inverse && inverseOnly ? 'Calcular inversa' : 'Resolver sistema'}<ArrowRight size={18}/></button>
      </fieldset></form>
      {!sum && <div className="matrix-examples"><strong>Cargar ejemplo</strong><div><button type="button" disabled={controller.saving} onClick={() => loadExample('unique')}>{inverse ? 'Matriz invertible' : 'Solución única'}</button><button type="button" disabled={controller.saving} onClick={() => loadExample('infinite')}>{inverse ? 'Matriz singular' : 'Infinitas soluciones'}</button>{!inverse && <button type="button" disabled={controller.saving} onClick={() => loadExample('inconsistent')}>Sin solución</button>}</div></div>}
      <div className="form-tip"><Info size={17}/><span>{sum ? 'La suma A + B opera elemento a elemento y no resuelve un sistema de ecuaciones.' : inverse ? 'Se transforma [A | I] en [I | A⁻¹]. Para resolver un sistema se calcula x = A⁻¹b. Requiere una matriz cuadrada invertible.' : method === 'matriz-gauss-jordan' ? 'Normaliza los pivotes y elimina arriba y abajo hasta obtener la forma escalonada reducida.' : 'Gauss elimina debajo de los pivotes para obtener la forma escalonada y termina con sustitución regresiva.'}</span></div>
    </section>
    <div>{(controller.saving || controller.saveStatus) && <p className="no-print" role="status">{controller.saving ? 'Guardando…' : controller.saveStatus}</p>}<ResultPanel result={controller.result} error={inputError || controller.error} reset={() => { setInputError(''); controller.reset(); }}/></div>
  </div>;
}
