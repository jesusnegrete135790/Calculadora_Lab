# Backend del Laboratorio de Matemáticas

API FastAPI para cuentas, autenticación JWT, historial privado, persistencia transaccional de las cuatro áreas matemáticas y consultas al asistente. El frontend calcula; esta API valida y almacena. La base de producción es **Microsoft SQL Server**, `LaboratorioMatematicas`.

## Arquitectura

```text
app/main.py                Aplicación, CORS, salud, tamaño máximo y errores
app/core/config.py         Variables de entorno y configuración validada
app/core/security.py       Argon2, JWT y permisos por rol
app/database.py            Conexión SQL Server y ciclo de sesión
app/models.py              Modelos de cuentas, cálculos, asistente y evaluaciones
app/schemas.py             Contratos Pydantic y validaciones
app/repositories.py        Consultas por propietario y borrado relacionado
app/routes.py              Auth, usuarios, módulos, historial y asistente
app/services/calculations.py  Mapeo y transacción de cada cálculo
app/services/ai_service.py    Interfaz AIProvider y adaptador Gemini
sql/                       Creación y migración del esquema original
tools/                     Ejecutores de migración y actualización de hashes
tests/                     Pruebas aisladas y contra SQL Server
```

La contraseña nunca sale de la API. Los registros se filtran usando el usuario del JWT, incluso para detalle y DELETE. El registro asigna siempre `Usuario`; el rol no se toma del navegador. `GET /api/usuarios` exige `Administrador`, consultado desde la base. No hay una ruta pública para concederse ese rol.

## Requisitos e instalación

