"""Assign the first administrator to an existing account, from a trusted local CLI."""
import argparse
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_engine
from app.models import Usuario
from app.repositories import lock_administrators


def main():
    parser = argparse.ArgumentParser(description='Habilitar el primer administrador del laboratorio')
    parser.add_argument('--email', required=True, help='Correo de una cuenta ya registrada')
    args = parser.parse_args()
    with Session(get_engine()) as db:
        if any(user.activo for user in lock_administrators(db)):
            parser.exit(1, 'Ya existe un administrador activo. Usa el gestor de usuarios.\n')
        user = db.scalar(select(Usuario).where(Usuario.correo == args.email.strip().lower()))
        if user is None or not user.activo:
            parser.exit(1, 'Registra primero una cuenta activa con ese correo.\n')
        user.rol = 'Administrador'
        user.token_version += 1
        db.commit()
    print('Administrador habilitado. Cierra sesión e inicia sesión de nuevo.')


if __name__ == '__main__':
    main()
