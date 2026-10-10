from datetime import datetime, timedelta, timezone
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.database import get_db
from app.models import Usuario

hasher = PasswordHasher()
bearer = HTTPBearer(auto_error=False)
DUMMY_HASH = hasher.hash('dummy password used for timing only')


def verify_password(password, encoded):
    try:
        return hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError):
        return False


def create_token(user_id):
    settings = get_settings()
    now = datetime.now(timezone.utc)
    return jwt.encode({'sub': str(user_id), 'iat': now, 'exp': now + timedelta(minutes=settings.jwt_access_token_expire_minutes), 'iss': 'laboratorio-matematicas', 'aud': 'laboratorio-frontend'}, settings.jwt_secret_key.get_secret_value(), algorithm=settings.jwt_algorithm)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    error = HTTPException(401, 'Sesión inválida o caducada', headers={'WWW-Authenticate': 'Bearer'})
    if not credentials:
        raise error
    settings = get_settings()
    try:
        claims = jwt.decode(credentials.credentials, settings.jwt_secret_key.get_secret_value(), algorithms=[settings.jwt_algorithm], audience='laboratorio-frontend', issuer='laboratorio-matematicas', options={'require': ['sub', 'exp', 'iat']})
        user_id = int(claims['sub'])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise error from None
    user = db.get(Usuario, user_id)
    if user is None:
        raise error
    return user


def require_role(role):
    def dependency(user: Usuario = Depends(current_user)):
        if user.rol != role:
            raise HTTPException(403, 'No tienes permiso para esta operación')
        return user
    return dependency
