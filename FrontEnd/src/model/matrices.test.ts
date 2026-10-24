import { describe, expect, it } from 'vitest';
import { calculateMatrix, parseMatrixCells, type MatrixMethod } from './matrices';

const methods: MatrixMethod[] = ['matriz-gauss-jordan', 'matriz-reduccion'];
const tolerance = 1e-10;
const solve = (method: MatrixMethod, matrix: number[][]) => calculateMatrix({ method, matrix, tolerance });
const solutionOf = (value: string) => value.split('; ').map((part) => Number(part.split(' = ')[1]));

describe.each(methods)('sistemas por %s', (method) => {
  it('resuelve un sistema de tres incógnitas sin modificar la entrada', () => {
    const matrix = [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]];
    const before = structuredClone(matrix);
    const result = solve(method, matrix);
    expect(result.title).toBe('Solución única');
    expect(solutionOf(result.value)).toEqual([2, 3, -1]);
    expect(matrix).toEqual(before);
    expect(result.matrixSteps![0].matrix).toEqual(before);
    expect(result.steps.find((step) => step.title.startsWith('Comprobación'))).toBeDefined();
  });

  it('intercambia filas cuando el primer pivote es cero', () => {
    const result = solve(method, [[0, 2, 4], [1, 1, 3]]);
    expect(solutionOf(result.value)).toEqual([1, 2]);
    expect(result.steps.some((step) => step.title === 'Intercambio de filas')).toBe(true);
  });

  it('distingue dependencia y contradicción', () => {
    const dependent = solve(method, [[1, 2, 3], [2, 4, 6]]);
    expect(dependent.value).toBe('Infinitas soluciones');
    expect(dependent.subtitle).toBe('x1 = 3 − 2·t1; x2 = t1');
    const impossible = solve(method, [[1, 2, 3], [2, 4, 7]]);
    expect(impossible.value).toBe('Sin solución');
    expect(impossible.steps.at(-1)!.title).toBe('Contradicción');
  });

  it('resuelve sistemas rectangulares y una incógnita', () => {
    expect(solutionOf(solve(method, [[2, 8]]).value)).toEqual([4]);
    expect(solutionOf(solve(method, [[1, 0, 2], [0, 1, 3], [1, 1, 5]]).value)).toEqual([2, 3]);
    expect(solve(method, [[1, 1, 1, 6]]).value).toBe('Infinitas soluciones');
    expect(solve(method, [[0, 1, 2], [0, 2, 4]]).subtitle).toBe('x1 = t1; x2 = 2');
  });

  it('clasifica sistemas con coeficientes nulos', () => {
    expect(solve(method, [[0, 0, 0], [0, 0, 0]]).subtitle).toBe('x1 = t1; x2 = t2');
    expect(solve(method, [[0, 0, 1]]).value).toBe('Sin solución');
    expect(solve(method, [[0, 0, 1e-12]]).value).toBe('Sin solución');
  });

  it('conserva la solución cuando las ecuaciones usan escalas muy diferentes', () => {
    const result = solve(method, [[1e-12, 0, 2e-12], [0, 1e9, 3e9 / 4]]);
    const values = solutionOf(result.value);
    expect(values[0]).toBeCloseTo(2, 10);
    expect(values[1]).toBeCloseTo(0.75, 10);
  });

  it('resuelve sistemas de uno a seis tamaños comprobando Ax = b', () => {
    for (let size = 1; size <= 6; size++) for (let sample = 0; sample < 8; sample++) {
      const expected = Array.from({ length: size }, (_, j) => ((sample + j * 3) % 7) - 3);
      const a = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => i === j ? 20 + sample : ((i * 3 + j + sample) % 5) - 2));
      const matrix = a.map((row) => [...row, row.reduce((sum, value, j) => sum + value * expected[j], 0)]);
      const result = solve(method, matrix);
      const actual = solutionOf(result.value);
      expect(actual).toHaveLength(size);
      actual.forEach((value, j) => expect(value).toBeCloseTo(expected[j], 9));
      matrix.forEach((row) => expect(row.slice(0, size).reduce((sum, value, j) => sum + value * actual[j], 0)).toBeCloseTo(row[size], 7));
      expect(result.steps.length).toBeLessThanOrEqual(100);
      expect(result.matrixSteps!.length).toBeLessThanOrEqual(100);
    }
  });
});

