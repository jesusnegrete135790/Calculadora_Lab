from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def database_url(settings):
    # ODBC escaping handles semicolons and braces in credentials/server names.
    def escape(value):
        return '{' + str(value).replace('}', '}}') + '}'
    parts = {
        'DRIVER': settings.db_driver,
        'SERVER': f'{settings.db_server},{settings.db_port}' if settings.db_port else settings.db_server,
        'DATABASE': settings.db_name,
        'Encrypt': 'yes' if settings.db_encrypt else 'no',
        'TrustServerCertificate': 'yes' if settings.db_trust_server_certificate else 'no',
        'LongAsMax': 'Yes',
        'Connection Timeout': '5',
    }
    if settings.db_trusted_connection:
        parts['Trusted_Connection'] = 'Yes'
    else:
        parts.update(UID=settings.db_user, PWD=settings.db_password.get_secret_value())
    return URL.create('mssql+pyodbc', query={'odbc_connect': ';'.join(f'{k}={escape(v)}' for k, v in parts.items())})


@lru_cache
def get_engine():
    return create_engine(database_url(get_settings()), pool_pre_ping=True, hide_parameters=True)


def get_db():
    with sessionmaker(bind=get_engine(), expire_on_commit=False)() as db:
        try:
            yield db
        finally:
            db.rollback()
