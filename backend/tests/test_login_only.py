import pytest
from sqlalchemy import func, select

from app import models as m


def test_public_registration_never_creates_users(client, database):
    payload = {'nombre': 'Nuevo', 'correo': 'new@example.com', 'contrasena': 'Contraseña123!'}
    response = client.post('/api/auth/register', json=payload)
    assert response.status_code == 403
    assert 'Contraseña123!' not in response.text
    with database[1]() as db:
        assert db.scalar(select(func.count()).select_from(m.Usuario)) == 0
    assert '/api/auth/register' not in client.get('/openapi.json').json()['paths']


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
