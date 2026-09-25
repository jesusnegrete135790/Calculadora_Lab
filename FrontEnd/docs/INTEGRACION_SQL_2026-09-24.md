# Impacto del esquema SQL actualizado en el frontend

Fuente revisada: `SQLQuery1.sql` y diagrama recibidos el 24 de septiembre de 2026. Este documento describe la interfaz React + TypeScript; no define ni ejecuta la lógica del backend.

## Cambios respecto a `BD Script.txt`

El script anterior tenía 8 tablas. El nuevo tiene 13 y agrega `TablaVerdad`, `MapasKarnaugh`, `ReglasAmortizacion`, `TablaFrecuencias` y `DistribucionesProbabilidad`. También amplía columnas de finanzas, métodos numéricos y estadística. El diagrama nuevo ya no contiene las cuatro tablas de exámenes presentes en la primera imagen.

| Área | Datos nuevos | Estado del frontend |
| --- | --- | --- |
| Lógica | Filas de verdad, agrupaciones Karnaugh y diagrama de compuertas | Ya muestra tabla, mapa y circuito. El backend deberá devolverlos en una respuesta para que el frontend los presente. |
| Finanzas | Tipo de descuento, tasa equivalente y reglas de amortización por periodo | Ya muestra descuentos y tasas. El formulario ahora captura cambios de tasa y abonos extraordinarios por periodo; la demostración interpreta `PagoParcial` como abono adicional al capital. |
| Computacionales | Polinomio de interpolación; `ValorX`, `ValorY`, margen de error y K1–K4 en iteraciones | El componente de resultados admite tablas con columnas variables. Para mostrar K1–K4 del backend se necesita que la respuesta incluya esas columnas y sus filas. |
| Estadística | Frecuencias y distribuciones con parámetros, Z, área y aproximación | Ya existen tabla y gráficas. La frecuencia acumulada ahora es un conteo entero, como en SQL. La tabla de demostración usa cada valor distinto como clase. |
| Evaluaciones | Sin tablas en la versión nueva | La pantalla actual informa que el esquema no contempla exámenes; no hay integración de evaluación. |

## Límite entre frontend y backend

El navegador **no debe conectarse a SQL Server**. El backend define rutas HTTP, autenticación, validación, cálculos y persistencia. El frontend envía las entradas y presenta una respuesta con `title`, `value`, `steps`, `table`, `chart`/`charts`, `surface3d`, `logicMap` y `circuitTerms`, según corresponda. El tipo actual está en `src/model/types.ts` (`CalculationResult`). Los cálculos locales permanecen como modo de demostración hasta que el backend entregue su contrato de API.

Una respuesta de cálculo necesita el resultado explicativo completo. Las columnas `Resultado` y `ResultadoFinal` de SQL por sí solas no contienen pasos, tablas, circuitos ni muestras para gráficas. El backend debe devolverlos o establecer cómo se reconstruyen a partir de los datos guardados. La superficie 3D es una visualización derivada y no tiene tabla de persistencia propia.

## Acuerdos necesarios antes de conectar la API

1. Rutas HTTP, formatos de solicitud y respuesta, autenticación y errores por campo para cada módulo. El SQL no especifica endpoints.
2. Significado de `ReglasAmortizacion.PagoParcial`: el prototipo lo aplica como abono adicional al capital en el periodo señalado. Confirmar si esa es la regla del backend y si una tasa y un abono pueden compartir periodo.
3. Formato de `ParametrosEntrada` y `ValoresVariables`, y unidades de tasas (`12` para 12% frente a `0.12`). El frontend actual captura tasas como porcentajes anuales.
4. Cómo se enviarán y representarán los pasos, K1–K4, polinomios, áreas, curvas y gráficos 3D. `RaizResultado` no sirve como salida para todos los métodos numéricos.
5. Alcance de evaluaciones y comportamiento por `Rol`; la nueva base no define exámenes ni permisos de interfaz.

El frontend no almacena contraseñas; el formulario las envía al endpoint de autenticación configurado. La columna `Usuarios.Contrasena VARCHAR(50)` requiere que el backend defina un mecanismo seguro de autenticación y almacenamiento antes de usar cuentas reales.
