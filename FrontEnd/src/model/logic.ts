import type { CalculationResult } from './types';
import { compileExpression } from './expression';

type Node = { kind: 'var'; name: string } | { kind: 'constant'; value: boolean } | { kind: 'not'; child: Node } | { kind: 'binary'; op: string; left: Node; right: Node };

function normalize(source: string): string[] {
  if (source.length > 255) throw new Error('La expresión admite hasta 255 caracteres.');
  const input = source.replace(/\s+/g, '').replace(/<->|↔/g, '↔').replace(/->|→/g, '→').replace(/[!~]/g, '¬').replace(/&&|&/g, '∧').replace(/\|\||\|/g, '∨');
  const tokens = input.match(/[A-Za-z01]|[()¬∧∨→↔]/g) ?? [];
  if (tokens.join('') !== input) throw new Error('Usa letras individuales, las constantes 0 y 1 y los operadores ¬, ∧, ∨, →, ↔.');
  return tokens;
}

function parseLogic(source: string): { tree: Node; variables: string[] } {
  const tokens = normalize(source);
  if (!tokens.length) throw new Error('Escribe una expresión lógica.');
  let position = 0;
  const precedence: Record<string, number> = { '↔': 1, '→': 2, '∨': 3, '∧': 4 };
  function primary(): Node {
    const token = tokens[position++];
    if (token === '0' || token === '1') return { kind: 'constant', value: token === '1' };
    if (token === '¬') return { kind: 'not', child: primary() };
    if (token === '(') {
      const child = parse(1);
      if (tokens[position++] !== ')') throw new Error('Falta cerrar un paréntesis.');
      return child;
    }
    if (/^[A-Za-z]$/.test(token ?? '')) return { kind: 'var', name: token.toUpperCase() };
    throw new Error('Revisa la sintaxis de la expresión lógica.');
  }
  function parse(min: number): Node {
    let left = primary();
    while (precedence[tokens[position]] >= min) {
      const op = tokens[position++];
      const right = parse(precedence[op] + (op === '→' ? 0 : 1));
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }
  const tree = parse(1);
  if (position !== tokens.length) throw new Error('La expresión tiene símbolos fuera de lugar.');
  const variables = [...new Set(tokens.filter((token) => /^[A-Za-z]$/.test(token)).map((token) => token.toUpperCase()))].sort();
  if (variables.length > 4) throw new Error('La herramienta local admite hasta cuatro variables.');
  return { tree, variables };
}

function evaluate(node: Node, values: Record<string, boolean>): boolean {
  if (node.kind === 'constant') return node.value;
  if (node.kind === 'var') return values[node.name];
  if (node.kind === 'not') return !evaluate(node.child, values);
  const left = evaluate(node.left, values);
  const right = evaluate(node.right, values);
  switch (node.op) {
    case '∧': return left && right;
    case '∨': return left || right;
    case '→': return !left || right;
    default: return left === right;
  }
}

type Implicant = { bits: string; covers: number[] };

function simplify(variables: string[], minterms: number[]): { expression: string; groups: Implicant[] } {
  const width = variables.length;
  const max = 2 ** width;
  if (!minterms.length) return { expression: '0 (contradicción)', groups: [] };
  if (minterms.length === max) return { expression: '1 (tautología)', groups: [{ bits: '-'.repeat(width), covers: minterms }] };
  let current: Implicant[] = minterms.map((term) => ({ bits: term.toString(2).padStart(width, '0'), covers: [term] }));
  const primes: Implicant[] = [];
  while (current.length) {
    const used = new Set<number>();
    const next = new Map<string, Implicant>();
    for (let i = 0; i < current.length; i++) for (let j = i + 1; j < current.length; j++) {
      let differences = 0;
      let at = -1;
      for (let k = 0; k < width; k++) if (current[i].bits[k] !== current[j].bits[k]) { differences++; at = k; }
      if (differences !== 1 || current[i].bits[at] === '-' || current[j].bits[at] === '-') continue;
      used.add(i); used.add(j);
      const bits = current[i].bits.slice(0, at) + '-' + current[i].bits.slice(at + 1);
      next.set(bits, { bits, covers: [...new Set([...current[i].covers, ...current[j].covers])] });
    }
    current.forEach((item, index) => { if (!used.has(index) && !primes.some((prime) => prime.bits === item.bits)) primes.push(item); });
    current = [...next.values()];
  }
  // Exhaustive cover is small here: at most four variables and sixteen minterms.
  let best: Implicant[] = primes;
  for (let mask = 1; mask < 2 ** primes.length; mask++) {
    const selected = primes.filter((_, index) => Boolean(mask & (1 << index)));
    if (!minterms.every((term) => selected.some((group) => group.covers.includes(term)))) continue;
    const cost = selected.reduce((sum, group) => sum + group.bits.replace(/-/g, '').length, selected.length * 2);
    const bestCost = best.reduce((sum, group) => sum + group.bits.replace(/-/g, '').length, best.length * 2);
    if (cost < bestCost) best = selected;
  }
  const expression = best.map((group) => group.bits.split('').map((bit, index) => bit === '-' ? '' : bit === '1' ? variables[index] : `¬${variables[index]}`).filter(Boolean).join(' ∧ ')).join(' ∨ ');
  return { expression, groups: best };
}

export function truthTable(expression: string): CalculationResult {
  const { tree, variables } = parseLogic(expression);
  const rows: Array<Array<string | number>> = [];
  const minterms: number[] = [];
  for (let index = 0; index < 2 ** variables.length; index++) {
    const bits = variables.length ? index.toString(2).padStart(variables.length, '0') : '';
    const values = Object.fromEntries(variables.map((name, at) => [name, bits[at] === '1']));
    const result = evaluate(tree, values);
    if (result) minterms.push(index);
    rows.push([...bits.split('').map((bit) => Number(bit)), Number(result)]);
  }
  const reduction = simplify(variables, minterms);
  const rowBits = variables.length <= 2 ? Math.max(0, variables.length - 1) : 2;
  const columnBits = variables.length - rowBits;
  const gray = (size: number) => size ? Array.from({ length: 2 ** size }, (_, index) => (index ^ (index >> 1)).toString(2).padStart(size, '0')) : [''];
  const rowLabels = gray(rowBits);
  const columnLabels = gray(columnBits);
  const cells = rowLabels.flatMap((row) => columnLabels.map((column) => {
    const minterm = Number.parseInt(row + column || '0', 2);
    return { value: Number(minterms.includes(minterm)), minterm, groups: reduction.groups.flatMap((group, index) => group.covers.includes(minterm) ? [index] : []) };
  }));
  return {
    title: 'Expresión simplificada',
    value: reduction.expression,
    subtitle: `${minterms.length} de ${rows.length} combinaciones verdaderas`,
    table: { columns: [...variables, 'Resultado'], rows },
    logicMap: { rowLabels, columnLabels, cells },
    circuitTerms: reduction.expression === '1 (tautología)' || reduction.expression === '0 (contradicción)' ? [] : reduction.expression.split(' ∨ ').map((term) => term.split(' ∧ ')),
    steps: [
      { title: 'Expresión original', detail: expression },
      { title: 'Variables', detail: variables.length ? variables.join(', ') : 'Sin variables; expresión constante.' },
      { title: 'Clasificación', detail: minterms.length === rows.length ? 'Tautología: es verdadera en todas las combinaciones.' : minterms.length === 0 ? 'Contradicción: es falsa en todas las combinaciones.' : 'Contingencia: es verdadera en algunas combinaciones y falsa en otras.' },
      { title: 'Evaluación', detail: `Se calcularon las ${rows.length} combinaciones posibles y los minterminos ${minterms.length ? minterms.join(', ') : 'ninguno'}.` },
      { title: 'Agrupación', detail: reduction.groups.length ? reduction.groups.map((group) => `${group.bits} cubre ${group.covers.join(', ')}`).join('; ') : 'No hay combinaciones verdaderas.' },
    ],
    note: 'El mapa y el esquema representan una suma de productos para hasta cuatro variables.',
  };
}

export type PredicateRelation = '>' | '>=' | '<' | '<=' | '=' | '!=';
export type InductionSeries = 'naturales' | 'impares' | 'cuadrados';
export type LogicInput =
  | { method: 'truth'; expression: string }
  | { method: 'equivalence'; left: string; right: string }
  | { method: 'argument'; premises: string; conclusion: string }
  | { method: 'consistency'; premises: string }
  | { method: 'predicate'; domain: string; expression: string; relation: PredicateRelation; target: number }
  | { method: 'induction'; series: InductionSeries; n: number };

function premiseList(source: string): string[] {
  const items = source.split(/[;\n]/).map((item) => item.trim()).filter(Boolean);
  if (!items.length || items.length > 4) throw new Error('Escribe de una a cuatro premisas, separadas por punto y coma o salto de línea.');
  return items;
}

function analyzeStatements(expressions: string[]) {
  const statements = expressions.map(parseLogic);
  const variables = [...new Set(statements.flatMap((statement) => statement.variables))].sort();
  if (variables.length > 4) throw new Error('Usa como máximo cuatro variables distintas entre todas las expresiones.');
  const evaluations = Array.from({ length: 2 ** variables.length }, (_, index) => {
    const bits = variables.map((_, at) => Number(Boolean(index & (1 << (variables.length - at - 1)))));
    const scope = Object.fromEntries(variables.map((name, at) => [name, Boolean(bits[at])]));
    return { bits, values: statements.map((statement) => evaluate(statement.tree, scope)) };
  });
  return { variables, evaluations };
}

function assignment(variables: string[], bits: number[]): string {
  return variables.length ? variables.map((name, index) => `${name} = ${bits[index]}`).join(', ') : 'Sin variables (solo constantes)';
}

export function calculateLogic(input: LogicInput): CalculationResult {
  if (input.method === 'truth') return truthTable(input.expression);
  if (input.method === 'induction') return induction(input.series, input.n);
  if (input.method === 'predicate') return predicate(input);
  if (input.method === 'equivalence') {
    const { variables, evaluations } = analyzeStatements([input.left, input.right]);
    const differences = evaluations.filter((row) => row.values[0] !== row.values[1]);
    return {
      title: 'Equivalencia lógica', value: differences.length ? 'No equivalentes' : 'Equivalentes',
      subtitle: `${evaluations.length - differences.length} de ${evaluations.length} combinaciones coinciden`,
      steps: [
        { title: 'Expresiones', detail: `E1: ${input.left}; E2: ${input.right}.` },
        { title: 'Criterio', detail: 'Dos expresiones son equivalentes si E1 ↔ E2 es una tautología.' },
        { title: differences.length ? 'Contraejemplo' : 'Comprobación completa', detail: differences.length ? `${assignment(variables, differences[0].bits)}: E1 = ${Number(differences[0].values[0])}, E2 = ${Number(differences[0].values[1])}.` : 'Ambas expresiones tienen el mismo valor en todas las asignaciones.' },
      ],
      table: { columns: [...variables, 'E1', 'E2', 'E1 ↔ E2'], rows: evaluations.map(({ bits, values }) => [...bits, ...values.map(Number), Number(values[0] === values[1])]) },
      note: '1 = verdadero; 0 = falso. Se revisan todas las combinaciones de hasta cuatro variables.',
    };
  }
  const premises = premiseList(input.premises);
  const expressions = input.method === 'argument' ? [...premises, input.conclusion] : premises;
  const { variables, evaluations } = analyzeStatements(expressions);
  const models = evaluations.filter((row) => row.values.slice(0, premises.length).every(Boolean));
  const steps = premises.map((premise, index) => ({ title: `Premisa ${index + 1}`, detail: premise }));
  if (input.method === 'consistency') return {
    title: 'Consistencia de las premisas', value: models.length ? 'Consistentes' : 'Inconsistentes',
    subtitle: `${models.length} de ${evaluations.length} asignaciones hacen verdaderas todas las premisas`,
    steps: [...steps, { title: 'Criterio', detail: 'Un conjunto es consistente si existe al menos una asignación donde todas sus premisas son verdaderas.' },
      { title: 'Resultado', detail: models.length ? `Asignación que satisface el conjunto: ${assignment(variables, models[0].bits)}.` : 'No existe una asignación que satisfaga simultáneamente todas las premisas.' }],
    table: { columns: [...variables, ...premises.map((_, index) => `P${index + 1}`), 'Todas verdaderas'], rows: evaluations.map(({ bits, values }) => [...bits, ...values.map(Number), Number(values.every(Boolean))]) },
    note: 'La consistencia evalúa la compatibilidad de las premisas, sin exigir una conclusión.',
  };
  const counterexamples = models.filter((row) => !row.values.at(-1));
  return {
    title: 'Validez del argumento', value: counterexamples.length ? 'Argumento no válido' : 'Argumento válido',
    subtitle: `${counterexamples.length} ${counterexamples.length === 1 ? 'contraejemplo' : 'contraejemplos'}; ${models.length} asignaciones con todas las premisas verdaderas`,
    steps: [...steps, { title: 'Conclusión', detail: input.conclusion },
      { title: 'Criterio de validez', detail: 'Se buscan filas con todas las premisas verdaderas y la conclusión falsa. Basta una para refutar la validez.' },
      { title: counterexamples.length ? 'Contraejemplo' : 'Comprobación', detail: counterexamples.length ? `${assignment(variables, counterexamples[0].bits)}: todas las premisas valen 1 y la conclusión vale 0.` : models.length ? 'En todas las filas con premisas verdaderas, la conclusión también es verdadera.' : 'Las premisas son inconsistentes. El argumento es válido por vacuidad; no es un argumento sólido.' }],
    table: { columns: [...variables, ...premises.map((_, index) => `P${index + 1}`), 'Conclusión', 'Contraejemplo'], rows: evaluations.map(({ bits, values }) => [...bits, ...values.map(Number), Number(values.slice(0, premises.length).every(Boolean) && !values.at(-1))]) },
    note: 'La validez depende de la forma del argumento. La solidez requiere además premisas verdaderas en la interpretación considerada. 1 = verdadero; 0 = falso.',
  };
}

function predicate(input: Extract<LogicInput, { method: 'predicate' }>): CalculationResult {
  const tokens = input.domain.trim().split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length || tokens.length > 16 || tokens.some((token) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token))) throw new Error('Escribe entre 1 y 16 números finitos separados por comas.');
  const domain = [...new Set(tokens.map(Number))];
  if (domain.some((value) => !Number.isFinite(value)) || !Number.isFinite(input.target)) throw new Error('El dominio y el valor de comparación deben ser finitos.');
  if (!input.expression.trim() || input.expression.length > 255) throw new Error('Escribe una expresión de hasta 255 caracteres.');
  const fn = compileExpression(input.expression, ['x']);
  const relations: Record<PredicateRelation, (a: number, b: number) => boolean> = {
    '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, '=': (a, b) => a === b, '!=': (a, b) => a !== b,
  };
  if (!relations[input.relation]) throw new Error('Selecciona una relación válida.');
  const rows = domain.map((x) => { const value = fn({ x }); return [x, value, Number(relations[input.relation](value, input.target))]; });
  const trueRows = rows.filter((row) => row[2] === 1);
  return {
    title: 'Predicados en un dominio finito', value: `∀x P(x): ${trueRows.length === rows.length ? 'verdadero' : 'falso'} · ∃x P(x): ${trueRows.length ? 'verdadero' : 'falso'}`,
    subtitle: `P(x): ${input.expression} ${input.relation === '!=' ? '≠' : input.relation} ${input.target}`,
    steps: [
      { title: 'Dominio', detail: `D = {${domain.join(', ')}}. Los valores repetidos se consideran una sola vez.` },
      { title: 'Evaluación del predicado', detail: 'Sustituye cada elemento del dominio y compara el resultado con el valor indicado.' },
      { title: 'Cuantificador universal', detail: trueRows.length === rows.length ? 'Todos los elementos del dominio satisfacen P(x).' : `Contraejemplo: x = ${rows.find((row) => !row[2])![0]} no satisface P(x).` },
      { title: 'Cuantificador existencial', detail: trueRows.length ? `Testigo: x = ${trueRows[0][0]} satisface P(x).` : 'No existe un testigo dentro del dominio indicado.' },
    ],
    table: { columns: ['x', 'Expresión evaluada', 'P(x)'], rows },
    note: 'Los cuantificadores se evalúan únicamente en el dominio finito indicado. Se usa aritmética numérica del navegador; una comprobación finita no demuestra una afirmación sobre todos los naturales o reales.',
  };
}

