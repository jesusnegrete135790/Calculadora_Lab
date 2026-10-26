# Laboratorio Matemático

Frontend en React + TypeScript para practicar matemáticas de la licenciatura en Informática. Se construyó a partir de `Bosquejo.docx` y las versiones recibidas del esquema de base de datos; la versión más reciente revisada es `SQLQuery1.sql` del 24 de septiembre de 2026.

La interfaz usa únicamente **Varela Round**. La fuente se distribuye dentro del frontend mediante `@fontsource/varela-round`, incluidos formularios, reportes, diagramas y etiquetas de las gráficas.

## Ejecutar

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Abre `http://localhost:5173` e inicia sesión con una cuenta activa registrada en SQL Server. El acceso requiere el backend en `http://localhost:8000`. El formulario permite iniciar sesión o registrar una cuenta únicamente con nombre, correo y contraseña (mínimo 10 caracteres). El registro se guarda mediante la API con rol Usuario.

Si falta `VITE_API_URL`, el formulario muestra un error de configuración y no permite acceder. Copia `.env.example` a `.env.local` y reinicia `npm run dev`. Vite no carga `.env.example` automáticamente. Consulta [la guía del backend](../backend/README.md) para configurar la API y SQL Server.

Para verificar:

```bash
npm test
npm run build
```

## Arquitectura MVC

```text
src/
  model/       Tipos, reglas y cálculos matemáticos, sesión y cliente HTTP
  view/        Páginas, formularios, tablas, gráficas ECharts y estilos React
    components/
    modules/
    pages/
  controller/  Hooks que coordinan sesión, formularios, cálculos y asistente
  main.tsx     Entrada y enrutador
```

Las vistas recogen los datos y presentan resultados. Los controladores validan el flujo, llaman al modelo y administran estados de error y carga. Los modelos matemáticos no dependen de React y tienen pruebas unitarias.

## Herramientas incluidas

| Módulo | Herramientas disponibles con una cuenta |
| --- | --- |
| Lógica matemática | Siete temas con teoría, ejemplos y ejercicios: proposiciones, inferencia, equivalencia, tablas de verdad, verdad y validez, inducción y álgebra booleana. Herramientas de equivalencia, argumentos, consistencia, predicados, sumatorias, simplificación, Karnaugh y compuertas |
| Matemáticas financieras | Interés simple/compuesto, valor actual, descuento comercial/racional/en serie, tasas equivalentes y amortización con cambios de tasa, abonos recurrentes o extraordinarios por periodo; curvas adicionales y superficies 3D de sensibilidad a plazo y tasa |
| Matemáticas computacionales | Matrices: Gauss (eliminación), Gauss-Jordan, matriz inversa y suma A + B; bisección, Newton–Raphson, interpolación de Lagrange/Newton, Euler, Euler mejorado, Runge–Kutta 4 y superficies 3D |
| Probabilidad y estadística | Medidas descriptivas, tabla de frecuencias absolutas, relativas y acumuladas, binomial, Poisson y normal acumulada |
| Evaluaciones | Cinco preguntas de opción múltiple por área, calificación y revisión de intentos guardados por cuenta |

Cada resultado muestra pasos, tablas cuando corresponda, gráficas 2D/3D y exportación CSV de las tablas. Las curvas, barras y áreas usan **Apache ECharts 6** con renderizado SVG; las superficies interactivas usan **ECharts-GL 2** (WebGL). El circuito y mapa lógico conservan su representación SVG como diagramas. Ambas versiones están fijadas en `package.json` y las bibliotecas de gráficas se cargan cuando aparece un resultado.

Para generar un informe completo, pulsa **Imprimir / PDF** en el resultado y elige **Guardar como PDF** en el cuadro de impresión del navegador. El informe incluye resultado, procedimiento, tablas, gráficas y circuito o mapa lógico cuando existan. Las superficies 3D se capturan desde el ángulo visible como imagen para la impresión.

Las gráficas 3D se usan para funciones con dos variables independientes. Una función de una sola variable conserva su gráfica 2D; una EDO también puede mostrar la superficie de su campo de pendientes junto a la curva de solución. El parser de funciones admite `x`, `y`, números, `+ - * / ^`, paréntesis, `sin`, `cos`, `tan`, `exp`, `ln`, `log`, `sqrt` y `abs`.

La interfaz incorpora el escudo de la UNAM y una página de **Derechos de autor** disponible desde el pie de página del acceso y del laboratorio. El equipo ya verificó el permiso de uso de la identidad institucional.

### Contenido y práctica de lógica matemática

El selector presenta los siete bloques del contenido temático y todos sus subtemas numerados. Cada bloque incluye explicaciones desplegables, ejemplos resueltos y una pregunta de autoevaluación con retroalimentación. Estas preguntas son práctica local; las evaluaciones calificadas por cuenta continúan en **Evaluaciones**.

- **Proposiciones y tablas de verdad:** conectores, condicional, bicondicional y clasificación como tautología, contradicción o contingencia.
- **Inferencia y equivalencia:** reglas y ejemplos de demostración, comparación exhaustiva de expresiones y contraejemplos cuando no son equivalentes.
- **Verdad y validez:** argumentos, conclusiones no válidas, demostración condicional y diagrama de valores; el selector de herramienta permite comprobar validez, consistencia o predicados con cuantificadores.
- **Inducción:** caso base, hipótesis, paso inductivo y conclusión para sumas de naturales, impares y cuadrados; calcula el término enésimo y la suma de los primeros n términos.
- **Álgebra booleana:** propiedades, teoremas, optimización, mapas de Karnaugh, compuertas interactivas y aplicaciones.

