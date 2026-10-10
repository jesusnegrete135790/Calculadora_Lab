"""Opt-in conversion of legacy plaintext passwords. No passwords/hashes are printed."""
import argparse
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from sqlalchemy import text, select
from sqlalchemy.orm import Session
from app.database import get_engine
from app.models import Usuario
from app.core.security import hasher

parser=argparse.ArgumentParser(description='Convertir contraseñas legadas a Argon2 sin mostrarlas')
parser.add_argument('--hash-existing-plaintext',action='store_true',required=True)
parser.parse_args()
with Session(get_engine()) as db:
    try:
        users=db.scalars(select(Usuario)).all()
        if any(not user.contrasena or (user.contrasena.startswith('$') and not user.contrasena.startswith('$argon2id$')) for user in users):
            raise RuntimeError('Hay contraseñas nulas o hashes de otro formato. Requieren recuperación de cuenta antes de migrar.')
        db.execute(text('ALTER TABLE dbo.Usuarios ALTER COLUMN Contrasena VARCHAR(255) NULL'))
        count=0
        for user in users:
            if not user.contrasena.startswith('$argon2id$'):
                user.contrasena=hasher.hash(user.contrasena)
                count+=1
        db.commit()
    except Exception:
        db.rollback()
        raise
print(f'Contraseñas convertidas a Argon2: {count}')
