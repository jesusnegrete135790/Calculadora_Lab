# Análisis previo del frontend

> Este documento registra el estado anterior a la implementación y analiza el primer esquema. El frontend actual está descrito en [`FrontEnd/README.md`](FrontEnd/README.md), y los cambios del SQL actualizado en [`FrontEnd/docs/INTEGRACION_SQL_2026-09-24.md`](FrontEnd/docs/INTEGRACION_SQL_2026-09-24.md).

## Fuentes y estado actual

- `Bosquejo.docx` describe un laboratorio de apoyo para cuatro asignaturas de matemáticas. Su objetivo es mostrar resultados, procedimientos y explicaciones, no solo respuestas.
- `BD Script.txt` crea ocho tablas: `Usuarios`, `AsistenteIA`, `LogicaMatematica`, `MatematicasFinancieras`, `TablaAmortizacion`, `MatematicasComputacionales`, `IteracionesMetodos` y `ProbabilidadEstadistica`.
- El diagrama de base de datos adjunto añade cuatro tablas de evaluación: `Examenes`, `BancoPreguntas`, `ResultadosExamen` y `RespuestasUsuario`. Estas **no existen en el script SQL recibido**.
- El repositorio contenía `unam-login` (carpeta llamada ahora `FrontEnd`), una aplicación Vite con React 18 en **JavaScript/JSX**. En ese momento solo implementaba el login y una pantalla posterior vacía. No había TypeScript, rutas, servicios API, pantallas de módulos ni backend.

Los documentos se usaron como fuentes de requisitos. No se tomaron sus textos como instrucciones para modificar el entorno.

## Alcance funcional descrito

| Módulo | Entradas y acciones del alumno | Salidas que debe presentar el frontend | Soporte explícito en SQL |
| --- | --- | --- | --- |
| Lógica matemática | Expresión booleana, tipo de ejercicio; tabla de verdad, simplificación y mapa de Karnaugh | Tabla de verdad, pasos con propiedades aplicadas, agrupaciones y circuito final | Expresión, tipo, resultado en texto y fecha. No hay estructura para pasos, tabla, mapa o circuito. |
| Matemáticas financieras | Capital, tasa, tiempo, tipo de operación; interés, capitalización, descuentos y amortización | Comparaciones, fórmulas, desarrollo, gráficas y tabla de pagos | Operación y resultado general; filas de amortización. No hay campos para variantes y parámetros específicos de cada cálculo. |
| Matemáticas computacionales | Función, método, puntos o parámetros de ecuación diferencial | Raíz e iteraciones; polinomio interpolado; tablas comparativas de Euler, Euler mejorado y Runge–Kutta | Método, función, raíz e iteraciones genéricas. No modela puntos, coeficientes ni estados de ecuaciones diferenciales. |
| Probabilidad y estadística | Lista de datos o parámetros de distribuciones | Frecuencias, gráficas, medidas descriptivas, desarrollo de binomial/Poisson y curva normal sombreada | Datos en texto, media, desviación y resultado. Faltan campos estructurados para otras medidas y distribuciones. |
| Asistente de dudas | Pregunta y módulo relacionado | Respuesta contextual y, si aplica, historial | Pregunta, respuesta, módulo, usuario y fecha. No existe contrato para solicitar respuestas ni para vincularlas a un cálculo concreto. |
| Evaluaciones | El diagrama sugiere exámenes, preguntas, respuestas y calificaciones | Pantallas de examen y resultados, **si se confirma el alcance** | Solo aparecen en la imagen; faltan en el script y no están detallados en el bosquejo. |

## Diferencias y riesgos de integración