describe('matriz inversa', () => {
  it('calcula A⁻¹ sin necesitar un vector b', () => {
    const a = [[4, 7], [2, 6]];
    const result = calculateMatrix({ method: 'matriz-inversa', matrix: a, tolerance, inverseOnly: true });
    expect(result.value).toBe('A⁻¹ calculada');
    expect(result.table!.rows).toEqual([[0.6, -0.7], [-0.2, 0.4]]);
    expect(result.matrixSteps![0]).toMatchObject({ splitAt: 2, matrix: [[4, 7, 1, 0], [2, 6, 0, 1]] });
    expect(a).toEqual([[4, 7], [2, 6]]);
  });

  it('resuelve Ax = b usando la inversa y comprueba el residuo', () => {
    const result = solve('matriz-inversa', [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]]);
    expect(solutionOf(result.value)).toEqual([2, 3, -1]);
    expect(result.steps.some((step) => step.detail.includes('x = A⁻¹b'))).toBe(true);
    expect(result.matrixSteps!.some((step) => step.title === 'Matriz inversa A⁻¹')).toBe(true);
    expect(result.table!.rows).toEqual([[1, 0, 0, 2], [0, 1, 0, 3], [0, 0, 1, -1]]);
  });

  it('maneja pivotes inicialmente nulos y matrices de orden uno', () => {
    expect(solutionOf(solve('matriz-inversa', [[0, 2, 4], [1, 1, 3]]).value)).toEqual([1, 2]);
    expect(calculateMatrix({ method: 'matriz-inversa', matrix: [[4]], tolerance, inverseOnly: true }).table!.rows).toEqual([[0.25]]);
    expect(solutionOf(solve('matriz-inversa', [[4, 8]]).value)).toEqual([2]);
  });

  it('no confunde matriz singular con sistema sin solución', () => {
    for (const matrix of [[[1, 2, 3], [2, 4, 6]], [[1, 2, 3], [2, 4, 7]]]) {
      const result = solve('matriz-inversa', matrix);
      expect(result.value).toBe('A no tiene inversa');
      expect(result.steps.at(-1)!.detail).toContain('no implica');
      expect(result.table!.rows).toEqual(matrix);
    }
    expect(calculateMatrix({ method: 'matriz-inversa', matrix: [[0]], tolerance, inverseOnly: true }).value).toBe('A no tiene inversa');
  });

  it('rechaza matrices no cuadradas y la opción de inversa en otros métodos', () => {
    expect(() => solve('matriz-inversa', [[1, 2, 3]])).toThrow('cuadrada');
    expect(() => calculateMatrix({ method: 'matriz-inversa', matrix: [[1, 2], [3, 4], [5, 6]], tolerance, inverseOnly: true })).toThrow('cuadrada');
    expect(() => calculateMatrix({ method: 'matriz-reduccion', matrix: [[1, 2]], tolerance, inverseOnly: true })).toThrow('inversa');
  });

  it('verifica A·A⁻¹ = I y Ax = b para órdenes de uno a seis', () => {
    for (let size = 1; size <= 6; size++) for (let sample = 0; sample < 5; sample++) {
      const a = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => i === j ? 20 + sample : ((i * 3 + j + sample) % 5) - 2));
      const result = calculateMatrix({ method: 'matriz-inversa', matrix: a, tolerance, inverseOnly: true });
      const inverse = result.table!.rows as number[][];
      a.forEach((row, i) => a.forEach((_, j) => expect(row.reduce((sum, value, k) => sum + value * inverse[k][j], 0)).toBeCloseTo(Number(i === j), 9)));
      const expected = a.map((_, j) => j - 2);
      const augmented = a.map((row) => [...row, row.reduce((sum, value, j) => sum + value * expected[j], 0)]);
      const solution = solutionOf(solve('matriz-inversa', augmented).value);
      solution.forEach((value, j) => expect(value).toBeCloseTo(expected[j], 9));
      expect(result.steps.length).toBeLessThanOrEqual(100);
    }
  });
});

describe('suma y validación de matrices', () => {
  it('suma elemento a elemento con dimensiones rectangulares', () => {
    const result = calculateMatrix({ method: 'matriz-suma', matrix: [[1, -2, 0.5], [3, 4, 5]], secondMatrix: [[-1, 3, 0.5], [7, 6, -5]], tolerance });
    expect(result.table!.rows).toEqual([[0, 1, 1], [10, 10, 0]]);
    expect(result.matrixSteps!.at(-1)!.matrix).toEqual(result.table!.rows);
  });
  it('rechaza suma con dimensiones incompatibles', () => {
    expect(() => calculateMatrix({ method: 'matriz-suma', matrix: [[1, 2]], secondMatrix: [[3]], tolerance })).toThrow('mismas dimensiones');
    expect(() => calculateMatrix({ method: 'matriz-suma', matrix: [[1]], tolerance })).toThrow('matriz B');
  });
  it.each([[], [[1]], [[1, 2], [3]], [[NaN, 1]], [[Infinity, 2]], [[1e10, 1]], Array.from({ length: 7 }, () => [1, 2])].map((matrix) => ({ matrix })))('rechaza matrices aumentadas inválidas: $matrix', ({ matrix }) => {
    expect(() => solve('matriz-gauss-jordan', matrix)).toThrow();
  });
  it.each([0, 1e-15, 1, NaN])('valida la tolerancia %s', (value) => {
    expect(() => calculateMatrix({ method: 'matriz-reduccion', matrix: [[1, 2]], tolerance: value })).toThrow('tolerancia');
  });
  it('interpreta fracciones, negativos, decimales y notación científica', () => {
    expect(parseMatrixCells([['1/2', '-3 / 4', '.5', '1e-3']])).toEqual([[0.5, -0.75, 0.5, 0.001]]);
    for (const value of ['', '1/0', '1/2/3', '1abc', 'Infinity', 'NaN', '0x10', '1e309', '1 / 1e309']) expect(() => parseMatrixCells([[value]])).toThrow();
  });
});
