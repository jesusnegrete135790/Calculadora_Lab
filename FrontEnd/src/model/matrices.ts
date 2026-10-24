import type { CalculationResult, MatrixStep, Step } from './types';

export type MatrixMethod = 'matriz-gauss-jordan' | 'matriz-reduccion' | 'matriz-inversa' | 'matriz-suma';
export interface MatrixInput {
  method: MatrixMethod;
  matrix: number[][];
  secondMatrix?: number[][];
  tolerance: number;
  inverseOnly?: boolean;
}
export const matrixNames: Record<MatrixMethod, string> = {
  'matriz-reduccion': 'Gauss (eliminación)',
  'matriz-gauss-jordan': 'Gauss-Jordan',
  'matriz-inversa': 'Matriz inversa',
  'matriz-suma': 'Adición de matrices A + B',
};

const rounded = (value: number) => Object.is(value, -0) ? 0 : Number(value.toPrecision(12));
const format = (value: number) => String(rounded(value));
const snapshot = (matrix: number[][]) => matrix.map((row) => row.map(rounded));

export function parseMatrixCells(cells: string[][]): number[][] {
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  return cells.map((row, i) => row.map((cell, j) => {
    const parts = cell.trim().split('/').map((part) => part.trim());
    if (!parts.length || parts.length > 2 || parts.some((part) => !decimal.test(part) || !Number.isFinite(Number(part))) || (parts.length === 2 && Number(parts[1]) === 0)) throw new Error(`Revisa el elemento de la fila ${i + 1}, columna ${j + 1}. Usa un número o una fracción como 1/2.`);
    const value = Number(parts[0]) / (parts.length === 2 ? Number(parts[1]) : 1);
    if (!Number.isFinite(value) || Math.abs(value) > 1e9) throw new Error(`El elemento (${i + 1}, ${j + 1}) debe ser finito y tener magnitud máxima 1 000 000 000.`);
    return value;
  }));
}

function validateMatrix(matrix: number[][], augmented: boolean) {
  if (!Array.isArray(matrix) || matrix.length < 1 || matrix.length > 6 || !matrix.every(Array.isArray)) throw new Error('Usa entre 1 y 6 filas.');
  const width = matrix[0].length;
  if (width < (augmented ? 2 : 1) || width > (augmented ? 7 : 6) || matrix.some((row) => row.length !== width)) throw new Error(augmented ? 'La matriz aumentada requiere entre 1 y 6 variables y una última columna b.' : 'Usa entre 1 y 6 columnas y la misma cantidad en cada fila.');
  if (matrix.some((row) => row.some((value) => typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e9))) throw new Error('Todos los elementos deben ser números finitos de magnitud máxima 1 000 000 000.');
}