1. **Acceso:** `Usuarios` identifica a la persona por `Correo`; el login actual exige un número de cuenta de nueve dígitos y usa la contraseña fija `unam1234`. Ninguno de esos datos de acceso de prueba corresponde al SQL. La contraseña en `VARCHAR(50)` también necesita que el equipo de backend defina almacenamiento seguro y autenticación; el frontend no debe verificar contraseñas localmente.
2. **API no definida:** no se recibió servidor, especificación OpenAPI, rutas, formatos de respuesta, mecanismo de sesión ni reglas de error. Las tablas SQL no equivalen a un contrato HTTP. El frontend puede preparar tipos y componentes, pero la integración real requiere ese contrato.
3. **Resultados explicativos:** el objetivo central pide procedimientos paso a paso. Los campos `Resultado` o `ResultadoFinal` no definen cómo representar pasos, fórmulas, series, tablas, gráficas o mensajes del asistente. Conviene acordar respuestas estructuradas para cada operación, aunque la persistencia interna sea distinta.
4. **Evaluaciones:** hay que decidir si las cuatro tablas adicionales del diagrama son parte de la primera versión y obtener su SQL definitivo. El bosquejo habla de evaluar el aprendizaje de forma general, pero no especifica reglas de examen, intentos, temporizador ni calificación.
5. **Identidad visual:** el proyecto usa colores y logotipos UNAM, pero el bosquejo solo menciona la licenciatura en Informática. Es necesario confirmar el uso institucional antes de tratar esos recursos como identidad final.
6. **Enlace del escudo:** `Login.jsx` usa `/public/...png`; en Vite, los archivos dentro de `public` se sirven desde `/...png`. La ruta actual puede fallar.

## Propuesta para la aplicación React + TypeScript

### Pantallas y navegación

1. Acceso con correo y contraseña, registro y recuperación solo si el backend confirma esos flujos.
2. Inicio con cuatro tarjetas de asignaturas, acceso al historial y estado de sesión.
3. Una página por asignatura con selector de herramienta, formulario propio del método, validaciones, panel de resultado y vista de procedimiento.
4. Componentes compartidos para fórmulas, pasos numerados, tablas descargables, gráficas, errores, cargas y estados vacíos.
5. Asistente de dudas accesible desde cada herramienta y con contexto del cálculo actual cuando el API lo permita.
6. Evaluaciones y resultados en una fase separada una vez reconciliados el diagrama y el script.

### Estructura técnica sugerida

```text
src/
  app/              navegación, sesión y composición de páginas
  features/
    auth/
    logica/
    finanzas/
    computacionales/
    estadistica/
    asistente/
    evaluaciones/     cuando se confirme
  components/       campos, tablas, gráficas y resultados reutilizables
  api/              cliente HTTP, tipos DTO y manejo uniforme de errores
  styles/           diseño responsivo y tokens visuales
```

La migración debe cambiar `*.jsx` por `*.tsx`, agregar `typescript` y sus tipos de React, habilitar comprobación estricta y reemplazar la autenticación simulada por una capa de API cuando exista el backend. Se recomienda mantener las operaciones matemáticas complejas en el servicio responsable del cálculo y utilizar el frontend para capturar datos, visualizar pasos y explicar resultados; cualquier cálculo local debe ser explícito y verificable.

## Contrato mínimo que necesita el frontend

- Autenticación: inicio/cierre de sesión, usuario actual, rol, caducidad y respuesta a credenciales incorrectas.
- Catálogo de operaciones: identificador, nombre, descripción, campos requeridos, unidades y límites válidos para cada método.
- Ejecución de cálculo: datos de entrada, resultado tipado, unidades, pasos, tablas y series para gráficas, advertencias y errores por campo.
- Historial: listado paginado por usuario/módulo y detalle completo de un cálculo.
- Asistente: pregunta, módulo, contexto opcional del cálculo, respuesta y política de historial.
- Evaluaciones, si se incluyen: exámenes disponibles, preguntas, envío de respuestas, calificación y revisión.

## Orden recomendado de implementación

1. Confirmar la fuente definitiva del esquema, el identificador de acceso y el alcance de evaluaciones.
2. Acordar los formatos de API y ejemplos reales de resultados explicativos para al menos una operación de cada módulo.
3. Migrar el proyecto a React + TypeScript y construir navegación, sesión y componentes comunes.
4. Implementar las cuatro páginas de asignatura por herramientas, con formularios y visualización de resultados.
5. Integrar el asistente y, si procede, las evaluaciones; probar las pantallas con respuestas reales del backend.

## Decisiones pendientes del equipo

- ¿El inicio de sesión será con correo, número de cuenta o un proveedor institucional?
- ¿Cuáles operaciones y métodos entran en la primera entrega? El bosquejo describe muchos métodos, pero no los prioriza.
- ¿Se adoptan las cuatro tablas de exámenes del diagrama? Si es así, falta el script completo y la especificación funcional.
- ¿Quién define y expone el formato de pasos, fórmulas y datos de gráficas de cada cálculo?
- ¿Qué identidad institucional y recursos gráficos están autorizados para la interfaz?
