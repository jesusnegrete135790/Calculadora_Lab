from fastapi import HTTPException
from sqlalchemy import select, delete, or_
from app import models as m

PARENTS = {'logica': m.Logica, 'finanzas': m.Finanzas, 'computacionales': m.Computacional, 'estadistica': m.Estadistica, 'distribuciones': m.Distribucion}
CHILDREN = {'logica': [m.FilaVerdad, m.Mapa], 'finanzas': [m.FilaAmortizacion, m.Regla], 'computacionales': [m.Iteracion], 'estadistica': [m.Frecuencia], 'distribuciones': []}


def users(db, offset, limit, query='', role=None, active=None):
    statement = select(m.Usuario)
    if query:
        statement = statement.where(or_(m.Usuario.nombre.contains(query, autoescape=True), m.Usuario.correo.contains(query, autoescape=True)))
    if role is not None:
        statement = statement.where(m.Usuario.rol == role)
    if active is not None:
        statement = statement.where(m.Usuario.activo == active)
    return db.scalars(statement.order_by(m.Usuario.id).offset(offset).limit(limit)).all()


def user_by_id(db, user_id):
    user = db.get(m.Usuario, user_id, populate_existing=True)
    if user is None:
        raise HTTPException(404, 'No se encontró el usuario solicitado')
    return user


def lock_administrators(db):
    # Serialize administrative writes and hold the range until commit on SQL Server.
    statement = select(m.Usuario).where(m.Usuario.rol == 'Administrador').order_by(m.Usuario.id)
    return db.scalars(statement.with_hint(m.Usuario, 'WITH (UPDLOCK, HOLDLOCK)', dialect_name='mssql').execution_options(populate_existing=True)).all()


def owned(db, module, record_id, user_id):
    cls = PARENTS[module]
    record = db.scalar(select(cls).where(cls.id == record_id, cls.usuario_id == user_id))
    if record is None:
        raise HTTPException(404, 'No se encontró el cálculo solicitado')
    return record


def history(db, module, user_id, offset, limit):
    cls = PARENTS[module]
    return db.scalars(select(cls).where(cls.usuario_id == user_id).order_by(cls.fecha.desc(), cls.id.desc()).offset(offset).limit(limit)).all()


def remove(db, module, record):
    # Explicit child deletion also works with the supplied legacy NO ACTION FKs.
    for cls in CHILDREN[module]:
        db.execute(delete(cls).where(cls.padre_id == record.id))
    db.delete(record)
    db.commit()
