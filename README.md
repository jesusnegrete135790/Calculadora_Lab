# Laboratorio de Matemáticas

Proyecto integrado: frontend React existente → FastAPI → SQLAlchemy/pyodbc → Microsoft SQL Server.

Se conserva la arquitectura MVC, las calculadoras del navegador, navegación, estilos, gráficas ECharts, Karnaugh, circuitos, CSV e impresión. La API autentica usuarios y guarda entradas, resultados y tablas relacionadas; no duplica los algoritmos matemáticos.

## Ejecutar en Windows

Sigue [la guía del backend](backend/README.md) para preparar Python, SQL Server y las variables de entorno. Luego inicia dos terminales:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

```powershell
cd FrontEnd
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Abre <http://localhost:5173> e inicia sesión con una cuenta activa registrada en SQL Server. Las cuentas se crean desde **Gestor de usuarios**, por un administrador; el registro público está deshabilitado. Cada cálculo se guarda automáticamente. **Historial** recupera únicamente los registros de esa cuenta, con todos sus resultados y visualizaciones.

El laboratorio requiere autenticación y conexión con la API. No existe acceso de demostración ni historial compartido del navegador. Las sesiones guardadas se verifican con `/auth/me` antes de abrir el laboratorio.

## Documentación

- Consulta [la guía del backend](backend/README.md) para configurar SQL Server, aplicar migraciones, usar la API y habilitar el asistente.

Las claves y credenciales se configuran localmente en `backend/.env`; ese archivo no debe subirse al repositorio.