export function calculateMatrix(input: MatrixInput): CalculationResult {
  if (!Object.hasOwn(matrixNames, input.method)) throw new Error('Selecciona un método de matrices válido.');
  if (!Number.isFinite(input.tolerance) || input.tolerance < 1e-14 || input.tolerance > 1e-4) throw new Error('La tolerancia debe estar entre 1e-14 y 1e-4.');
  const sum = input.method === 'matriz-suma';
  if (input.inverseOnly !== undefined && input.method !== 'matriz-inversa') throw new Error('La opción de inversa corresponde al método Matriz inversa.');
  validateMatrix(input.matrix, !sum && !input.inverseOnly);
  if (input.method === 'matriz-inversa') return inverseMatrix(input);
  if (sum) {
    if (!input.secondMatrix) throw new Error('Ingresa la matriz B.');
    validateMatrix(input.secondMatrix, false);
    const second = input.secondMatrix;
    if (second.length !== input.matrix.length || second[0].length !== input.matrix[0].length) throw new Error('A y B deben tener las mismas dimensiones.');
    const result = input.matrix.map((row, i) => row.map((value, j) => rounded(value + second[i][j])));
    return {
      title: 'Suma de matrices', value: 'C = A + B', subtitle: `Matriz de ${result.length} × ${result[0].length}`,
      steps: [
        { title: 'Compatibilidad', detail: `A y B tienen ${result.length} filas y ${result[0].length} columnas.` },
        { title: 'Suma elemento a elemento', detail: 'cᵢⱼ = aᵢⱼ + bᵢⱼ. Se suman los elementos que ocupan la misma posición.' },
        ...input.matrix.flatMap((row, i) => row.map((value, j) => ({ title: `Elemento c${i + 1},${j + 1}`, detail: `${format(value)} + (${format(second[i][j])}) = ${format(result[i][j])}.` }))),
      ],
      matrixSteps: [{ title: 'Matriz A', matrix: snapshot(input.matrix) }, { title: 'Matriz B', matrix: snapshot(second) }, { title: 'Resultado A + B', matrix: result }],
      table: { columns: result[0].map((_, j) => `Columna ${j + 1}`), rows: result },
      note: 'La suma de matrices se calcula elemento a elemento y requiere las mismas dimensiones en A y B.',
    };
  }

  const matrix = input.matrix.map((row) => [...row]);
  const variables = matrix[0].length - 1;
  const steps: Step[] = [{ title: 'Sistema original', detail: `Se representa un sistema de ${matrix.length} ecuaciones y ${variables} incógnitas mediante la matriz aumentada [A | b].` }];
  const matrixSteps: MatrixStep[] = [{ title: 'Matriz aumentada inicial [A | b]', matrix: snapshot(matrix), augmented: true }];
  function record(title: string, detail: string) {
    if (matrix.some((row) => row.some((value) => !Number.isFinite(value)))) throw new Error('Las operaciones exceden la precisión numérica. Revisa la escala de los coeficientes.');
    steps.push({ title, detail });
    matrixSteps.push({ title: detail, matrix: snapshot(matrix), augmented: true });
  }

  // Scale each equation before selecting pivots so uniform changes of units
  // do not turn a nonsingular system into a numerically zero matrix.
  matrix.forEach((row, i) => {
    const scale = Math.max(...row.slice(0, variables).map(Math.abs)) || Math.abs(row[variables]) || 1;
    if (scale !== 1) {
      matrix[i] = row.map((value) => value / scale);
      record('Escalamiento de ecuación', `F${i + 1} ← F${i + 1} / (${format(scale)}).`);
    }
  });
  const rhsScale = Math.max(1, ...matrix.map((row) => Math.abs(row[variables])));
  const pivots: Array<{ row: number; column: number }> = [];
  let nextRow = 0;
  for (let column = 0; column < variables && nextRow < matrix.length; column++) {
    let pivotRow = nextRow;
    for (let i = nextRow + 1; i < matrix.length; i++) if (Math.abs(matrix[i][column]) > Math.abs(matrix[pivotRow][column])) pivotRow = i;
    if (Math.abs(matrix[pivotRow][column]) <= input.tolerance) continue;
    if (pivotRow !== nextRow) {
      [matrix[nextRow], matrix[pivotRow]] = [matrix[pivotRow], matrix[nextRow]];
      record('Intercambio de filas', `F${nextRow + 1} ↔ F${pivotRow + 1} para utilizar el pivote de mayor magnitud.`);
    }
    const divisor = matrix[nextRow][column];
    if (divisor !== 1) {
      matrix[nextRow] = matrix[nextRow].map((value) => value / divisor);
      matrix[nextRow][column] = 1;
      record('Normalización del pivote', `F${nextRow + 1} ← F${nextRow + 1} / (${format(divisor)}).`);
    }
    for (let i = input.method === 'matriz-gauss-jordan' ? 0 : nextRow + 1; i < matrix.length; i++) {
      if (i === nextRow || matrix[i][column] === 0) continue;
      const factor = matrix[i][column] / matrix[nextRow][column];
      matrix[i] = matrix[i].map((value, j) => value - factor * matrix[nextRow][j]);
      matrix[i][column] = 0;
      record('Eliminación', `F${i + 1} ← F${i + 1} + (${format(-factor)}) F${nextRow + 1}.`);
    }
    pivots.push({ row: nextRow, column });
    nextRow++;
  }
  const inconsistent = matrix.find((row) => row.slice(0, variables).every((value) => Math.abs(value) <= input.tolerance) && Math.abs(row[variables]) > input.tolerance * rhsScale);
  const rank = pivots.length;
  steps.push({ title: 'Rangos', detail: `rango(A) = ${rank}; rango([A | b]) = ${rank + Number(Boolean(inconsistent))}; incógnitas = ${variables}.` });
  const table = { columns: [...Array.from({ length: variables }, (_, j) => `x${j + 1}`), 'b'], rows: snapshot(matrix) };
  const note = `Pivoteo parcial con escalamiento de ecuaciones y tolerancia ${input.tolerance}. La clasificación es numérica y depende de esta tolerancia; los resultados se muestran con hasta 12 cifras significativas.`;
  if (inconsistent) return {
    title: 'Sistema incompatible', value: 'Sin solución', subtitle: 'rango(A) < rango([A | b])',
    steps: [...steps, { title: 'Contradicción', detail: `Una fila representa 0 = ${format(inconsistent[variables])}, que no puede cumplirse.` }],
    matrixSteps, table, note,
  };

  const free = Array.from({ length: variables }, (_, column) => column).filter((column) => !pivots.some((pivot) => pivot.column === column));
  // Each vector is an affine expression: constant + coefficients of t1, t2, ….
  const solution = Array.from({ length: variables }, () => Array(free.length + 1).fill(0) as number[]);
  free.forEach((column, index) => { solution[column][index + 1] = 1; });
  for (let index = pivots.length - 1; index >= 0; index--) {
    const { row, column } = pivots[index];
    const expression = Array(free.length + 1).fill(0) as number[];
    expression[0] = matrix[row][variables];
    for (let j = column + 1; j < variables; j++) for (let term = 0; term < expression.length; term++) expression[term] -= matrix[row][j] * solution[j][term];
    solution[column] = expression.map((value) => value / matrix[row][column]);
    if (solution[column].some((value) => !Number.isFinite(value))) throw new Error('La solución excede la precisión numérica. Revisa los coeficientes.');
  }
  function affine(values: number[]) {
    let result = values[0] === 0 ? '' : format(values[0]);
    values.slice(1).forEach((coefficient, index) => {
      if (Math.abs(coefficient) <= input.tolerance) return;
      const term = `${Math.abs(coefficient) === 1 ? '' : format(Math.abs(coefficient)) + '·'}t${index + 1}`;
      result += result ? ` ${coefficient < 0 ? '−' : '+'} ${term}` : `${coefficient < 0 ? '−' : ''}${term}`;
    });
    return result || '0';
  }
  const expressions = solution.map((values, j) => `x${j + 1} = ${affine(values)}`);
  steps.push({ title: free.length ? 'Variables libres' : 'Clasificación', detail: free.length ? `${free.map((column, index) => `x${column + 1} = t${index + 1}`).join('; ')}. Los parámetros pueden tomar cualquier valor real.` : 'El rango coincide con el número de incógnitas: existe una solución única.' });
  solution.forEach((values, j) => steps.push({ title: input.method === 'matriz-gauss-jordan' ? `Lectura de x${j + 1}` : `Sustitución regresiva: x${j + 1}`, detail: `x${j + 1} = ${affine(values)}.` }));
  if (!free.length) {
    const residual = Math.max(...input.matrix.map((row) => Math.abs(row.slice(0, variables).reduce((total, value, j) => total + value * solution[j][0], 0) - row[variables])));
    steps.push({ title: 'Comprobación en el sistema original', detail: `Máximo residuo absoluto |Ax − b| = ${format(residual)}.` });
  }
  return {
    title: free.length ? 'Sistema compatible indeterminado' : 'Solución única',
    value: free.length ? 'Infinitas soluciones' : expressions.join('; '),
    subtitle: free.length ? expressions.join('; ') : matrixNames[input.method],
    steps, matrixSteps, table, note,
  };
}

