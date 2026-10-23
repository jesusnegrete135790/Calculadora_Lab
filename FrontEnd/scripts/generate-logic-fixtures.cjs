// Regenerate API fixtures using the actual frontend algorithms.
// Run from FrontEnd: node scripts/generate-logic-fixtures.cjs
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  filename,
);

const { calculateLogic } = require('../src/model/logic.ts');
const inputs = [
  { method: 'truth', expression: 'A' },
  { method: 'truth', expression: '1' },
  { method: 'truth', expression: '0' },
  { method: 'equivalence', left: '!(A&B)', right: '!A|!B' },
  { method: 'equivalence', left: 'A&B', right: 'C&D' },
  { method: 'argument', premises: 'A -> B; B -> C; C -> D; A', conclusion: 'D' },
  { method: 'argument', premises: 'A -> B; B', conclusion: 'A' },
  { method: 'consistency', premises: 'A; !A' },
  { method: 'predicate', domain: '-2, -1, 0, 1, 2', expression: 'x^2', relation: '>', target: 0 },
  ...['naturales', 'impares', 'cuadrados'].map((series) => ({ method: 'induction', series, n: 5 })),
];
const cases = inputs.map((input) => ({ method: input.method, input, result: calculateLogic(input) }));
fs.writeFileSync(path.join(__dirname, '../../backend/tests/logic_fixtures.json'), JSON.stringify(cases, null, 2) + '\n');
process.stdout.write(`${cases.length} casos de lógica generados.\n`);
