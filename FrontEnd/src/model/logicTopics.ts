export interface LogicTopic {
  id: string;
  title: string;
  description: string;
  lessons: Array<{ title: string; explanation: string; example: string }>;
  exercise: { question: string; options: string[]; answer: number; explanation: string };
}

export const logicTopics: LogicTopic[] = [
  {
    id: 'proposiciones', title: 'Proposiciones',
    description: 'Representa enunciados y construye proposiciones con conectores lógicos.',
    lessons: [
      { title: '1.1. Proposición compuesta', explanation: 'Una proposición es un enunciado al que se puede asignar verdadero o falso. Las compuestas combinan proposiciones simples mediante negación (¬), conjunción (∧) o disyunción inclusiva (∨). Primero se evalúan paréntesis, después ¬, ∧, ∨, → y ↔.', example: 'A: «Estudio»; B: «Practico». A ∧ B significa «Estudio y practico» y solo es verdadera cuando ambas lo son.' },
      { title: '1.2. Proposición condicional', explanation: 'A → B se lee «Si A, entonces B». A es el antecedente y B el consecuente. Solo es falsa cuando A es verdadera y B es falsa. Su recíproca B → A no es equivalente en general; su contrapositiva ¬B → ¬A sí lo es.', example: 'Con A = 1 y B = 0, A → B = 0. Con A = 0 y B = 1, A → B = 1. A → B equivale a ¬A ∨ B.' },
      { title: '1.3. Proposición bicondicional', explanation: 'A ↔ B expresa «A si y solo si B». Es verdadera cuando las dos proposiciones tienen el mismo valor; equivale a (A → B) ∧ (B → A).', example: 'Si A = 0 y B = 0, A ↔ B = 1. Si A = 1 y B = 0, el bicondicional es falso.' },
    ],
    exercise: { question: '¿En qué caso es falsa A → B?', options: ['A = 1, B = 1', 'A = 1, B = 0', 'A = 0, B = 0'], answer: 1, explanation: 'El condicional solo es falso cuando su antecedente es verdadero y su consecuente es falso.' },
  },
  {
    id: 'inferencia', title: 'Inferencia lógica',
    description: 'Construye conclusiones justificadas y comprueba reglas de inferencia.',
    lessons: [
      { title: '2.1. Reglas de inferencia y demostración', explanation: 'Una inferencia obtiene una conclusión a partir de premisas. Modus ponens: A → B, A ⊢ B. Modus tollens: A → B, ¬B ⊢ ¬A. Silogismo hipotético: A → B, B → C ⊢ A → C. Silogismo disyuntivo: A ∨ B, ¬A ⊢ B. Simplificación: A ∧ B ⊢ A. Adición: A ⊢ A ∨ B.', example: 'Demostración: 1) A → B (premisa); 2) B → C (premisa); 3) A (premisa); 4) B (modus ponens, 1 y 3); 5) C (modus ponens, 2 y 4). Comprueba estas premisas y C en la herramienta.' },
    ],
    exercise: { question: 'De A → B y ¬B, ¿qué se concluye por modus tollens?', options: ['A', '¬A', 'B'], answer: 1, explanation: 'Si A fuera verdadera, B tendría que ser verdadera. Como B es falsa, A debe ser falsa.' },
  },
  {
    id: 'equivalencia', title: 'Equivalencia lógica',
    description: 'Compara expresiones y verifica las leyes que permiten transformarlas.',
    lessons: [
      { title: '3. Equivalencia lógica', explanation: 'E1 ≡ E2 significa que ambas expresiones tienen el mismo valor para toda asignación de sus variables. No basta que coincidan en un ejemplo. La equivalencia se comprueba mostrando que E1 ↔ E2 es una tautología.', example: 'De Morgan: ¬(A ∧ B) ≡ ¬A ∨ ¬B y ¬(A ∨ B) ≡ ¬A ∧ ¬B. Doble negación: ¬¬A ≡ A. Implicación: A → B ≡ ¬A ∨ B.' },
    ],
    exercise: { question: '¿Cuál es equivalente a ¬(A ∨ B)?', options: ['¬A ∨ ¬B', '¬A ∧ ¬B', 'A ∧ B'], answer: 1, explanation: 'La ley de De Morgan cambia la disyunción por conjunción y niega cada proposición.' },
  },
  {
    id: 'tablas', title: 'Tablas de verdad',
    description: 'Enumera todas las asignaciones y clasifica el resultado de una expresión.',
    lessons: [
      { title: '4.1. Tautología', explanation: 'Una tautología es verdadera en todas las filas de su tabla de verdad. Con v variables hay 2ᵛ asignaciones, por lo que la columna final debe contener 2ᵛ unos.', example: 'A ∨ ¬A es una tautología: tanto si A vale 0 como si vale 1, el resultado vale 1.' },
      { title: '4.2. Contradicción', explanation: 'Una contradicción es falsa en todas las asignaciones. No existe una interpretación que la satisfaga.', example: 'A ∧ ¬A siempre vale 0. Una proposición y su negación no pueden ser verdaderas a la vez.' },
      { title: '4.3. Contingencia', explanation: 'Una contingencia es verdadera en algunas filas y falsa en otras. Su valor depende de la asignación de las variables.', example: 'A → B es una contingencia: en tres de sus cuatro asignaciones vale 1 y en A = 1, B = 0 vale 0.' },
    ],
    exercise: { question: '¿Cómo se clasifica A ∧ ¬A?', options: ['Tautología', 'Contingencia', 'Contradicción'], answer: 2, explanation: 'Su tabla solo contiene ceros; no hay una asignación que haga verdadera la expresión.' },
  },
  {
    id: 'validez', title: 'Verdad y validez',
    description: 'Distingue la verdad de los enunciados de la validez de los argumentos.',
    lessons: [
      { title: '5.1. Argumentos válidos y no válidos', explanation: 'Un argumento es válido si no hay una asignación con todas sus premisas verdaderas y su conclusión falsa. La verdad corresponde a proposiciones en una interpretación; la validez corresponde a la relación entre premisas y conclusión. Un argumento sólido es válido y tiene premisas verdaderas.', example: 'A → B; A; por tanto B es válido. A → B; B; por tanto A no es válido: A = 0, B = 1 es un contraejemplo.' },
      { title: '5.2. Valores de verdad y términos de enlace', explanation: '1 representa verdadero y 0 representa falso. ¬ invierte el valor; ∧ exige ambos verdaderos; ∨ exige al menos uno; → excluye el caso 1 → 0; ↔ exige igualdad de valores.', example: 'Con A = 1 y B = 0: ¬A = 0, A ∧ B = 0, A ∨ B = 1, A → B = 0 y A ↔ B = 0.' },
      { title: '5.3. Diagramas de valores de verdad', explanation: 'Organiza las asignaciones en una tabla y sigue las columnas de cada premisa hasta la conclusión. Marca las filas donde todas las premisas son verdaderas. Una fila marcada con conclusión falsa es un contraejemplo. El esquema de abajo resume este recorrido.', example: 'Para A → B; B ⊢ A, la fila A = 0, B = 1 produce P1 = 1, P2 = 1, conclusión = 0. La herramienta señala esa fila con Contraejemplo = 1.' },
      { title: '5.4. Conclusiones no válidas', explanation: 'Afirmar el consecuente (A → B, B ⊢ A) y negar el antecedente (A → B, ¬A ⊢ ¬B) son errores frecuentes. Una conclusión que parece razonable puede no seguirse de las premisas.', example: '«Si llueve, el piso se moja; el piso está mojado; entonces llovió» no es válido: pudo mojarse por otra causa.' },
      { title: '5.5. Demostración condicional', explanation: 'Para demostrar A → B bajo unas premisas Γ, supone temporalmente A y deduce B. Después descarga la suposición y concluye A → B. La herramienta permite verificar primero Γ, A ⊢ B y después Γ ⊢ A → B.', example: 'De A → B y B → C: supone A; deduce B por modus ponens y después C. Descarga A y concluye A → C.' },
      { title: '5.6. Consistencia', explanation: 'Un conjunto de premisas es consistente si existe al menos una asignación que las hace verdaderas simultáneamente. Premisas inconsistentes no tienen modelos y hacen válido por vacuidad cualquier argumento en lógica clásica; eso no garantiza solidez.', example: 'A ∨ B y ¬A son consistentes con A = 0, B = 1. A y ¬A son inconsistentes.' },
      { title: '5.7. Predicados y valores de verdad', explanation: 'Un predicado P(x) adquiere un valor de verdad al sustituir x dentro de un dominio. ∀x P(x) exige que todos sus elementos satisfagan P; ∃x P(x) exige al menos un testigo. Siempre hay que especificar el dominio.', example: 'En D = {−2, −1, 0, 1, 2}, P(x): x² > 0 no vale para todo x porque falla en 0, pero sí existe un x que lo cumple, por ejemplo 1.' },
    ],
    exercise: { question: '¿Qué basta para demostrar que un argumento no es válido?', options: ['Una fila con premisas verdaderas y conclusión falsa', 'Una fila con conclusión verdadera', 'Una premisa falsa en alguna fila'], answer: 0, explanation: 'Un único contraejemplo refuta la validez. Las filas con alguna premisa falsa no la refutan.' },
  },
  {
    id: 'induccion', title: 'Inducción matemática',
    description: 'Estudia el caso base, la hipótesis inductiva y el paso al siguiente natural.',
    lessons: [
      { title: '6.1. Proceso de inducción matemática', explanation: 'Para demostrar P(n) para todos los enteros n ≥ n₀: prueba P(n₀), supone P(k) para un k arbitrario con k ≥ n₀ y demuestra P(k + 1). El caso base inicia la cadena y el paso inductivo permite continuarla.', example: 'Para 1 + … + n = n(n + 1)/2: en n = 1, ambos lados valen 1; suponiendo Sₖ = k(k + 1)/2, se demuestra Sₖ₊₁ añadiendo k + 1.' },
      { title: '6.2. Demostraciones por inducción', explanation: 'La hipótesis inductiva es una suposición local para demostrar el siguiente caso. Comprobar muchos valores no sustituye el paso general. La herramienta desarrolla demostraciones algebraicas para sumas de naturales, impares y cuadrados.', example: 'Para los impares: P(1) es 1 = 1². Si Sₖ = k², entonces Sₖ₊₁ = k² + 2(k + 1) − 1 = (k + 1)². Por inducción, Sₙ = n².' },
      { title: '6.3. Obtención de sumatoria y enésimo', explanation: 'El término enésimo aₙ describe un elemento de la sucesión; Sₙ = Σᵢ₌₁ⁿ aᵢ suma los primeros n elementos. Son cantidades distintas. Para naturales aₙ = n; para impares aₙ = 2n − 1; para cuadrados aₙ = n².', example: 'En los impares, a₅ = 2(5) − 1 = 9, mientras que S₅ = 1 + 3 + 5 + 7 + 9 = 25. En los cuadrados, Sₙ = n(n + 1)(2n + 1)/6.' },
    ],
    exercise: { question: '¿Qué debe demostrarse después de suponer P(k)?', options: ['P(k − 1)', 'P(k + 1)', 'Solo P(1) otra vez'], answer: 1, explanation: 'El paso inductivo demuestra P(k + 1) usando P(k), para un k arbitrario dentro del dominio.' },
  },
  {
    id: 'algebra', title: 'Álgebra booleana',
    description: 'Transforma expresiones, reduce circuitos y aplica mapas de Karnaugh.',
    lessons: [
      { title: '7.1. Expresiones booleanas', explanation: 'El álgebra booleana trabaja con 0 y 1. El producto corresponde a AND (∧), la suma lógica a OR (∨) y el complemento a NOT (¬). OR es inclusiva; la notación de suma lógica no representa suma aritmética.', example: 'AB + A¬B se escribe (A ∧ B) ∨ (A ∧ ¬B) en la herramienta. Se admite 0 y 1 como constantes.' },
      { title: '7.2. Propiedades de las expresiones booleanas', explanation: 'Identidad: A ∨ 0 ≡ A y A ∧ 1 ≡ A. Dominación: A ∨ 1 ≡ 1 y A ∧ 0 ≡ 0. Idempotencia: A ∨ A ≡ A. Complemento: A ∨ ¬A ≡ 1 y A ∧ ¬A ≡ 0. También se cumplen conmutatividad, asociatividad y distributividad.', example: 'Distributividad: A ∧ (B ∨ C) ≡ (A ∧ B) ∨ (A ∧ C). Absorción: A ∨ (A ∧ B) ≡ A.' },
      { title: '7.3. Optimización de expresiones booleanas', explanation: 'Simplificar busca una forma equivalente con menos términos o literales. La herramienta obtiene una suma de productos y muestra los grupos usados. La equivalencia funcional no implica que exista un único circuito óptimo para cualquier tecnología.', example: '(A ∧ B) ∨ (A ∧ ¬B) se reduce a A, lo que elimina la dependencia de B.' },
      { title: '7.3.1. Simplificación mediante teoremas del álgebra de Boole', explanation: 'Aplica identidades en cada transformación y conserva la equivalencia. Factorizar, usar complemento y aplicar identidad permite justificar una reducción paso a paso.', example: '(A ∧ B) ∨ (A ∧ ¬B) ≡ A ∧ (B ∨ ¬B) [distributividad] ≡ A ∧ 1 [complemento] ≡ A [identidad].' },
      { title: '7.3.2. Simplificación usando mapas de Karnaugh', explanation: 'Ordena filas y columnas en código Gray para que celdas adyacentes difieran en un bit. Agrupa unos en potencias de dos (1, 2, 4, 8, 16), incluidos los bordes opuestos. Un grupo elimina las variables que cambian dentro de él. Los grupos pueden superponerse.', example: 'En F = (A ∧ B) ∨ (A ∧ ¬B), los minterminos 10 y 11 son adyacentes. B cambia y A permanece en 1, por lo que el grupo produce A.' },
      { title: '7.4. Compuertas lógicas', explanation: 'NOT invierte una entrada, AND requiere todas verdaderas y OR al menos una. NAND y NOR niegan AND y OR. XOR es verdadera con entradas distintas y XNOR con entradas iguales. La galería interactiva permite alternar entradas y consultar sus tablas.', example: 'Una alarma con dos sensores puede usar OR para activarse con cualquiera de ellos. Una autorización que exige tarjeta y clave usa AND.' },
      { title: '7.5. Aplicaciones', explanation: 'Las expresiones booleanas modelan permisos, alarmas, filtros y control digital. Define entradas, expresa las condiciones, verifica la tabla y simplifica antes de implementar el circuito.', example: 'Acceso = (A ∧ B) ∨ (A ∧ C): A indica cuenta activa, B tarjeta válida y C clave válida. Por distributividad, Acceso ≡ A ∧ (B ∨ C).' },
    ],
    exercise: { question: '¿A qué se simplifica (A ∧ B) ∨ (A ∧ ¬B)?', options: ['B', 'A', 'A ∧ B'], answer: 1, explanation: 'Factoriza A: A ∧ (B ∨ ¬B) = A ∧ 1 = A.' },
  },
];
