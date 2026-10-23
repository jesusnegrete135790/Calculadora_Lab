import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, FlaskConical, Info } from 'lucide-react';
import { useCalculationController } from '../../controller/useCalculationController';
import { calculateLogic, type InductionSeries, type LogicInput, type PredicateRelation } from '../../model/logic';
import { logicTopics, type LogicTopic } from '../../model/logicTopics';
import ResultPanel from '../components/ResultPanel';
import { GateGallery } from '../components/CircuitDiagram';

const operators = [['¬', 'Negación'], ['∧', 'Conjunción'], ['∨', 'Disyunción'], ['→', 'Condicional'], ['↔', 'Bicondicional']];
const methodNames: Record<LogicInput['method'], string> = {
  truth: 'Tabla de verdad y simplificación', equivalence: 'Equivalencia lógica', argument: 'Validez de argumentos',
  consistency: 'Consistencia de premisas', predicate: 'Predicados en dominio finito', induction: 'Inducción matemática',
};

function LogicalField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  function insert(symbol: string) {
    const field = inputRef.current ?? textareaRef.current;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? start;
    const next = value.slice(0, start) + symbol + value.slice(end);
    if (next.length > (multiline ? 1023 : 255)) return;
    onChange(next);
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + symbol.length, start + symbol.length); });
  }
  return <div className="logic-expression-field">
    <label className="field"><span>{label}</span>{multiline
      ? <textarea ref={textareaRef} rows={3} value={value} maxLength={1023} onChange={(event) => onChange(event.target.value)} spellCheck={false} required/>
      : <input ref={inputRef} value={value} maxLength={255} onChange={(event) => onChange(event.target.value)} spellCheck={false} required/>}
      <small>{multiline ? 'De una a cuatro premisas. Sepáralas con punto y coma o salto de línea.' : 'Hasta cuatro variables distintas entre todas las expresiones. Letras individuales; 0 y 1 como constantes.'}</small>
    </label>
    <div className="operator-row" role="group" aria-label={`Operadores para ${label.toLowerCase()}`}>{operators.map(([symbol, name]) => <button type="button" key={symbol} onClick={() => insert(symbol)} title={name} aria-label={`Insertar ${name.toLowerCase()} en ${label.toLowerCase()}`}>{symbol}</button>)}</div>
  </div>;
}

function TopicExercise({ topic }: { topic: LogicTopic }) {
  const [answer, setAnswer] = useState<number | null>(null);
  const exercise = topic.exercise;
  return <section className="logic-quiz no-print" aria-labelledby="logic-quiz-title">
    <div><span className="eyebrow">COMPRUEBA LO APRENDIDO</span><h3 id="logic-quiz-title">{exercise.question}</h3></div>
    <div className="logic-quiz-options">{exercise.options.map((option, index) => <button type="button" key={option} aria-pressed={answer === index} onClick={() => setAnswer(index)}>{option}</button>)}</div>
    {answer !== null && <p className={`logic-feedback${answer === exercise.answer ? ' correct' : ''}`} role="status"><strong>{answer === exercise.answer ? 'Respuesta correcta. ' : 'Revisa tu respuesta. '}</strong>{exercise.explanation}</p>}
  </section>;
}

