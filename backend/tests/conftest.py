import os
import sys
from pathlib import Path
os.environ['JWT_SECRET_KEY'] = 'test-only-key-never-use-in-deployment-123456'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db, get_engine
from app.repositories import PARENTS, CHILDREN
from app import models as m
from sqlalchemy import select, func, delete
from app.main import app
from app.routes import limiter


@pytest.fixture
def database():
    if os.environ.get('LAB_TEST_SQLSERVER') == '1':
        engine = get_engine()
        factory = sessionmaker(bind=engine, expire_on_commit=False)
        with factory() as db:
            # Never run global-count assertions/cleanup against user-filled tables.
            if db.scalar(select(func.count()).select_from(m.Usuario)):
                pytest.fail('Las pruebas SQL requieren una base de laboratorio sin usuarios. No se modificarán usuarios existentes.')
        try:
            yield engine, factory
        finally:
            with factory() as db:
                ids = list(db.scalars(select(m.Usuario.id).where(m.Usuario.correo.in_(['alumno@example.com','otro@example.com','new@example.com']))))
                for module, parent in PARENTS.items():
                    record_ids = select(parent.id).where(parent.usuario_id.in_(ids))
                    for child in CHILDREN[module]:
                        db.execute(delete(child).where(child.padre_id.in_(record_ids)))
                    db.execute(delete(parent).where(parent.usuario_id.in_(ids)))
                db.execute(delete(m.Asistencia).where(m.Asistencia.usuario_id.in_(ids)))
                db.execute(delete(m.Usuario).where(m.Usuario.id.in_(ids)))
                db.commit()
        return
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    @event.listens_for(engine, 'connect')
    def foreign_keys(connection, record):
        connection.execute('PRAGMA foreign_keys=ON')
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    yield engine, factory
    engine.dispose()


@pytest.fixture
def client(database):
    engine, factory = database
    def override_db():
        with factory() as db:
            try:
                yield db
            finally:
                db.rollback()
    app.dependency_overrides[get_db] = override_db
    limiter.entries.clear()
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def account(client):
    response = client.post('/api/auth/register', json={'nombre':'Alumno', 'correo':'alumno@example.com', 'contrasena':'Contraseña123!'} )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def headers(account):
    return {'Authorization': 'Bearer ' + account['token']}
