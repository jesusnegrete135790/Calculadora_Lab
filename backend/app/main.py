import logging
from fastapi import FastAPI, Depends, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.database import get_db
from app.routes import router

settings = get_settings()
logger = logging.getLogger('laboratorio')
app = FastAPI(title='Laboratorio de Matemáticas', version='1.0.0', description='Autenticación y persistencia SQL Server de cálculos realizados en React.')
app.add_middleware(CORSMiddleware, allow_origins=[origin.strip() for origin in settings.frontend_url.split(',')], allow_credentials=False, allow_methods=['GET','POST','PATCH','DELETE'], allow_headers=['Authorization','Content-Type'])
app.include_router(router)


@app.middleware('http')
async def body_limit(request: Request, call_next):
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > 1_100_000:
            return JSONResponse(status_code=413, content={'detail': 'Solicitud demasiado grande'})
    request._body = bytes(body)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'no-store'
    return response


@app.exception_handler(RequestValidationError)
async def invalid_input(request, error):
    # FastAPI's default includes input values; passwords must never be echoed.
    return JSONResponse(status_code=422, content={'detail': 'Datos inválidos', 'errors': [{'field': '.'.join(str(p) for p in e['loc']), 'type': e['type']} for e in error.errors()]})


@app.exception_handler(SQLAlchemyError)
async def database_error(request, error):
    # Exception messages/SQL parameters may contain secrets. Log only type/path.
    logger.error('Error de base de datos %s en %s', type(error).__name__, request.url.path)
    return JSONResponse(status_code=503, content={'detail': 'La base de datos no está disponible o no pudo guardar los datos'})


@app.exception_handler(Exception)
async def unexpected_error(request, error):
    logger.error('Error interno %s en %s', type(error).__name__, request.url.path)
    return JSONResponse(status_code=500, content={'detail': 'Ocurrió un error interno'})


@app.get('/api/health', tags=['Salud'])
def health():
    return {'status': 'ok'}


@app.get('/api/health/db', tags=['Salud'])
def database_health(db: Session = Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status': 'ok', 'database': 'ok'}
