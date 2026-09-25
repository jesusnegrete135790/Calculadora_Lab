import type { CalculationResult } from './types';

type Node = { kind: 'var'; name: string } | { kind: 'not'; child: Node } | { kind: 'binary'; op: string; left: Node; right: Node };

function normalize(source: string): string[] {
  const input = source.replace(/\s+/g, '').replace(/<->|↔/g, '↔').replace(/->|→/g, '→').replace(/[!~]/g, '¬').replace(/&&|&/g, '∧').replace(/\|\||\|/g, '∨');
  const tokens = input.match(/[A-Za-z]|[()¬∧∨→↔]/g) ?? [];
  if (tokens.join('') !== input) throw new Error('Usa letras individuales y los operadores ¬, ∧, ∨, →, ↔.');
  return tokens;
}

function parseLogic(source: string): { tree: Node; variables: string[] } {
  const tokens = normalize(source);
  if (!tokens.length) throw new Error('Escribe una expresión lógica.');
  let position = 0;
  const precedence: Record<string, number> = { '↔': 1, '→': 2, '∨': 3, '∧': 4 };
  function primary(): Node {
    const token = tokens[position++];
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
    const bits = index.toString(2).padStart(variables.length, '0');
    const values = Object.fromEntries(variables.map((name, at) => [name, bits[at] === '1']));
    const result = evaluate(tree, values);
    if (result) minterms.push(index);
    rows.push([...bits.split('').map((bit) => Number(bit)), Number(result)]);
  }
  const reduction = simplify(variables, minterms);
  const rowBits = variables.length <= 2 ? Math.max(0, variables.length - 1) : 2;
  const columnBits = variables.length - rowBits;
  const gray = (size: number) => Array.from({ length: 2 ** size }, (_, index) => (index ^ (index >> 1)).toString(2).padStart(size, '0'));
  const rowLabels = gray(rowBits);
  const columnLabels = gray(columnBits);
  const cells = rowLabels.flatMap((row) => columnLabels.map((column) => {
    const minterm = Number.parseInt(row + column, 2);
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
      { title: 'Variables', detail: variables.join(', ') },
      { title: 'Evaluación', detail: `Se calcularon las ${rows.length} combinaciones posibles y los minterminos ${minterms.length ? minterms.join(', ') : 'ninguno'}.` },
      { title: 'Agrupación', detail: reduction.groups.length ? reduction.groups.map((group) => `${group.bits} cubre ${group.covers.join(', ')}`).join('; ') : 'No hay combinaciones verdaderas.' },
    ],
    note: 'El mapa y el esquema representan una suma de productos para hasta cuatro variables.',
  };
}