function inverseMatrix(input: MatrixInput): CalculationResult {
  const size = input.matrix.length;
  if (input.matrix[0].length !== size + (input.inverseOnly ? 0 : 1)) throw new Error('La inversa requiere una matriz A cuadrada. Para resolver Ax = b, agrega la columna b.');
  const a = input.matrix.map((row) => row.slice(0, size));
  const b = input.inverseOnly ? null : input.matrix.map((row) => row[size]);
  const identity = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => Number(i === j)));
  const work = a.map((row, i) => [...row, ...identity[i]]);
  const steps: Step[] = [
    { title: 'Matriz cuadrada', detail: `A tiene orden ${size}. La inversa existe si A tiene rango completo.` },
    { title: 'Ampliación con la identidad', detail: 'Se aplican las mismas operaciones elementales a ambos bloques: [A | I] → [I | A⁻¹].' },
  ];
  const matrixSteps: MatrixStep[] = [{ title: 'Matriz ampliada [A | I]', matrix: snapshot(work), splitAt: size }];
  function record(title: string, detail: string) {
    if (work.some((row) => row.some((value) => !Number.isFinite(value)))) throw new Error('El cálculo de la inversa excede la precisión numérica. Revisa la escala de A.');
    steps.push({ title, detail });
    matrixSteps.push({ title: detail, matrix: snapshot(work), splitAt: size });
  }
  const note = `Inversa calculada mediante Gauss-Jordan sobre [A | I], con escalamiento y pivoteo parcial; tolerancia ${input.tolerance}. La clasificación es numérica y los valores se muestran con hasta 12 cifras significativas.`;
  work.forEach((row, i) => {
    const scale = Math.max(...a[i].map(Math.abs)) || 1;
    if (scale !== 1) {
      work[i] = row.map((value) => value / scale);
      record('Escalamiento', `F${i + 1} ← F${i + 1} / (${format(scale)}), en ambos bloques.`);
    }
  });
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let i = column + 1; i < size; i++) if (Math.abs(work[i][column]) > Math.abs(work[pivot][column])) pivot = i;
    if (Math.abs(work[pivot][column]) <= input.tolerance) return {
      title: 'Matriz singular según la tolerancia', value: 'A no tiene inversa',
      subtitle: b ? 'El método de la inversa no es aplicable a este sistema.' : 'No se puede transformar el bloque A en la identidad.',
      steps: [...steps, { title: 'Pivote insuficiente', detail: `No se encuentra un pivote mayor que la tolerancia en la columna ${column + 1}. No se obtiene A⁻¹.` }, { title: 'Conclusión', detail: b ? 'Usa Gauss (eliminación) o Gauss-Jordan para distinguir entre un sistema incompatible y uno con infinitas soluciones. Una matriz singular no implica por sí sola que el sistema no tenga solución.' : 'La matriz no es invertible con la tolerancia elegida.' }],
      matrixSteps,
      table: { columns: [...a[0].map((_, j) => `Columna ${j + 1}`), ...(b ? ['b'] : [])], rows: snapshot(input.matrix) },
      note: `${note} La tabla conserva la matriz de entrada.`,
    };
    if (pivot !== column) {
      [work[column], work[pivot]] = [work[pivot], work[column]];
      record('Intercambio de filas', `F${column + 1} ↔ F${pivot + 1}.`);
    }
    const divisor = work[column][column];
    if (divisor !== 1) {
      work[column] = work[column].map((value) => value / divisor);
      work[column][column] = 1;
      record('Normalización del pivote', `F${column + 1} ← F${column + 1} / (${format(divisor)}).`);
    }
    for (let i = 0; i < size; i++) {
      if (i === column || work[i][column] === 0) continue;
      const factor = work[i][column];
      work[i] = work[i].map((value, j) => value - factor * work[column][j]);
      work[i][column] = 0;
      record('Eliminación en ambos bloques', `F${i + 1} ← F${i + 1} + (${format(-factor)}) F${column + 1}.`);
    }
  }
  const inverse = work.map((row) => row.slice(size));
  const inverseError = Math.max(...a.flatMap((row, i) => identity.map((_, j) => Math.abs(row.reduce((sum, value, k) => sum + value * inverse[k][j], 0) - identity[i][j]))));
  if (!Number.isFinite(inverseError)) throw new Error('No se pudo comprobar la inversa con precisión finita.');
  steps.push({ title: 'Lectura de la inversa', detail: 'El bloque izquierdo es I y el bloque derecho contiene A⁻¹.' }, { title: 'Comprobación A·A⁻¹', detail: `Máxima diferencia absoluta respecto a I: ${format(inverseError)}.` });
  matrixSteps.push({ title: 'Matriz inversa A⁻¹', matrix: snapshot(inverse) });
  if (!b) return {
    title: 'Matriz inversa', value: 'A⁻¹ calculada', subtitle: `Matriz de ${size} × ${size}`,
    steps, matrixSteps, table: { columns: inverse[0].map((_, j) => `Columna ${j + 1}`), rows: snapshot(inverse) }, note,
  };
  const solution = inverse.map((row) => row.reduce((sum, value, j) => sum + value * b[j], 0));
  const residual = Math.max(...a.map((row, i) => Math.abs(row.reduce((sum, value, j) => sum + value * solution[j], 0) - b[i])));
  if (solution.some((value) => !Number.isFinite(value)) || !Number.isFinite(residual)) throw new Error('La solución por inversa excede la precisión numérica.');
  steps.push({ title: 'Despeje del sistema', detail: 'Ax = b ⇒ A⁻¹Ax = A⁻¹b ⇒ x = A⁻¹b.' });
  solution.forEach((value, i) => steps.push({ title: `Producto: x${i + 1}`, detail: `x${i + 1} = ${inverse[i].map((coefficient, j) => `(${format(coefficient)})·(${format(b[j])})`).join(' + ')} = ${format(value)}.` }));
  steps.push({ title: 'Comprobación en el sistema original', detail: `Máximo residuo absoluto |Ax − b| = ${format(residual)}.` });
  matrixSteps.push({ title: 'Vector b', matrix: b.map((value) => [rounded(value)]) }, { title: 'Solución x = A⁻¹b', matrix: solution.map((value) => [rounded(value)]) });
  return {
    title: 'Solución por matriz inversa', value: solution.map((value, i) => `x${i + 1} = ${format(value)}`).join('; '), subtitle: 'x = A⁻¹b',
    steps, matrixSteps, table: { columns: [...a[0].map((_, j) => `x${j + 1}`), 'b'], rows: identity.map((row, i) => [...row, rounded(solution[i])]) }, note,
  };
}