function LogicWorkbench({ topic }: { topic: LogicTopic }) {
  const initialMethod = topic.id === 'equivalencia' ? 'equivalence' : topic.id === 'inferencia' || topic.id === 'validez' ? 'argument' : topic.id === 'induccion' ? 'induction' : 'truth';
  const [method, setMethod] = useState<LogicInput['method']>(initialMethod);
  const [expression, setExpression] = useState(topic.id === 'algebra' ? '(A ∧ B) ∨ (A ∧ ¬B)' : '(A ∧ B) → C');
  const [left, setLeft] = useState('¬(A ∧ B)');
  const [right, setRight] = useState('¬A ∨ ¬B');
  const [premises, setPremises] = useState('A → B; A');
  const [conclusion, setConclusion] = useState('B');
  const [domain, setDomain] = useState('-2, -1, 0, 1, 2');
  const [predicateExpression, setPredicateExpression] = useState('x^2');
  const [relation, setRelation] = useState<PredicateRelation>('>');
  const [target, setTarget] = useState('0');
  const [series, setSeries] = useState<InductionSeries>('naturales');
  const [n, setN] = useState('10');
  const controller = useCalculationController('logica', calculateLogic);

  function submit(event: FormEvent) {
    event.preventDefault();
    let input: LogicInput;
    switch (method) {
      case 'truth': input = { method, expression }; break;
      case 'equivalence': input = { method, left, right }; break;
      case 'argument': input = { method, premises, conclusion }; break;
      case 'consistency': input = { method, premises }; break;
      case 'predicate': input = { method, domain, expression: predicateExpression, relation, target: Number(target) }; break;
      case 'induction': input = { method, series, n: Number(n) }; break;
    }
    void controller.run(methodNames[method], input);
  }

  function example(values: { expression?: string; left?: string; right?: string; premises?: string; conclusion?: string }) {
    if (values.expression !== undefined) setExpression(values.expression);
    if (values.left !== undefined) setLeft(values.left);
    if (values.right !== undefined) setRight(values.right);
    if (values.premises !== undefined) setPremises(values.premises);
    if (values.conclusion !== undefined) setConclusion(values.conclusion);
    controller.reset();
  }

  const examples = method === 'truth' ? topic.id === 'algebra' ? [
    { label: 'Factorización', expression: '(A ∧ B) ∨ (A ∧ ¬B)' },
    { label: 'Absorción', expression: 'A ∨ (A ∧ B)' },
    { label: 'Control de acceso', expression: '(A ∧ B) ∨ (A ∧ C)' },
  ] : [
    { label: 'Condicional', expression: 'A → B' }, { label: 'Bicondicional', expression: 'A ↔ B' },
    { label: 'Tautología', expression: 'A ∨ ¬A' }, { label: 'Contradicción', expression: 'A ∧ ¬A' }, { label: 'Contingencia', expression: 'A ∧ B' },
  ] : method === 'equivalence' ? [
    { label: 'De Morgan', left: '¬(A ∧ B)', right: '¬A ∨ ¬B' },
    { label: 'Implicación', left: 'A → B', right: '¬A ∨ B' },
    { label: 'No equivalentes', left: 'A → B', right: 'B → A' },
  ] : method === 'argument' ? [
    { label: 'Modus ponens', premises: 'A → B; A', conclusion: 'B' },
    { label: 'Modus tollens', premises: 'A → B; ¬B', conclusion: '¬A' },
    { label: 'Silogismo hipotético', premises: 'A → B; B → C', conclusion: 'A → C' },
    { label: 'Silogismo disyuntivo', premises: 'A ∨ B; ¬A', conclusion: 'B' },
    { label: 'Afirmación del consecuente', premises: 'A → B; B', conclusion: 'A' },
    { label: 'Negación del antecedente', premises: 'A → B; ¬A', conclusion: '¬B' },
    { label: 'Demostración condicional', premises: 'A → B; B → C; A', conclusion: 'C' },
  ] : method === 'consistency' ? [
    { label: 'Conjunto consistente', premises: 'A ∨ B; ¬A' }, { label: 'Conjunto inconsistente', premises: 'A; ¬A' },
  ] : [];

  return <>
    <div className="logic-practice-heading no-print" id="logic-practice"><FlaskConical size={21}/><div><h3>Laboratorio de práctica</h3><p>Modifica los datos y consulta el procedimiento completo.</p></div></div>
    <div className="workspace-grid">
      <section className="form-card no-print">
        <div className="form-card-head"><span className="form-head-icon">{String(logicTopics.indexOf(topic) + 1).padStart(2, '0')}</span><div><h3>{methodNames[method]}</h3><p>{method === 'induction' ? 'Tres identidades con demostración guiada.' : method === 'predicate' ? 'Evalúa cuantificadores en un dominio finito.' : 'Usa la notación lógica o los botones de operadores.'}</p></div></div>
        <form className="fields" onSubmit={submit}>
          {topic.id === 'validez' && <label className="field"><span>Herramienta</span><select value={method} disabled={controller.saving} onChange={(event) => { setMethod(event.target.value as LogicInput['method']); controller.reset(); }}>
            <option value="argument">Validez de argumentos</option><option value="consistency">Consistencia de premisas</option><option value="predicate">Predicados y cuantificadores</option>
          </select></label>}
          <fieldset className="logic-tool-fields" disabled={controller.saving}>
            {method === 'truth' && <LogicalField label="Expresión booleana" value={expression} onChange={setExpression}/>}
            {method === 'equivalence' && <><LogicalField label="Primera expresión (E1)" value={left} onChange={setLeft}/><LogicalField label="Segunda expresión (E2)" value={right} onChange={setRight}/></>}
            {(method === 'argument' || method === 'consistency') && <LogicalField label="Premisas" value={premises} onChange={setPremises} multiline/>}
            {method === 'argument' && <LogicalField label="Conclusión" value={conclusion} onChange={setConclusion}/>}
            {method === 'predicate' && <>
              <label className="field"><span>Dominio finito D</span><input value={domain} maxLength={255} onChange={(event) => setDomain(event.target.value)} required/><small>Entre 1 y 16 números separados por comas.</small></label>
              <label className="field"><span>Expresión del predicado en x</span><input value={predicateExpression} maxLength={255} onChange={(event) => setPredicateExpression(event.target.value)} spellCheck={false} required/><small>Ejemplos: x^2, x+1, 2*x. Se admite +, −, *, /, ^ y paréntesis.</small></label>
              <div className="field-row"><label className="field"><span>Relación</span><select value={relation} onChange={(event) => setRelation(event.target.value as PredicateRelation)}>{(['>', '>=', '<', '<=', '=', '!='] as const).map((op) => <option key={op} value={op}>{op === '!=' ? '≠' : op === '>=' ? '≥' : op === '<=' ? '≤' : op}</option>)}</select></label><label className="field"><span>Valor de comparación</span><input type="number" step="any" value={target} onChange={(event) => setTarget(event.target.value)} required/></label></div>
            </>}
            {method === 'induction' && <>
              <label className="field"><span>Sucesión</span><select value={series} onChange={(event) => setSeries(event.target.value as InductionSeries)}><option value="naturales">Naturales: aₙ = n</option><option value="impares">Impares: aₙ = 2n − 1</option><option value="cuadrados">Cuadrados: aₙ = n²</option></select></label>
              <label className="field"><span>Número de términos (n)</span><input type="number" min={1} max={1000} step={1} value={n} onChange={(event) => setN(event.target.value)} required/><small>De 1 a 1000. La prueba general se acompaña de este ejemplo numérico.</small></label>
            </>}
            <button className="button button-primary" type="submit" disabled={controller.saving}>{controller.saving ? 'Guardando…' : method === 'induction' ? 'Desarrollar demostración' : 'Generar resultado'}<ArrowRight size={18}/></button>
          </fieldset>
        </form>
        {examples.length > 0 && <div className="logic-examples"><strong>Cargar un ejemplo</strong><div>{examples.map((item) => <button type="button" key={item.label} disabled={controller.saving} onClick={() => example(item)}>{item.label}</button>)}</div></div>}
        <div className="form-tip"><Info size={17}/><span>{method === 'induction' ? 'El caso base y el paso inductivo justifican la identidad; la tabla muestra ejemplos.' : method === 'predicate' ? '∀ exige que todos cumplan el predicado; ∃ exige al menos un testigo en D.' : 'También puedes escribir ! para ¬, & para ∧, | para ∨, -> para → y <-> para ↔.'}</span></div>
      </section>
      <div>{(controller.saving || controller.saveStatus) && <p className="logic-save-status no-print" role="status">{controller.saving ? 'Guardando…' : controller.saveStatus}</p>}<ResultPanel result={controller.result} error={controller.error} reset={controller.reset}/></div>
    </div>
    {topic.id === 'algebra' && <div className="no-print"><GateGallery/></div>}
  </>;
}

