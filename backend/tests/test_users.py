import pytest
from sqlalchemy import select
from app import models as m
from app.core.security import verify_password

PASSWORD = 'Contraseña123!'
NEW_USER = {'nombre': 'Nuevo', 'correo': 'new@example.com', 'contrasena': PASSWORD, 'rol': 'Usuario', 'activo': True}


@pytest.fixture
def admin(client, account, database, headers):
    with database[1]() as db:
        db.get(m.Usuario, account['usuario']['id']).rol = 'Administrador'
        db.commit()
    return headers


@pytest.mark.parametrize('method,path,payload', [
    ('get', '/api/usuarios', None), ('get', '/api/usuarios/roles', None),
    ('get', '/api/usuarios/1', None), ('post', '/api/usuarios', NEW_USER),
    ('patch', '/api/usuarios/1', {'rol': 'Administrador'}), ('delete', '/api/usuarios/1', None),
])
def test_all_management_routes_require_admin(client, headers, method, path, payload):
    options = {'json': payload} if payload is not None else {}
    assert client.request(method, path, **options).status_code == 401
    assert client.request(method, path, headers=headers, **options).status_code == 403


def test_create_update_search_and_delete(client, admin, database):
    assert client.get('/api/usuarios/roles', headers=admin).json() == ['Usuario', 'Administrador']
    response = client.post('/api/usuarios', headers=admin, json={**NEW_USER, 'correo': 'NEW@example.com', 'nombre': ' Nuevo '})
    assert response.status_code == 201, response.text
    user = response.json()
    assert user['nombre'] == 'Nuevo' and user['correo'] == 'new@example.com'
    assert 'contrasena' not in response.text and 'VersionToken' not in response.text
    with database[1]() as db:
        assert verify_password(PASSWORD, db.get(m.Usuario, user['id']).contrasena)
    assert client.get(f"/api/usuarios/{user['id']}", headers=admin).json() == user
    assert client.get('/api/usuarios?q=nue&rol=Usuario&activo=true', headers=admin).json() == [user]
    assert client.get('/api/usuarios?q=%25', headers=admin).json() == []
    assert client.get('/api/usuarios?offset=1&limit=1', headers=admin).json() == [user]
    changed = client.patch(f"/api/usuarios/{user['id']}", headers=admin, json={'nombre': 'Editado', 'rol': 'Administrador'})
    assert changed.status_code == 200 and changed.json()['rol'] == 'Administrador'
    token = client.post('/api/auth/login', json={'correo': user['correo'], 'contrasena': PASSWORD}).json()['token']
    assert client.get('/api/usuarios', headers={'Authorization': 'Bearer ' + token}).status_code == 200
    assert client.delete(f"/api/usuarios/{user['id']}", headers=admin).status_code == 204
    assert client.get(f"/api/usuarios/{user['id']}", headers=admin).status_code == 404
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + token}).status_code == 401


def test_validation_conflicts_and_self_protection(client, admin, account):
    user = client.post('/api/usuarios', headers=admin, json=NEW_USER).json()
    assert client.post('/api/usuarios', headers=admin, json={**NEW_USER, 'correo': 'NEW@example.com'}).status_code == 409
    for payload in ({}, {'nombre': '  '}, {'rol': 'SuperAdministrador'}, {'contrasena': 'corta'}, {'activo': None}, {'id': 99}):
        response = client.patch(f"/api/usuarios/{user['id']}", headers=admin, json=payload)
        assert response.status_code == 422, response.text
        assert 'corta' not in response.text
    assert client.patch(f"/api/usuarios/{user['id']}", headers=admin, json={'correo': 'ALUMNO@example.com'}).status_code == 409
    assert client.patch('/api/usuarios/9999', headers=admin, json={'nombre': 'A'}).status_code == 404
    assert client.delete('/api/usuarios/-1', headers=admin).status_code == 422
    assert client.get('/api/usuarios?rol=Otro', headers=admin).status_code == 422
    own_id = account['usuario']['id']
    for payload in ({'activo': False}, {'rol': 'Usuario'}):
        assert client.patch(f'/api/usuarios/{own_id}', headers=admin, json=payload).status_code == 409
    assert client.delete(f'/api/usuarios/{own_id}', headers=admin).status_code == 409
    assert client.patch(f'/api/usuarios/{own_id}', headers=admin, json={'nombre': 'Administrador'}).status_code == 200


