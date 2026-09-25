import { useState, type FormEvent } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { useCalculationController } from '../../controller/useCalculationController';
import { truthTable } from '../../model/logic';
import ResultPanel from '../components/ResultPanel';
import { GateGallery } from '../components/CircuitDiagram';

export default function LogicView() {
  const [expression, setExpression] = useState('(A ∧ B) → C');
  const controller = useCalculationController('logica', truthTable);
  function submit(event: FormEvent) { event.preventDefault(); controller.run('Tabla de verdad y simplificación', expression); }
  const insert = (symbol: string) => setExpression((value) => value + symbol);
  return <><div className="workspace-grid"><section className="form-card"><div className="form-card-head"><span className="form-head-icon">01</span><div><h2>Tabla de verdad</h2><p>Escribe una expresión de hasta cuatro variables.</p></div></div><form onSubmit={submit} className="fields"><label className="field"><span>Expresión booleana</span><input value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="(A ∧ B) → C" spellCheck={false}/><small>Usa letras individuales: A, B, C, D…</small></label><div className="operator-row" aria-label="Operadores lógicos">{[['¬', 'Negación'], ['∧', 'Conjunción'], ['∨', 'Disyunción'], ['→', 'Condicional'], ['↔', 'Bicondicional']].map(([symbol, label]) => <button type="button" key={symbol} onClick={() => insert(symbol)} title={label}>{symbol}</button>)}</div><button className="button button-primary">Generar resultado <ArrowRight size={18}/></button></form><div className="form-tip"><Info size={17}/><span>Ejemplo: <button onClick={() => setExpression('(A ∨ B) ∧ ¬A')}>(A ∨ B) ∧ ¬A</button></span></div></section><ResultPanel result={controller.result} error={controller.error} reset={controller.reset}/></div><GateGallery/></>;
}
