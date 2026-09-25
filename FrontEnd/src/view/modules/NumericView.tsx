import { useState, type FormEvent } from 'react';
import { ArrowRight, Box, Info } from 'lucide-react';
import { useCalculationController } from '../../controller/useCalculationController';
import { calculateNumeric, type NumericInput, type NumericMethod } from '../../model/numeric';
import { NumberField, TextField } from '../components/Fields';
import ResultPanel from '../components/ResultPanel';

const names: Record<NumericMethod, string> = {
  biseccion: 'Bisección',
  newton: 'Newton–Raphson',
  lagrange: 'Interpolación de Lagrange',
  'newton-interpolacion': 'Interpolación de Newton',
  euler: 'Euler',
  'euler-mejorado': 'Euler mejorado',
  'runge-kutta': 'Runge–Kutta de orden 4',
  'superficie-3d': 'Superficie 3D f(x,y)',
};

export default function NumericView() {
  const [input, setInput] = useState<NumericInput>({
    method: 'biseccion', expression: 'x^3-x-2', a: 1, b: 2, x0: 1.5, y0: 1,
    tolerance: 0.000001, iterations: 20, points: '0,1; 1,3; 2,7', yMin: -2, yMax: 2,
  });
  const controller = useCalculationController('computacionales', calculateNumeric);
  const update = <K extends keyof NumericInput>(key: K, value: NumericInput[K]) => setInput((current) => ({ ...current, [key]: value }));
  const interpolation = input.method === 'lagrange' || input.method === 'newton-interpolacion';
  const ode = ['euler', 'euler-mejorado', 'runge-kutta'].includes(input.method);
  const surface = input.method === 'superficie-3d';
  function changeMethod(method: NumericMethod) {
    const isSurface = method === 'superficie-3d';
    const isOde = ['euler', 'euler-mejorado', 'runge-kutta'].includes(method);
    setInput((current) => ({
      ...current,
      method,
      expression: isSurface ? 'sin(x)*cos(y)' : isOde ? 'x+y' : 'x^3-x-2',
      a: isSurface ? -3 : isOde ? 0 : 1,
      b: isSurface ? 3 : isOde ? 1 : 2,
      yMin: -3,
      yMax: 3,
    }));
    controller.reset();
  }
  function submit(event: FormEvent) { event.preventDefault(); controller.run(names[input.method], input); }

  return <div className="workspace-grid">
    <section className="form-card">
      <div className="form-card-head"><span className="form-head-icon">03</span><div><h2>Métodos numéricos</h2><p>Explora las iteraciones y el resultado aproximado.</p></div></div>
      <form onSubmit={submit} className="fields">
        <label className="field"><span>Método</span><select value={input.method} onChange={(event) => changeMethod(event.target.value as NumericMethod)}>{Object.entries(names).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        {interpolation ? <>
          <label className="field"><span>Puntos (x, y)</span><textarea rows={4} value={input.points} onChange={(event) => update('points', event.target.value)} placeholder="0,1; 1,3; 2,7"/><small>Separa cada punto con punto y coma.</small></label>
          <NumberField label="Evaluar polinomio en x" value={input.x0} onChange={(value) => update('x0', value)}/>
        </> : <>
          <TextField label={surface ? 'Superficie z = f(x,y)' : ode ? 'Función y′ = f(x,y)' : 'Función f(x)'} value={input.expression} onChange={(value) => update('expression', value)} placeholder={surface ? 'sin(x)*cos(y)' : ode ? 'x+y' : 'x^3-x-2'} hint="Operadores: +, −, *, /, ^. Funciones: sin, cos, exp, ln, sqrt."/>
          {input.method !== 'newton' && <div className="field-row"><NumberField label={surface ? 'x mínimo' : ode ? 'x inicial' : 'Extremo a'} value={input.a} onChange={(value) => update('a', value)}/><NumberField label={surface ? 'x máximo' : ode ? 'x final' : 'Extremo b'} value={input.b} onChange={(value) => update('b', value)}/></div>}
          {surface && <div className="field-row"><NumberField label="y mínimo" value={input.yMin ?? -2} onChange={(value) => update('yMin', value)}/><NumberField label="y máximo" value={input.yMax ?? 2} onChange={(value) => update('yMax', value)}/></div>}
          {input.method === 'newton' && <NumberField label="Valor inicial x₀" value={input.x0} onChange={(value) => update('x0', value)}/>}
          {ode && <NumberField label="Valor inicial y₀" value={input.y0} onChange={(value) => update('y0', value)}/>}
          {!surface && <div className="field-row"><NumberField label={ode ? 'Número de pasos' : 'Máximo de iteraciones'} value={input.iterations} onChange={(value) => update('iterations', value)} step="1" min={1} max={200}/>{!ode && <NumberField label="Tolerancia" value={input.tolerance} onChange={(value) => update('tolerance', value)} min={0}/>}</div>}
        </>}
        <button className="button button-primary">{surface ? 'Generar superficie' : 'Calcular'} <ArrowRight size={18}/></button>
      </form>
      <div className="form-tip">{surface ? <Box size={17}/> : <Info size={17}/>}<span>{surface ? 'La gráfica 3D corresponde a una función de dos variables. Puedes girarla y cambiar su elevación.' : <>Ejemplos: <code>x^3-x-2</code> para raíces; <code>x+y</code> para ecuaciones diferenciales.</>}</span></div>
    </section>
    <ResultPanel result={controller.result} error={controller.error} reset={controller.reset}/>
  </div>;
}