def test_disabling_password_and_role_changes_revoke_sessions(client, admin, database):
    user = client.post('/api/usuarios', headers=admin, json=NEW_USER).json()
    def login():
        return client.post('/api/auth/login', json={'correo': NEW_USER['correo'], 'contrasena': PASSWORD})
    old = {'Authorization': 'Bearer ' + login().json()['token']}
    path = f"/api/usuarios/{user['id']}"
    assert client.patch(path, headers=admin, json={'activo': False}).status_code == 200
    assert login().status_code == 401
    assert client.get('/api/historial', headers=old).status_code == 401
    assert client.patch(path, headers=admin, json={'activo': True}).status_code == 200
    assert client.get('/api/auth/me', headers=old).status_code == 401
    fresh = {'Authorization': 'Bearer ' + login().json()['token']}
    assert client.patch(path, headers=admin, json={'rol': 'Administrador'}).status_code == 200
    assert client.get('/api/usuarios', headers=fresh).status_code == 401
    fresh = {'Authorization': 'Bearer ' + login().json()['token']}
    assert client.patch(path, headers=admin, json={'rol': 'Usuario'}).status_code == 200
    assert client.get('/api/usuarios', headers=fresh).status_code == 401
    assert client.get('/api/usuarios', headers={'Authorization': 'Bearer ' + login().json()['token']}).status_code == 403
    assert client.patch(path, headers=admin, json={'contrasena': 'NuevaContraseña123!'}).status_code == 200
    assert login().status_code == 401
    fresh_token = client.post('/api/auth/login', json={'correo': NEW_USER['correo'], 'contrasena': 'NuevaContraseña123!'}).json()['token']
    assert client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + fresh_token}).status_code == 200


@pytest.mark.parametrize('history', ['calculation', 'assistant', 'evaluation'])
def test_deletion_preserves_related_history(client, admin, database, history):
    user = client.post('/api/usuarios', headers=admin, json=NEW_USER).json()
    token = client.post('/api/auth/login', json={'correo': NEW_USER['correo'], 'contrasena': PASSWORD}).json()['token']
    owner = {'Authorization': 'Bearer ' + token}
    if history == 'calculation':
        assert client.post('/api/logica', headers=owner, json={'method': 'Tabla de verdad', 'input': 'A', 'result': {'title': 'Resultado', 'value': 'A', 'steps': [], 'table': {'columns': ['A', 'Resultado'], 'rows': [[0, 0], [1, 1]]}}}).status_code == 201
    elif history == 'assistant':
        with database[1]() as db:
            db.add(m.Asistencia(usuario_id=user['id'], modulo='Lógica', pregunta='Pregunta', respuesta='Respuesta'))
            db.commit()
    else:
        exam = client.get('/api/evaluaciones', headers=owner).json()[0]
        questions = client.get(f"/api/evaluaciones/{exam['id']}", headers=owner).json()['questions']
        assert client.post(f"/api/evaluaciones/{exam['id']}/intentos", headers=owner, json={'answers': [{'questionId': question['id'], 'option': 'A'} for question in questions]}).status_code == 201
    path = f"/api/usuarios/{user['id']}"
    assert client.delete(path, headers=admin).status_code == 409
    assert client.get(path, headers=admin).status_code == 200
    assert client.patch(path, headers=admin, json={'activo': False}).status_code == 200
    with database[1]() as db:
        model = {'calculation': m.Logica, 'assistant': m.Asistencia, 'evaluation': m.ResultadoExamen}[history]
        assert db.scalar(select(model.id).where(model.usuario_id == user['id'])) is not None


def test_patch_cors(client):
    response = client.options('/api/usuarios/1', headers={'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'PATCH'})
    assert response.status_code == 200
    assert 'PATCH' in response.headers['access-control-allow-methods']


def test_first_admin_bootstrap(client, account, database, headers, monkeypatch):
    from tools import bootstrap_admin
    monkeypatch.setattr(bootstrap_admin, 'get_engine', lambda: database[0])
    monkeypatch.setattr('sys.argv', ['bootstrap_admin.py', '--email', 'ALUMNO@example.com'])
    bootstrap_admin.main()
    assert client.get('/api/auth/me', headers=headers).status_code == 401
    response = client.post('/api/auth/login', json={'correo': 'alumno@example.com', 'contrasena': PASSWORD})
    assert response.json()['usuario']['rol'] == 'Administrador'
    with pytest.raises(SystemExit) as error:
        bootstrap_admin.main()
    assert error.value.code == 1
