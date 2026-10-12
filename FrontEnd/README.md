# Laboratorio Matemático

Frontend en React + TypeScript para practicar matemáticas de la licenciatura en Informática. Se construyó a partir de `Bosquejo.docx` y las versiones recibidas del esquema de base de datos; la versión más reciente revisada es `SQLQuery1.sql` del 24 de septiembre de 2026.

La interfaz usa únicamente **Varela Round**. La fuente se distribuye dentro del frontend mediante `@fontsource/varela-round`, incluidos formularios, reportes, diagramas y etiquetas de las gráficas.

## Ejecutar

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Abre `http://localhost:5173`. Con `.env.local` configurado se muestran **Iniciar sesión** y **Crear una cuenta**; requieren el backend en `http://localhost:8000`. También puedes seleccionar **Entrar en modo demostración** para probar las calculadoras sin backend. El historial de demostración se guarda solo en el navegador (máximo 50 cálculos).

Si solo aparece el botón de demostración, falta `VITE_API_URL`: copia `.env.example` a `.env.local` y reinicia `npm run dev`. Vite no carga `.env.example` automáticamente. Consulta [la guía del backend](../backend/README.md) para configurar la API y SQL Server.

Para verificar:

```bash
npm test
npm run build
```

## Arquitectura MVC

```text
src/
  model/       Tipos, reglas y cálculos matemáticos, historial local y cliente HTTP
  view/        Páginas, formularios, tablas, gráficas ECharts y estilos React
    components/
    modules/
    pages/
  controller/  Hooks que coordinan sesión, formularios, cálculos y asistente
  main.tsx     Entrada y enrutador
```

Las vistas recogen los datos y presentan resultados. Los controladores validan el flujo, llaman al modelo y administran estados de error y carga. Los modelos matemáticos no dependen de React y tienen pruebas unitarias.

## Herramientas incluidas

| Módulo | Herramientas que funcionan en modo demostración |
| --- | --- |
| Lógica matemática | Tabla de verdad, simplificación por minterminos, mapa de Karnaugh, circuito SVG simplificado y galería interactiva de compuertas AND, OR, NOT, NAND, NOR, XOR y XNOR (hasta 4 variables) |
| Matemáticas financieras | Interés simple/compuesto, valor actual, descuento comercial/racional/en serie, tasas equivalentes y amortización con cambios de tasa, abonos recurrentes o extraordinarios por periodo; curvas adicionales y superficies 3D de sensibilidad a plazo y tasa |
| Matemáticas computacionales | Bisección, Newton–Raphson, interpolación de Lagrange/Newton, Euler, Euler mejorado, Runge–Kutta 4 y gráficas 3D de funciones de dos variables; campo 3D de pendientes para EDO cuando el dominio lo permite |
| Probabilidad y estadística | Medidas descriptivas, tabla de frecuencias absolutas, relativas y acumuladas, binomial, Poisson y normal acumulada |
| Evaluaciones | Cinco preguntas de opción múltiple por área, calificación y revisión de intentos guardados por cuenta |

Cada resultado muestra pasos, tablas cuando corresponda, gráficas 2D/3D y exportación CSV de las tablas. Las curvas, barras y áreas usan **Apache ECharts 6** con renderizado SVG; las superficies interactivas usan **ECharts-GL 2** (WebGL). El circuito y mapa lógico conservan su representación SVG como diagramas. Ambas versiones están fijadas en `package.json` y las bibliotecas de gráficas se cargan cuando aparece un resultado.

Para generar un informe completo, pulsa **Imprimir / PDF** en el resultado y elige **Guardar como PDF** en el cuadro de impresión del navegador. El informe incluye resultado, procedimiento, tablas, gráficas y circuito o mapa lógico cuando existan. Las superficies 3D se capturan desde el ángulo visible como imagen para la impresión.

Las gráficas 3D se usan para funciones con dos variables independientes. Una función de una sola variable conserva su gráfica 2D; una EDO también puede mostrar la superficie de su campo de pendientes junto a la curva de solución. El parser de funciones admite `x`, `y`, números, `+ - * / ^`, paréntesis, `sin`, `cos`, `tan`, `exp`, `ln`, `log`, `sqrt` y `abs`.

La interfaz incorpora el escudo de la UNAM y una página de **Derechos de autor** disponible desde el acceso y el menú. El equipo ya verificó el permiso de uso de la identidad institucional.

## Integración con FastAPI y SQL Server

El backend completo está en `../backend`. Configura `VITE_API_URL=http://localhost:8000/api` copiando `.env.example` a `.env.local` y sigue [su guía](../backend/README.md).

El formulario permite crear una cuenta e iniciar sesión. El JWT se conserva en sessionStorage, se verifica contra `/auth/me` y se elimina al salir o caducar. En modo de cuenta, los algoritmos existentes muestran su resultado y luego lo envían a la API. Un mensaje indica guardado correcto o el error; **Historial** recupera exclusivamente los cálculos de la cuenta, incluidos procedimientos, gráficos, tablas, Karnaugh y circuitos. **Evaluaciones** obtiene preguntas del backend, envía respuestas para calificarlas en el servidor y recupera intentos anteriores de la cuenta.

En demostración, las calculadoras siguen funcionando sin API y conservan el historial local. Ese historial no se importa automáticamente a una cuenta. El asistente requiere login y configuración del proveedor en el backend; sus consultas anteriores se muestran en la misma página. Las evaluaciones requieren una cuenta porque sus preguntas, respuestas y calificaciones se guardan en SQL Server.

Se añadieron metadatos para persistencia (`metrics`, `numericRows`, `polynomial`) y un flujo de evaluaciones conectado a la API, manteniendo los cálculos matemáticos existentes.

La documentación del SQL anterior en `docs/INTEGRACION_SQL_2026-09-24.md` es histórica. El contrato actual y los cambios están en [el diagnóstico de integración](../docs/DIAGNOSTICO_INTEGRACION.md).

## Decisiones de cálculo

- Tasas de finanzas: porcentaje **anual**; el número de periodos indica capitalizaciones o pagos por año.
- Descriptiva: varianza y desviación **poblacionales**; curtosis reportada como exceso de curtosis.
- Distribución normal: `P(X ≤ x)` mediante aproximación numérica de la función error.
- La aplicación de demostración calcula en el navegador y no persiste en SQL.

Consulta [el análisis previo](../ANALISIS_FRONTEND.md) para ver las diferencias entre las fuentes entregadas.
