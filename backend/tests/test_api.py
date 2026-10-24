import copy
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import jwt
import pytest
from sqlalchemy import event, select, func
from sqlalchemy.exc import IntegrityError
from app import models as m
from app.main import app
from app.core.config import get_settings
from app.core.security import verify_password
from app.repositories import PARENTS, CHILDREN
from app.services.ai_service import get_ai_provider

FIXTURES = json.loads((Path(__file__).parent / 'frontend_fixtures.json').read_text(encoding='utf-8'))


def test_auth(client, account, database):
    assert account['usuario']['rol'] == 'Usuario'
    assert 'contrasena' not in json.dumps(account)
    with database[1]() as db:
        user = db.get(m.Usuario, account['usuario']['id'])
        assert user.contrasena.startswith('$argon2id$')
        assert verify_password('Contraseña123!', user.contrasena)
    assert client.post('/api/auth/register', json={'nombre':'Otro','correo':'ALUMNO@example.com','contrasena':'Contraseña123!'}).status_code == 403
    assert client.post('/api/auth/login', json={'correo':'alumno@example.com','contrasena':'Contraseña123!'}).status_code == 200
    assert client.post('/api/auth/login', json={'correo':'alumno@example.com','contrasena':'incorrecta'}).status_code == 401
    assert client.post('/api/auth/login', json={'correo':'nadie@example.com','contrasena':'incorrecta'}).status_code == 401
    assert client.get('/api/auth/me').status_code == 401
    assert client.get('/api/auth/me', headers={'Authorization':'Bearer '+account['token']}).json()['correo'] == 'alumno@example.com'


@pytest.mark.parametrize('fixture', FIXTURES, ids=[f"{v['module']}-{v['payload']['method']}-{i}" for i,v in enumerate(FIXTURES)])
def test_all_frontend_results(client, headers, database, fixture, account_factory):
    module, payload = fixture['module'], fixture['payload']
    response = client.post('/api/'+module, json=payload, headers=headers)
    assert response.status_code == 201, response.text
    record = response.json()
    assert record['result']['value'] == payload['result']['value']
    assert record['result'].get('table') == payload['result'].get('table')
    assert record['result'].get('surface3d') == payload['result'].get('surface3d')
    record_id = int(record['id'].split(':')[1])
    assert client.get(f'/api/{module}/{record_id}', headers=headers).json() == record
    assert len(client.get('/api/'+module, headers=headers).json()) == 1
    assert client.get('/api/historial',headers=headers).json()[0]['id'] == record['id']
    with database[1]() as db:
        if module == 'logica':
            assert db.scalar(select(func.count()).select_from(m.FilaVerdad)) == len(payload['result']['table']['rows'])
            assert db.scalar(select(func.count()).select_from(m.Mapa)) == 1
        if module == 'finanzas' and payload['input']['method'] == 'amortizacion':
            assert db.scalar(select(func.count()).select_from(m.FilaAmortizacion)) == len(payload['result']['table']['rows'])
            assert db.scalar(select(func.count()).select_from(m.Regla)) == 2
        if module == 'computacionales' and payload['input']['method'] == 'runge-kutta':
            row = db.scalar(select(m.Iteracion).where(m.Iteracion.numero == 1))
            assert all(getattr(row,k) is not None for k in ['k1','k2','k3','k4'])
        if module == 'computacionales' and payload['input']['method'] in ['lagrange','newton-interpolacion']:
            assert db.scalar(select(m.Computacional)).polinomio
        if module == 'estadistica':
            assert db.scalar(select(func.count()).select_from(m.Frecuencia)) == len(payload['result']['table']['rows'])
    other = account_factory('otro@example.com', 'Otro')
    other_headers={'Authorization':'Bearer '+other['token']}
    assert client.get(f'/api/{module}/{record_id}',headers=other_headers).status_code == 404
    assert client.delete(f'/api/{module}/{record_id}',headers=other_headers).status_code == 404
    assert client.get('/api/'+module,headers=other_headers).json() == []
    assert client.get('/api/historial',headers=other_headers).json() == []
    assert client.delete(f'/api/{module}/{record_id}', headers=headers).status_code == 204
    assert client.get(f'/api/{module}/{record_id}', headers=headers).status_code == 404
    with database[1]() as db:
        for cls in [PARENTS[module], *CHILDREN[module]]:
            assert db.scalar(select(func.count()).select_from(cls)) == 0