export default function LogicView() {
  const [topicIndex, setTopicIndex] = useState(0);
  const topic = logicTopics[topicIndex];
  return <div className="logic-module">
    <section className="logic-syllabus no-print" aria-labelledby="logic-syllabus-title">
      <div className="logic-syllabus-header"><div><span className="eyebrow">CONTENIDO TEMÁTICO</span><h2 id="logic-syllabus-title">Explora los temas del módulo</h2></div><span className="logic-topic-count">7 temas · Teoría y práctica</span></div>
      <nav className="logic-topic-nav" aria-label="Temas de lógica matemática">{logicTopics.map((item, index) => <button type="button" key={item.id} aria-pressed={topicIndex === index} aria-controls="logic-topic-content" onClick={() => setTopicIndex(index)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong>{topicIndex === index && <CheckCircle2 size={16} aria-hidden="true"/>}</button>)}</nav>
    </section>
    <section id="logic-topic-content" aria-labelledby="logic-topic-title">
      <div className="logic-topic-heading no-print"><div><span className="eyebrow">TEMA {String(topicIndex + 1).padStart(2, '0')}</span><h2 id="logic-topic-title">{topic.title}</h2><p>{topic.description}</p></div><a className="button button-outline" href="#logic-practice">Ir a la práctica<ArrowRight size={16}/></a></div>
      <div className="logic-lessons no-print" key={topic.id}>{topic.lessons.map((lesson, index) => <details key={lesson.title} open={index === 0}><summary><BookOpen size={17} aria-hidden="true"/><span>{lesson.title}</span></summary><div><p>{lesson.explanation}</p><div className="logic-lesson-example"><strong>Ejemplo resuelto</strong><p>{lesson.example}</p></div></div></details>)}</div>
      {topic.id === 'validez' && <div className="logic-validity-guide no-print" role="group" aria-label="Recorrido de valores de verdad"><span>Todas las premisas = 1</span><ArrowRight size={18} aria-hidden="true"/><span>Conclusión = 0</span><ArrowRight size={18} aria-hidden="true"/><strong>Contraejemplo: argumento no válido</strong></div>}
      <TopicExercise key={`exercise-${topic.id}`} topic={topic}/>
      <LogicWorkbench key={`workbench-${topic.id}`} topic={topic}/>
    </section>
  </div>;
}