function induction(series: InductionSeries, n: number): CalculationResult {
  if (!Number.isInteger(n) || n < 1 || n > 1000) throw new Error('Elige un entero n entre 1 y 1000.');
  const definitions = {
    naturales: { term: (i: number) => i, termLabel: 'aₙ = n', formula: 'n(n + 1) / 2', sum: (i: number) => i * (i + 1) / 2, hypothesis: '1 + 2 + … + k = k(k + 1)/2', proof: 'Sₖ₊₁ = k(k + 1)/2 + (k + 1) = (k + 1)(k + 2)/2. Es la fórmula con n = k + 1.' },
    impares: { term: (i: number) => 2 * i - 1, termLabel: 'aₙ = 2n − 1', formula: 'n²', sum: (i: number) => i ** 2, hypothesis: '1 + 3 + … + (2k − 1) = k²', proof: 'Sₖ₊₁ = k² + [2(k + 1) − 1] = k² + 2k + 1 = (k + 1)².' },
    cuadrados: { term: (i: number) => i ** 2, termLabel: 'aₙ = n²', formula: 'n(n + 1)(2n + 1) / 6', sum: (i: number) => i * (i + 1) * (2 * i + 1) / 6, hypothesis: '1² + 2² + … + k² = k(k + 1)(2k + 1)/6', proof: 'Sₖ₊₁ = k(k + 1)(2k + 1)/6 + (k + 1)² = (k + 1)[2k² + 7k + 6]/6 = (k + 1)(k + 2)(2k + 3)/6.' },
  };
  const definition = definitions[series];
  if (!definition) throw new Error('Selecciona una sucesión disponible.');
  let sum = 0;
  const rows = Array.from({ length: n }, (_, at) => { const i = at + 1; sum += definition.term(i); return [i, definition.term(i), sum, definition.sum(i)]; });
  return {
    title: 'Sumatoria y término enésimo', value: `S${n} = ${sum}; a${n} = ${definition.term(n)}`,
    subtitle: `${definition.termLabel}; Sₙ = ${definition.formula}`,
    steps: [
      { title: 'Proposición P(n)', detail: `Para todo n ≥ 1, la suma de los primeros n términos cumple Sₙ = ${definition.formula}.` },
      { title: 'Caso base: n = 1', detail: `El primer término vale ${definition.term(1)} y la fórmula da ${definition.sum(1)}. P(1) es verdadera.` },
      { title: 'Hipótesis inductiva', detail: `Para un entero arbitrario k ≥ 1, suponemos ${definition.hypothesis}.` },
      { title: 'Paso inductivo', detail: definition.proof },
      { title: 'Conclusión por inducción', detail: 'El caso base y P(k) ⇒ P(k + 1) demuestran la identidad para todo entero n ≥ 1.' },
      { title: `Ejemplo numérico: n = ${n}`, detail: `La suma directa es ${sum}, la fórmula produce ${definition.sum(n)} y el término enésimo es ${definition.term(n)}.` },
    ],
    table: { columns: ['n', 'Término aₙ', 'Suma directa', 'Fórmula Sₙ'], rows },
    note: 'Demostración guiada para estas tres identidades. La tabla ilustra casos particulares; la demostración general está en el caso base y el paso inductivo.',
  };
}