Las herramientas proposicionales admiten hasta cuatro variables distintas en total y de una a cuatro premisas. Cada expresión admite 255 caracteres; se aceptan letras individuales, constantes `0`/`1` y conectores `¬ ∧ ∨ → ↔` o sus alternativas `! & | -> <->`. Los predicados se evalúan en un dominio finito de 1 a 16 números: sus resultados no generalizan a dominios infinitos. Las tres demostraciones por inducción son guiadas; la tabla numérica acepta `1 ≤ n ≤ 1000` y no sustituye la demostración algebraica.

Todas estas herramientas requieren una cuenta y guardan el historial mediante la API. La API admite las entradas estructuradas nuevas y conserva la compatibilidad con la entrada de expresión original; no requiere una migración SQL. Los resultados conservan impresión y descarga de tablas CSV.

Para regenerar los casos de integración de la API con los algoritmos actuales del frontend, ejecuta `node scripts/generate-logic-fixtures.cjs` desde esta carpeta y después las pruebas del backend.

### Matrices y sistemas lineales

La sección **Matrices y sistemas lineales** acepta de una a seis ecuaciones e incógnitas (incluidos sistemas rectangulares). Se introduce la matriz aumentada [A | b] con números, decimales o fracciones como 1/2. El procedimiento muestra escalamiento de ecuaciones, pivoteo parcial, operaciones por filas y sustitución regresiva cuando corresponde. Detecta solución única, infinitas soluciones con parámetros y sistemas incompatibles.

**Gauss (eliminación)** obtiene la forma escalonada y termina con sustitución regresiva; **Gauss-Jordan** elimina arriba y abajo de cada pivote para obtener la forma escalonada reducida. **Matriz inversa** transforma [A | I] en [I | A⁻¹] y permite calcular únicamente A⁻¹ o resolver un sistema cuadrado mediante x = A⁻¹b. La herramienta verifica A·A⁻¹ ≈ I y, al resolver, Ax ≈ b. Si A es singular según la tolerancia, informa que el método no es aplicable, sin confundirlo con un sistema sin solución. **Adición de matrices A + B** se conserva como operación separada, elemento a elemento, para matrices de las mismas dimensiones de hasta 6 × 6.

Se usa aritmética de punto flotante: elementos de magnitud máxima 1e9, tolerancia entre 1e-14 y 1e-4 (predeterminada 1e-10) y hasta doce cifras significativas en la presentación. Los rangos dependen de la tolerancia. El editor conserva la columna b al cambiar el número de incógnitas. Los resultados y sus matrices de procedimiento se guardan en el historial y permiten impresión y CSV. No se requiere migración SQL.

Para regenerar los casos de API de matrices: `node scripts/generate-matrix-fixtures.cjs` desde FrontEnd.

## Integración con FastAPI y SQL Server

El backend completo está en `../backend`. Configura `VITE_API_URL=http://localhost:8000/api` copiando `.env.example` a `.env.local` y sigue [su guía](../backend/README.md).

El formulario permite iniciar sesión con una cuenta existente o registrar una nueva en la BD mediante `/auth/register`. El servidor asigna el rol Usuario y los administradores gestionan roles y estado mediante el gestor de usuarios. El JWT se conserva en sessionStorage, se verifica contra `/auth/me` antes de mostrar el laboratorio y se elimina al salir, caducar o fallar su verificación. Los algoritmos muestran su resultado y luego lo envían a la API. Un mensaje indica guardado correcto o el error; **Historial** recupera exclusivamente los cálculos de la cuenta, incluidos procedimientos, gráficos, tablas, Karnaugh y circuitos. **Evaluaciones** obtiene preguntas del backend, envía respuestas para calificarlas en el servidor y recupera intentos anteriores de la cuenta.

Las calculadoras no conceden acceso anónimo. Las sesiones antiguas de demostración se ignoran y los datos locales antiguos no se leen ni se importan a una cuenta. El asistente requiere login y configuración del proveedor en el backend; sus consultas anteriores se muestran en la misma página. Las evaluaciones requieren una cuenta porque sus preguntas, respuestas y calificaciones se guardan en SQL Server.

Se añadieron metadatos para persistencia (`metrics`, `numericRows`, `polynomial`) y un flujo de evaluaciones conectado a la API, manteniendo los cálculos matemáticos existentes.

La documentación del SQL anterior en `docs/INTEGRACION_SQL_2026-09-24.md` es histórica. El contrato actual y los cambios están en [el diagnóstico de integración](../docs/DIAGNOSTICO_INTEGRACION.md).

## Decisiones de cálculo

- Tasas de finanzas: porcentaje **anual**; el número de periodos indica capitalizaciones o pagos por año.
- Descriptiva: varianza y desviación **poblacionales**; curtosis reportada como exceso de curtosis.
- Distribución normal: `P(X ≤ x)` mediante aproximación numérica de la función error.
- Los algoritmos calculan en el navegador dentro de una sesión autenticada; la API guarda los resultados en SQL Server.

Consulta [el análisis previo](../ANALISIS_FRONTEND.md) para ver las diferencias entre las fuentes entregadas.
