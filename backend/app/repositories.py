from fastapi import HTTPException
from sqlalchemy import select, delete
from app import models as m

PARENTS = {'logica': m.Logica, 'finanzas': m.Finanzas, 'computacionales': m.Computacional, 'estadistica': m.Estadistica, 'distribuciones': m.Distribucion}
CHILDREN = {'logica': [m.FilaVerdad, m.Mapa], 'finanzas': [m.FilaAmortizacion, m.Regla], 'computacionales': [m.Iteracion], 'estadistica': [m.Frecuencia], 'distribuciones': []}


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