Instala Python **3.12 o superior** de [python.org](https://www.python.org/downloads/windows/) y Node.js compatible con el Vite existente (se verificó con Node 24). Instala SQL Server o SQL Express, SSMS y [Microsoft ODBC Driver 18](https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server). Python y el controlador deben tener la misma arquitectura, normalmente x64.

Desde PowerShell, situado en la carpeta del proyecto:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Si no puedes activar el entorno por la política de PowerShell, usa sus ejecutables directamente:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

`requirements.lock.txt` contiene las versiones exactas verificadas; puedes instalarlo en lugar de `requirements.txt`. No se incluye el entorno virtual en la entrega.

## Variables de entorno

Edita tu `.env` local; no lo subas a Git. Genera una clave JWT aleatoria:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copia el valor a `JWT_SECRET_KEY`. La aplicación rechaza claves vacías o de menos de 32 caracteres. Usa la misma clave al reiniciar si quieres mantener válidos los tokens que aún no caducan. El algoritmo admitido es HS256; su duración predeterminada es 60 minutos.

Para autenticación SQL, configura `DB_SERVER`, `DB_PORT`, `DB_USER` y `DB_PASSWORD`. Habilita TCP/IP y el puerto correspondiente en SQL Server Configuration Manager si esa es tu forma de conexión. Los secretos se mantienen únicamente en el backend; la URL de conexión usa escape ODBC y no se registra en logs.

Para SQL Express, puedes usar autenticación de Windows con los datos de tu propia instancia:

```env
DB_SERVER=.\SQLEXPRESS
DB_PORT=
DB_NAME=LaboratorioMatematicas
DB_TRUSTED_CONNECTION=true
DB_USER=
DB_PASSWORD=
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
FRONTEND_URL=http://localhost:5173
```

El puerto vacío conserva el nombre de instancia. Windows ejecuta la conexión bajo la identidad del proceso Python. El permiso para migraciones debe otorgarlo el administrador de SQL; para ejecución normal basta una identidad con acceso de lectura/escritura a estas tablas. Usa `DB_TRUST_SERVER_CERTIFICATE=true` solo en desarrollo local. Para otros servidores, configura un certificado confiable y conserva `DB_TRUST_SERVER_CERTIFICATE=false`.

`FRONTEND_URL` admite orígenes explícitos separados por comas. Si abres el frontend con `127.0.0.1`, agrega `http://127.0.0.1:5173`; ese origen es distinto de `localhost`.

## Esquema y migración

Ejecuta en SSMS o, desde `backend`, con la configuración anterior:

```powershell
# Si la base todavía no existe:
python tools/apply_sql.py 001_create_database.sql

# Para el esquema original de 13 tablas y para agregar sus restricciones:
python tools/apply_sql.py 002_upgrade_existing.sql

# Agregar el banco y los resultados de evaluaciones:
python tools/apply_sql.py 003_evaluations.sql
```

En una instalación nueva ejecuta los tres scripts. El primero crea solo tablas faltantes. El segundo agrega columnas e índices y amplía los textos; no borra tablas ni registros y ejecuta los cambios dentro de una transacción. El tercero agrega el catálogo y los intentos de evaluación con sus respuestas; es aditivo y puede ejecutarse de nuevo.

Cambios respecto del SQL original:

- `Usuarios.Contrasena VARCHAR(255)`, correo único normalizado a minúsculas y campos esenciales no nulos; roles `Usuario` y `Administrador`.
- Textos a `NVARCHAR` para conservar expresiones Unicode. `TEXT` se sustituye por `NVARCHAR(MAX)`.
- `EntradaJSON` y `ResultadoJSON` en los cinco encabezados de cálculos. El segundo tiene una restricción `ISJSON`. En migraciones son anulables para conservar registros antiguos; las nuevas operaciones siempre los llenan.
- Agrupaciones, circuitos, polinomios y parámetros a `NVARCHAR(MAX)` porque 255 caracteres no alcanzan para resultados existentes.
- Índices en claves foráneas. Se conserva `NO ACTION` en las relaciones originales: la API elimina primero los hijos, dentro de la misma transacción, y luego el padre.

Si la migración encuentra correos duplicados, campos esenciales nulos, roles desconocidos o contraseñas legadas, se detiene con un mensaje y hace rollback. No los corrige eliminando datos. Para convertir contraseñas **legadas en texto plano**, existe una herramienta explícita:

```powershell
python tools/upgrade_passwords.py --hash-existing-plaintext
python tools/apply_sql.py 002_upgrade_existing.sql
```

La conversión conserva la contraseña de acceso usando Argon2 y no imprime contraseñas ni hashes. Los hashes de otros formatos requieren un procedimiento de recuperación antes de usar esta versión; el sistema nuevo utiliza Argon2id.

Los registros anteriores sin JSON muestran el valor que existe y una nota sobre la falta de procedimiento; no se inventan gráficas ni pasos. Sus fechas heredadas pueden provenir de `GETDATE()` local; las nuevas se escriben en UTC y se presentan en la zona del navegador.

## Arranque y documentación

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: <http://localhost:8000>.
- Swagger: <http://localhost:8000/docs>.
- ReDoc: <http://localhost:8000/redoc>.
- Salud de proceso: `GET /api/health` → `{"status":"ok"}`.
- Conexión real: `GET /api/health/db` ejecuta `SELECT 1` y devuelve 503 si falla.

No se crea ni modifica el esquema automáticamente al arrancar el servidor.

## Contrato HTTP e integración React

En `FrontEnd/.env.local`:

```env
VITE_API_URL=http://localhost:8000/api
```

El cliente central está en `FrontEnd/src/model/api.ts`; admite la variable provisional anterior como alternativa, pero usa las rutas nuevas. Reinicia Vite cuando cambies variables. No hay conexión SQL ni claves de IA en React.

| Ruta | Acción |
|---|---|
| `POST /api/auth/register` | `{nombre, correo, contrasena}`; contraseña de 10–128 caracteres |
| `POST /api/auth/login` | `{correo, contrasena}` |
| `GET /api/auth/me` | Usuario del token |
| `GET /api/usuarios` | Lista paginada, solo Administrador |
| `/api/logica`, `/api/finanzas`, `/api/computacionales`, `/api/estadistica`, `/api/distribuciones` | POST guardar, GET listar, GET `/{id}` consultar, DELETE `/{id}` eliminar |
| `GET /api/historial?offset=0&limit=50` | Historial combinado de la cuenta |
| `POST /api/asistente/preguntar` | `{pregunta, moduloRelacionado}` |
| `GET /api/asistente/historial` | Consultas de IA de la cuenta |
| `GET /api/evaluaciones` | Catálogo de cuatro evaluaciones, cinco preguntas cada una |
| `GET /api/evaluaciones/{id}` | Preguntas y opciones, sin exponer las respuestas correctas |
| `POST /api/evaluaciones/{id}/intentos` | Califica en servidor y guarda intento y respuestas |
| `GET /api/evaluaciones/historial` | Intentos y calificaciones de la cuenta |
| `GET /api/evaluaciones/intentos/{id}` | Revisión de intento propio, con explicación |

Registro y login devuelven `{token, token_type:"bearer", usuario:{id,nombre,correo,rol}}`. Usa `Authorization: Bearer <token>` en rutas protegidas. Swagger permite ingresar ese token con **Authorize**. El token se conserva en `sessionStorage`, se elimina al cerrar sesión y un 401 devuelve al acceso. El cierre de sesión es del cliente: el JWT emitido sigue siendo válido hasta su expiración, como corresponde al alcance solicitado.

Los POST de cálculos reciben `{method, input, result}`. `method` es el nombre visible; `input` conserva los tipos del frontend (la lógica usa una cadena). `result` es `CalculationResult`, con sus tablas y visualizaciones; las EDO requieren `numericRows`, y las interpolaciones `polynomial`. La descriptiva añade `metrics`. Swagger muestra todos los campos y sus límites.

Ejemplo de lógica, con todos los campos mínimos:

```json
{
  "method": "Tabla de verdad y simplificación",
  "input": "A",
  "result": {
    "title": "Expresión simplificada",
    "value": "A",
    "steps": [],
    "table": {"columns":["A","Resultado"],"rows":[[0,0],[1,1]]}
  }
}
```

El frontend devuelve inmediatamente el resultado del algoritmo local; luego informa **Guardado en tu historial** o muestra el error sin ocultarlo. En modo de cuenta no se copia el historial privado al historial compartido de demostración. Las distribuciones del módulo de estadística se envían a `/api/distribuciones`.

Los listados aceptan `offset` y `limit` (1–100). La pantalla de historial carga 50 registros por página y ofrece **Cargar más**; permite borrar el cálculo seleccionado. Los IDs visibles llevan prefijo, por ejemplo `logica:12`; las rutas usan solo la parte numérica, siempre con filtro por propietario.

## Precisión y transacciones

Se utiliza `Decimal` para las columnas SQL `DECIMAL`. La conversión es explícita y redondea con `ROUND_HALF_EVEN` a la escala de cada columna; se rechazan desbordamientos con 422. La API convierte cadenas financieras del formato `es-MX` del frontend (MXN, separador de miles y punto decimal), exclusivamente en campos conocidos. No interpreta textos explicativos como números.

Entradas decimales y metadatos `metrics`/`numericRows` se serializan como **cadenas decimales** en JSON, conservando precisión. Los tipos TypeScript admiten `number | string` para esos metadatos. Las tablas y gráficas conservan el contrato visual original; sus números proceden de los algoritmos existentes de JavaScript. Las aproximaciones/formatos del frontend no se convierten en exactitud matemática adicional al guardarlos.

Una operación escribe su encabezado y todos los hijos con un único `commit`; cualquier error provoca rollback. Se conservan las escalas solicitadas. K1–K4 son las pendientes que el frontend ya calcula (sin multiplicar por `h`); para EDO la fila cero contiene el estado inicial y constantes nulas. En interpolación se guardan los aportes por orden/punto y el polinomio completo; las columnas que no aplican quedan nulas.

Tasas anuales en porcentaje, tiempo en años, `PagoParcial` como abono extraordinario a capital y `extraPayment` como abono recurrente: se conserva la interpretación existente. La descriptiva usa varianza poblacional y exceso de curtosis.

El backend valida la estructura, límites, precisión y relaciones del resultado recibido. No certifica que un resultado calculado por un cliente modificado sea matemáticamente verdadero; volver a calcularlo en Python duplicaría los algoritmos que se pidió conservar.

## Asistente

Configura `GEMINI_API_KEY` únicamente en `.env` del backend. El modelo predeterminado es `gemini-3.5-flash-lite`; `GEMINI_API_BASE_URL` permite cambiar la URL del servicio. La clave se queda en el backend y nunca se comparte con el frontend. Un proveedor diferente puede implementar `AIProvider.answer` y reemplazar `get_ai_provider`, sin modificar las rutas ni SQL.

Para obtener una clave, créala en [Google AI Studio](https://aistudio.google.com/apikey). Google muestra una cuota gratuita de tokens para algunos modelos, incluido `gemini-3.5-flash-lite`; los límites de solicitudes varían según el proyecto y pueden revisarse en AI Studio. En el nivel gratuito, Google puede usar las entradas y respuestas para mejorar sus productos; evita enviar datos personales o sensibles.

El adaptador usa Gemini `generateContent`, manda la clave mediante el encabezado `x-goog-api-key`, aplica timeout y limita la salida. Persiste únicamente respuestas válidas. Devuelve 503 si falta configuración, 504 si vence el tiempo, 502 ante desconexión/respuesta inválida/error y 429 ante límites. Las calculadoras funcionan aunque el asistente no esté configurado. El frontend presenta las consultas anteriores de la cuenta.

El límite por proceso es 10 intentos de login/registro por minuto e IP y 5 consultas IA por minuto y usuario. Para varios procesos o publicación usa un límite compartido en el gateway y HTTPS. La petición máxima es de aproximadamente 1 MB. No se incluyeron funcionalidades de recuperación de contraseña, refresh token ni correo.

## Evaluaciones

`003_evaluations.sql` crea las tablas `Examenes`, `BancoPreguntas`, `ResultadosExamen` y `RespuestasUsuario`. Al consultar el catálogo por primera vez, el backend inserta de forma idempotente cinco preguntas de opción múltiple para cada área. Las respuestas correctas solo se usan en el servidor; la calificación se calcula allí y cada intento guarda usuario, respuestas, aciertos, porcentaje y fecha. El historial y la revisión de respuestas están aislados por usuario.

## Pruebas

```powershell
python -m pytest
```

Las pruebas normales usan **SQLite en memoria únicamente como fixture aislada**; no existe una configuración SQLite para ejecutar la aplicación. Verifican autenticación, hashes, roles, aislamiento por usuario, validación, persistencia de 24 resultados reales del frontend, hijos, evaluaciones, rollback, CORS y errores de IA mediante un transporte simulado.

Para la misma suite contra una base SQL Server **de laboratorio sin usuarios**, configura la conexión y usa:

```powershell
$env:LAB_TEST_SQLSERVER="1"
python -m pytest
Remove-Item Env:LAB_TEST_SQLSERVER
```

La suite se niega a ejecutarse si hay usuarios existentes y limpia exclusivamente sus cuentas sintéticas. No la apuntes a una base de producción. El reporte de entrega distingue las pruebas reales de proveedor IA de las simuladas.

Frontend:

```powershell
cd ..\FrontEnd
npm test
npm run build
```

## Problemas frecuentes

| Problema | Revisión |
|---|---|
| Error `IM002`/controlador ausente | Instala ODBC 18 x64 y usa exactamente su nombre en DB_DRIVER |
| Error `08001`/timeout | Instancia, servicio, puerto y TCP/IP; SQL Express puede funcionar por nombre con DB_PORT vacío |
| Certificado no confiable | Usa certificado confiable; para el servidor local de desarrollo solamente, la opción documentada de TrustServerCertificate |
| Login SQL `18456` | Usuario/contraseña, modo de autenticación y permiso sobre la base; Windows usa la identidad del proceso |
| Error al arrancar sobre JWT_SECRET_KEY | Genera una clave de al menos 32 caracteres y ejecuta desde backend para cargar su .env |
| Error 503 al guardar | Revisa salud DB y aplica las migraciones; conserva el resultado visible y corrige la conexión antes de recalcular |
| Error 422 | La respuesta indica campos inválidos; revisa límites SQL, filas, tablas y entradas |
| CORS o acceso no aparece | VITE_API_URL y FRONTEND_URL deben corresponder a la URL usada; reinicia Vite |
| Asistente 503 | Falta clave o modelo; la aplicación restante sigue disponible |
| Advertencia de chunks grandes | Proviene de ECharts/ECharts-GL existentes; no es un fallo de compilación |

Referencias de implementación: [FastAPI JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/), [SQLAlchemy SQL Server 2.0](https://docs.sqlalchemy.org/en/20/dialects/mssql.html), [Gemini API](https://ai.google.dev/api).
