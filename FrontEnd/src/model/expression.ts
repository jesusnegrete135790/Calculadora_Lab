type Token = { type: 'number' | 'name' | 'operator' | 'paren'; value: string };
type Node = { kind: 'number'; value: number } | { kind: 'variable'; value: string } | { kind: 'unary'; op: string; right: Node } | { kind: 'binary'; op: string; left: Node; right: Node } | { kind: 'function'; name: string; argument: Node };

const functions: Record<string, (value: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp,
  ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs,
};

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const input = source.replace(/\s+/g, '').replace(/,/g, '.');
  let index = 0;
  while (index < input.length) {
    const rest = input.slice(index);
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)/.exec(rest);
    const name = /^[a-zA-Z]+/.exec(rest);
    if (number) { tokens.push({ type: 'number', value: number[0] }); index += number[0].length; }
    else if (name) { tokens.push({ type: 'name', value: name[0].toLowerCase() }); index += name[0].length; }
    else if ('+-*/^'.includes(rest[0])) { tokens.push({ type: 'operator', value: rest[0] }); index++; }
    else if ('()'.includes(rest[0])) { tokens.push({ type: 'paren', value: rest[0] }); index++; }
    else throw new Error(`Símbolo no permitido: ${rest[0]}`);
  }
  return tokens;
}

export function compileExpression(source: string, variables: string[] = ['x']): (scope: Record<string, number>) => number {
  const tokens = tokenize(source);
  if (!tokens.length) throw new Error('Escribe una función.');
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function primary(): Node {
    const token = take();
    if (!token) throw new Error('La expresión está incompleta.');
    if (token.type === 'number') return { kind: 'number', value: Number(token.value) };
    if (token.value === '(') {
      const node = parse(0);
      if (take()?.value !== ')') throw new Error('Falta cerrar un paréntesis.');
      return node;
    }
    if (token.value === '+' || token.value === '-') return { kind: 'unary', op: token.value, right: parse(3) };
    if (token.type === 'name') {
      if (token.value === 'pi') return { kind: 'number', value: Math.PI };
      if (token.value === 'e') return { kind: 'number', value: Math.E };
      if (variables.includes(token.value)) return { kind: 'variable', value: token.value };
      if (functions[token.value]) {
        if (take()?.value !== '(') throw new Error(`Usa ${token.value}(...) para llamar la función.`);
        const argument = parse(0);
        if (take()?.value !== ')') throw new Error('Falta cerrar un paréntesis.');
        return { kind: 'function', name: token.value, argument };
      }
      throw new Error(`Nombre no permitido: ${token.value}`);
    }
    throw new Error('Revisa la sintaxis de la función.');
  }

  function parse(minPower: number): Node {
    let left = primary();
    const powers: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
    while (peek()?.type === 'operator' && powers[peek().value] >= minPower) {
      const op = take().value;
      const power = powers[op];
      const right = parse(power + (op === '^' ? 0 : 1));
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  const ast = parse(0);
  if (position !== tokens.length) throw new Error('La expresión contiene símbolos fuera de lugar.');
  function evaluate(node: Node, scope: Record<string, number>): number {
    switch (node.kind) {
      case 'number': return node.value;
      case 'variable': return scope[node.value];
      case 'unary': return node.op === '-' ? -evaluate(node.right, scope) : evaluate(node.right, scope);
      case 'function': return functions[node.name](evaluate(node.argument, scope));
      case 'binary': {
        const left = evaluate(node.left, scope);
        const right = evaluate(node.right, scope);
        switch (node.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          default: return left ** right;
        }
      }
    }
  }
  return (scope) => {
    const result = evaluate(ast, scope);
    if (!Number.isFinite(result)) throw new Error('La función no está definida para los valores indicados.');
    return result;
  };
}
