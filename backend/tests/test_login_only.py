import pytest
from sqlalchemy import func, select

from app import models as m


def test_registration_persists_user_and_allows_login(client, database):
    from app.core.security import verify_password
    payload = {'nombre': '  Nuevo  ', 'correo': 'NEW@example.com', 'contrasena': 'Contraseña123!'}
    response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 201, response.text
    assert 'Contraseña123!' not in response.text
    session = response.json()
    assert session['usuario']['nombre'] == 'Nuevo'
    assert session['usuario']['correo'] == 'new@example.com'
    assert session['usuario']['rol'] == 'Usuario'
    assert session['usuario']['activo'] is True
    with database[1]() as db:
        assert db.scalar(select(func.count()).select_from(m.Usuario)) == 1
        user = db.get(m.Usuario, session['usuario']['id'])
        assert verify_password(payload['contrasena'], user.contrasena)
        assert user.contrasena != payload['contrasena']
        assert user.fecha is not None
    assert client.post('/api/auth/login', json={'correo': 'new@example.com', 'contrasena': payload['contrasena']}).status_code == 200
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + session['token']}).status_code == 200
    assert client.post('/api/auth/register', json=payload).status_code == 409
    assert '/api/auth/register' in client.get('/openapi.json').json()['paths']


@pytest.mark.parametrize('changes', [
    {'rol': 'Administrador'}, {'activo': False}, {'IdUsuario': 99},
    {'nombre': '   '}, {'nombre': 'a' * 101}, {'correo': 'invalid'},
    {'contrasena': 'corta'}, {'contrasena': 'a' * 129},
])
def test_registration_rejects_invalid_or_privileged_fields(client, database, changes):
    payload = {'nombre': 'Nuevo', 'correo': 'new@example.com', 'contrasena': 'Contraseña123!', **changes}
    response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 422
    assert payload['contrasena'] not in response.text
    with database[1]() as db:
        assert db.scalar(select(func.count()).select_from(m.Usuario)) == 0


def test_registration_rate_limit(client):
    from app.routes import limiter
    from time import monotonic
    limiter.entries[('register', 'testclient')].extend([monotonic()] * 10)
    assert client.post('/api/auth/register', json={'nombre': 'Nuevo', 'correo': 'new@example.com', 'contrasena': 'Contraseña123!'}).status_code == 429


def test_login_requires_an_existing_active_database_user(client, account, database):
    assert client.post('/api/auth/login', json={'correo': 'noexiste@example.com', 'contrasena': 'Contraseña123!'}).status_code == 401
    with database[1]() as db:
        db.get(m.Usuario, account['usuario']['id']).activo = False
        db.commit()
    assert client.post('/api/auth/login', json={'correo': 'alumno@example.com', 'contrasena': 'Contraseña123!'}).status_code == 401
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + account['token']}).status_code == 401


@pytest.mark.parametrize('path', ['/api/historial', '/api/computacionales', '/api/logica', '/api/evaluaciones', '/api/asistente/historial'])
def test_no_anonymous_or_demo_access(client, path):
    assert client.get(path).status_code == 401
    assert client.get(path, headers={'Authorization': 'Bearer demo'}).status_code == 401
