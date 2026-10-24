// Run from FrontEnd: node scripts/generate-matrix-fixtures.cjs
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { calculateMatrix } = require('../src/model/matrices.ts');
const cases = ['matriz-gauss-jordan', 'matriz-reduccion', 'matriz-inversa'].flatMap((method) => [
  { method, matrix: [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]], tolerance: 1e-10 },
  { method, matrix: [[1, 2, 3], [2, 4, 6]], tolerance: 1e-10 },
  { method, matrix: [[1, 2, 3], [2, 4, 7]], tolerance: 1e-10 },
  { method, matrix: [[0, 2, 4], [1, 1, 3]], tolerance: 1e-10 },
]);
for (const matrix of [[[4, 7], [2, 6]], [[1, 2], [2, 4]], [[4]], Array.from({length: 6}, (_, i) => Array.from({length: 6}, (_, j) => i === j ? 10 : 1))]) {
  cases.push({ method: 'matriz-inversa', matrix, inverseOnly: true, tolerance: 1e-10 });
}
cases.push({ method: 'matriz-suma', matrix: [[1, 2], [3, 4]], secondMatrix: [[5, 6], [7, 8]], tolerance: 1e-10 });
const fixtures = cases.map((input) => ({ method: input.method, input, result: calculateMatrix(input) }));
fs.writeFileSync(path.join(__dirname, '../../backend/tests/matrix_fixtures.json'), '[\n' + fixtures.map((fixture) => JSON.stringify(fixture)).join(',\n') + '\n]\n');
process.stdout.write(`${fixtures.length} casos de matrices generados.\n`);
