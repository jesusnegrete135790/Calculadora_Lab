# Laboratorio Matemático

Frontend en React + TypeScript para practicar matemáticas de la licenciatura en Informática. Se construyó a partir de `Bosquejo.docx`, `BD Script.txt` y el diagrama de base de datos suministrados.

## Ejecutar

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` y selecciona **Entrar en modo demostración**. No hace falta un backend para probar las calculadoras. El historial se guarda solo en el navegador (máximo 50 cálculos).

Para verificar:

```bash
npm test
npm run build
```

## Arquitectura MVC

```text
src/
  model/       Tipos, reglas y cálculos matemáticos, historial local y cliente HTTP
  view/        Páginas, formularios, tablas, gráfica y estilos React
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
| Lógica matemática | Tabla de verdad, simplificación por minterminos, mapa de Karnaugh y esquema de compuertas (hasta 4 variables) |
| Matemáticas financieras | Interés simple/compuesto, valor actual, descuento comercial/racional/en serie, tasas equivalentes y amortización con abonos o cambios de tasa |
| Matemáticas computacionales | Bisección, Newton–Raphson, interpolación de Lagrange/Newton, Euler, Euler mejorado y Runge–Kutta 4 |
| Probabilidad y estadística | Medidas descriptivas, binomial, Poisson y normal acumulada |

Cada resultado muestra pasos, tablas cuando corresponda, gráficas sencillas y exportación CSV de las tablas. El parser de funciones admite `x`, `y`, números, `+ - * / ^`, paréntesis, `sin`, `cos`, `tan`, `exp`, `ln`, `log`, `sqrt` y `abs`.

## Integración pendiente con el backend

El script SQL no define endpoints HTTP ni estructura para los procedimientos detallados. El cliente HTTP en `src/model/api.ts` espera, **como contrato provisional**:

```text
POST {VITE_API_BASE_URL}/auth/login
  entrada:  { "correo": "...", "contrasena": "..." }
  salida:   { "token": "...", "usuario": { "nombre": "...", "correo": "..." } }

POST {VITE_API_BASE_URL}/asistente/preguntas
  entrada:  { "pregunta": "...", "moduloRelacionado": "..." }
  salida:   { "respuesta": "..." }
```

Define `VITE_API_BASE_URL` en un archivo `.env.local` para habilitar el formulario de acceso y el asistente. Esos endpoints son una propuesta de integración: deben adaptarse al contrato real del equipo de backend. El frontend no consulta SQL directamente ni guarda contraseñas.

Funciones del bosquejo que aún requieren diseño o servicios adicionales: doble división sintética, factores cuadráticos, explicaciones IA y evaluaciones. Las cuatro tablas de exámenes del diagrama no aparecen en `BD Script.txt`; la pantalla de evaluaciones informa de esa diferencia.

## Decisiones de cálculo

- Tasas de finanzas: porcentaje **anual**; el número de periodos indica capitalizaciones o pagos por año.
- Descriptiva: varianza y desviación **poblacionales**; curtosis reportada como exceso de curtosis.
- Distribución normal: `P(X ≤ x)` mediante aproximación numérica de la función error.
- La aplicación de demostración calcula en el navegador y no persiste en SQL.

Consulta [el análisis previo](../ANALISIS_FRONTEND.md) para ver las diferencias entre las fuentes entregadas.
