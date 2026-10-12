from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app import models as m, repositories as repo
from app.core.security import hasher


def authorize_write(db, actor):
    admins = repo.lock_administrators(db)
    if not any(user.id == actor.id and user.activo for user in admins):
        raise HTTPException(403, 'No tienes permiso para esta operación')
    return admins


def ensure_email_available(db, email, user_id=None):
    statement = select(m.Usuario.id).where(m.Usuario.correo == email)
    if user_id is not None:
        statement = statement.where(m.Usuario.id != user_id)
    if db.scalar(statement) is not None:
        raise HTTPException(409, 'Ya existe una cuenta con ese correo')


def commit_user(db, user):
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'No se pudo guardar: revisa el correo y los datos de la cuenta') from None
    return user


def create_user(db, payload, actor):
    authorize_write(db, actor)
    ensure_email_available(db, str(payload.correo))
    user = m.Usuario(nombre=payload.nombre, correo=str(payload.correo),
                     contrasena=hasher.hash(payload.contrasena), rol=payload.rol, activo=payload.activo)
    db.add(user)
    return commit_user(db, user)


def protect_access(user, actor, admins, role, active):
    if user.id == actor.id and (role != 'Administrador' or not active):
        raise HTTPException(409, 'No puedes quitar tu propio acceso de administrador')
    if user.rol == 'Administrador' and user.activo and (role != 'Administrador' or not active):
        if sum(admin.activo for admin in admins) <= 1:
            raise HTTPException(409, 'Debe permanecer al menos un administrador activo')


def update_user(db, user_id, payload, actor):
    admins = authorize_write(db, actor)
    user = repo.user_by_id(db, user_id)
    protect_access(user, actor, admins, payload.rol or user.rol,
                   payload.activo if payload.activo is not None else user.activo)
    changes = payload.model_dump(exclude_unset=True)
    if 'correo' in changes:
        ensure_email_available(db, str(changes['correo']), user.id)
    # Credential, role and status changes invalidate previously issued tokens.
    if 'contrasena' in changes or any(field in changes and changes[field] != getattr(user, field) for field in ('rol', 'activo')):
        user.token_version += 1
    for field, value in changes.items():
        setattr(user, field, hasher.hash(value) if field == 'contrasena' else value)
    return commit_user(db, user)


def delete_user(db, user_id, actor):
    admins = authorize_write(db, actor)
    user = repo.user_by_id(db, user_id)
    protect_access(user, actor, admins, 'Usuario', False)
    # NO ACTION foreign keys preserve calculations, evaluations and assistant history.
    try:
        db.delete(user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Esta cuenta tiene registros relacionados. Desactívala para conservar su historial') from None
