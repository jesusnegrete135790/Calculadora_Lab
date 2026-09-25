import { useState } from 'react';

type Gate = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR';
const gateNames: Gate[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'];
const gateDescriptions: Record<Gate, string> = {
  AND: 'Salida 1 solo si ambas entradas son 1.',
  OR: 'Salida 1 si al menos una entrada es 1.',
  NOT: 'Invierte la entrada.',
  NAND: 'Negación de AND.',
  NOR: 'Negación de OR.',
  XOR: 'Salida 1 si las entradas son distintas.',
  XNOR: 'Salida 1 si las entradas son iguales.',
};

function evaluateGate(gate: Gate, a: boolean, b: boolean) {
  switch (gate) {
    case 'AND': return a && b;
    case 'OR': return a || b;
    case 'NOT': return !a;
    case 'NAND': return !(a && b);
    case 'NOR': return !(a || b);
    case 'XOR': return a !== b;
    case 'XNOR': return a === b;
  }
}

export function GateSymbol({ gate }: { gate: Gate }) {
  const and = gate === 'AND' || gate === 'NAND';
  const inverter = gate === 'NOT';
  const xor = gate === 'XOR' || gate === 'XNOR';
  const bubble = inverter || gate === 'NAND' || gate === 'NOR' || gate === 'XNOR';
  return <svg viewBox="0 0 100 70" className="gate-svg" role="img" aria-label={`Compuerta ${gate}`}>
    {inverter ? <><line x1="0" y1="35" x2="16" y2="35"/><polygon points="16,13 16,57 66,35"/></> : <><line x1="0" y1="23" x2="17" y2="23"/><line x1="0" y1="47" x2="17" y2="47"/>{and ? <path d="M17 11 H43 A24 24 0 0 1 43 59 H17 Z"/> : <path d="M17 11 Q32 35 17 59 Q49 59 68 35 Q49 11 17 11 Z"/>}{xor && <path d="M10 11 Q25 35 10 59" fill="none"/>}</>}
    {bubble && <circle cx={inverter ? 72 : 74} cy="35" r="5"/>}
    <line x1={bubble ? 79 : inverter ? 66 : and ? 67 : 68} y1="35" x2="100" y2="35"/>
  </svg>;
}

export function GateGallery() {
  const [gate, setGate] = useState<Gate>('AND');
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const rows = gate === 'NOT' ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
  return <section className="gate-gallery">
    <div className="gallery-header"><div><span className="eyebrow">EXPLORA LA LÓGICA</span><h2>Galería de compuertas</h2><p>Selecciona una compuerta, cambia sus entradas y compara su tabla de verdad.</p></div></div>
    <div className="gate-tabs" role="group" aria-label="Tipos de compuertas">{gateNames.map((name) => <button key={name} className={gate === name ? 'selected' : ''} aria-pressed={gate === name} onClick={() => setGate(name)}>{name}</button>)}</div>
    <div className="gate-gallery-body"><div className="gate-preview"><GateSymbol gate={gate}/><div><h3>{gate}</h3><p>{gateDescriptions[gate]}</p></div></div><div className="gate-live"><h3>Prueba entradas</h3><div className="gate-toggle-row"><button aria-pressed={a} onClick={() => setA(!a)}>A = {Number(a)}</button>{gate !== 'NOT' && <button aria-pressed={b} onClick={() => setB(!b)}>B = {Number(b)}</button>}<span className={`gate-live-output${evaluateGate(gate, a, b) ? ' on' : ''}`}>Salida = {Number(evaluateGate(gate, a, b))}</span></div></div><div className="gate-truth"><h3>Tabla de verdad</h3><table><thead><tr><th>A</th>{gate !== 'NOT' && <th>B</th>}<th>Salida</th></tr></thead><tbody>{rows.map((row) => <tr key={row.join('')}><td>{row[0]}</td>{gate !== 'NOT' && <td>{row[1]}</td>}<td>{Number(evaluateGate(gate, Boolean(row[0]), Boolean(row[1])))}</td></tr>)}</tbody></table></div></div>
  </section>;
}

export default function CircuitDiagram({ terms, constant }: { terms: string[][]; constant?: string }) {
  if (!terms.length) return <div className="circuit-constant">Salida constante: {constant?.startsWith('1') ? '1' : '0'}</div>;
  const heights = terms.map((term) => Math.max(70, term.length * 24 + 24));
  let position = 0;
  const centers = heights.map((height) => { const center = position + height / 2; position += height; return center; });
  const totalHeight = Math.max(position, 100);
  const orCenter = totalHeight / 2;
  return <div className="circuit-svg-wrap"><svg viewBox={`0 0 440 ${totalHeight}`} className="circuit-svg" role="img" aria-label="Circuito de la expresión booleana simplificada">
    {terms.map((term, termIndex) => {
      const center = centers[termIndex], half = Math.max(18, term.length * 12);
      return <g key={termIndex}>
        {term.map((literal, literalIndex) => {
          const y = center + (literalIndex - (term.length - 1) / 2) * 24;
          const negated = literal.startsWith('¬');
          return <g key={literal}><text x="8" y={y + 4} className="circuit-label">{literal.replace('¬', '')}</text><line x1="25" y1={y} x2={negated ? 56 : 150} y2={y} className="circuit-wire"/>{negated && <><polygon points={`56,${y - 9} 56,${y + 9} 76,${y}`} className="circuit-gate"/><circle cx="82" cy={y} r="4" className="circuit-bubble"/><line x1="86" y1={y} x2="150" y2={y} className="circuit-wire"/></>}</g>;
        })}
        {term.length > 1 ? <path d={`M150 ${center - half} H174 A${half} ${half} 0 0 1 174 ${center + half} H150 Z`} className="circuit-gate"/> : <line x1="150" y1={center} x2="194" y2={center} className="circuit-wire"/>}
        <line x1="194" y1={center} x2="270" y2={center} className="circuit-wire"/>
      </g>;
    })}
    {terms.length > 1 && <><path d={`M270 ${orCenter - Math.max(36, totalHeight * .42)} Q300 ${orCenter} 270 ${orCenter + Math.max(36, totalHeight * .42)} Q332 ${orCenter + Math.max(36, totalHeight * .42)} 360 ${orCenter} Q332 ${orCenter - Math.max(36, totalHeight * .42)} 270 ${orCenter - Math.max(36, totalHeight * .42)} Z`} className="circuit-gate"/><line x1="360" y1={orCenter} x2="410" y2={orCenter} className="circuit-wire"/></>}
    {terms.length === 1 && <line x1="270" y1={orCenter} x2="410" y2={orCenter} className="circuit-wire"/>}
    <circle cx="415" cy={orCenter} r="8" className="circuit-output-node"/><text x="428" y={orCenter + 4} className="circuit-label">F</text>
  </svg></div>;
}