def test_validation_and_no_password_echo(client, headers):
    response = client.post('/api/auth/login',json={'correo':'invalid','contrasena':'secret'})
    assert response.status_code == 422
    assert 'secret' not in response.text
    assert client.post('/api/auth/register',json={'nombre':'A','correo':'new@example.com','contrasena':'Valid12345','rol':'Administrador'}).status_code == 403
    invalid = copy.deepcopy(FIXTURES[0]['payload']); invalid['IdUsuario'] = 100
    assert client.post('/api/logica',json=invalid,headers=headers).status_code == 422
    assert client.post('/api/logica',json={},headers=headers).status_code == 422
    assert client.get('/api/logica/999',headers=headers).status_code == 404
    assert client.get('/api/logica/-1',headers=headers).status_code == 422
    assert client.get('/api/logica?limit=101',headers=headers).status_code == 422
    invalid = copy.deepcopy(next(v['payload'] for v in FIXTURES if v['module']=='finanzas'))
    invalid['input']['capital'] = -1
    assert client.post('/api/finanzas',json=invalid,headers=headers).status_code == 422
    invalid['input']['capital'] = 10000; invalid['result']['value'] = '$100000000000000000000.00'
    assert client.post('/api/finanzas',json=invalid,headers=headers).status_code == 422


@pytest.mark.parametrize('module,method,child',[('logica','Tabla de verdad y simplificación',m.Mapa),('finanzas','amortizacion',m.Regla),('computacionales','runge-kutta',m.Iteracion)])
def test_rollback_child_failure(client, headers, database, module, method, child):
    engine, factory = database
    def fail(mapper, connection, target):
        raise IntegrityError('injected child failure', {}, Exception('test'))
    event.listen(child, 'before_insert', fail)
    try:
        payload=next(v['payload'] for v in FIXTURES if v['module']==module and v['payload']['method']==method)
        assert client.post('/api/'+module,json=payload,headers=headers).status_code == 503
    finally:
        event.remove(child, 'before_insert', fail)
    with factory() as db:
        for cls in [PARENTS[module],*CHILDREN[module]]:
            assert db.scalar(select(func.count()).select_from(cls)) == 0


def test_roles_and_expiry(client, headers, account, database):
    assert client.get('/api/usuarios',headers=headers).status_code == 403
    with database[1]() as db:
        db.get(m.Usuario,account['usuario']['id']).rol='Administrador'; db.commit()
    assert client.get('/api/usuarios',headers=headers).status_code == 200
    config=get_settings(); now=datetime.now(timezone.utc)
    token=jwt.encode({'sub':str(account['usuario']['id']),'iat':now-timedelta(hours=2),'exp':now-timedelta(hours=1),'aud':'laboratorio-frontend','iss':'laboratorio-matematicas'},config.jwt_secret_key.get_secret_value(),algorithm='HS256')
    assert client.get('/api/auth/me',headers={'Authorization':'Bearer '+token}).status_code == 401
    assert client.get('/api/auth/me',headers={'Authorization':'Bearer malformed'}).status_code == 401


def test_ai_disabled(client, headers):
    assert client.post('/api/asistente/preguntar',headers=headers,json={'pregunta':'¿Qué es una derivada?','moduloRelacionado':'Matemáticas computacionales'}).status_code == 503
    assert client.get('/api/asistente/historial',headers=headers).json() == []


def test_ai_history_is_owned(client, headers, account_factory):
    class FakeProvider:
        async def answer(self, question, module):
            return 'Explicación de prueba inyectada, sin llamar a proveedores externos.'
    app.dependency_overrides[get_ai_provider] = lambda: FakeProvider()
    response=client.post('/api/asistente/preguntar',headers=headers,json={'pregunta':'¿Qué es una derivada?','moduloRelacionado':'Matemáticas computacionales'})
    assert response.status_code == 200
    assert len(client.get('/api/asistente/historial',headers=headers).json()) == 1
    other=account_factory('otro@example.com', 'Otro')
    assert client.get('/api/asistente/historial',headers={'Authorization':'Bearer '+other['token']}).json() == []


def test_health_docs_cors_size(client):
    assert client.get('/api/health').json() == {'status':'ok'}
    assert client.get('/api/health/db').status_code == 200
    assert client.get('/docs').status_code == 200
    assert client.get('/redoc').status_code == 200
    assert '/api/distribuciones/{record_id}' in client.get('/openapi.json').json()['paths']
    response=client.options('/api/auth/login',headers={'Origin':'http://localhost:5173','Access-Control-Request-Method':'POST'})
    assert response.headers['access-control-allow-origin'] == 'http://localhost:5173'
    assert 'access-control-allow-origin' not in client.get('/api/health',headers={'Origin':'https://evil.example'}).headers
    assert client.post('/api/logica',content='x'*1_100_001).status_code == 413
