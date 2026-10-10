"""Execute the saved, reviewed SQL scripts; never accepts inline SQL from requests."""
import argparse
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import create_engine
from app.core.config import get_settings
from app.database import database_url

parser = argparse.ArgumentParser(description='Aplicar esquema SQL Server del Laboratorio')
parser.add_argument('script', choices=['001_create_database.sql', '002_upgrade_existing.sql', '003_evaluations.sql'])
args = parser.parse_args()
settings = get_settings()
if args.script.startswith('001'):
    settings = settings.model_copy(update={'db_name': 'master'})
engine = create_engine(database_url(settings), hide_parameters=True)
sql = (Path(__file__).resolve().parents[1] / 'sql' / args.script).read_text(encoding='utf-8')
with engine.connect().execution_options(isolation_level='AUTOCOMMIT') as connection:
    for batch in re.split(r'^\s*GO\s*$', sql, flags=re.MULTILINE | re.IGNORECASE):
        if batch.strip():
            connection.exec_driver_sql(batch)
print('Script aplicado correctamente:', args.script)
