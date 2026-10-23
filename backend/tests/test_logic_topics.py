import copy
import json
from pathlib import Path

import pytest
from sqlalchemy import func, select

from app import models as m


# Results generated with calculateLogic from the TypeScript frontend.
CASES = json.loads((Path(__file__).parent / 'logic_fixtures.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('payload', CASES, ids=[f"{case['method']}-{i}" for i, case in enumerate(CASES)])
def test_new_logic_tools_roundtrip(client, headers, database, payload):
    response = client.post('/api/logica', json=payload, headers=headers)
    assert response.status_code == 201, response.text
    record = response.json()
    assert record['result']['value'] == payload['result']['value']
    assert record['result']['table'] == payload['result']['table']
    assert record['result']['steps'] == payload['result']['steps']
    assert json.loads(record['input']) == payload['input']
    record_id = int(record['id'].split(':')[1])
    assert client.get(f'/api/logica/{record_id}', headers=headers).json() == record
    assert client.get('/api/historial', headers=headers).json()[0] == record
    with database[1]() as db:
        parent = db.get(m.Logica, record_id)
        assert parent.expresion == (payload['input']['expression'] if payload['method'] == 'truth' else None)
        assert db.scalar(select(func.count()).select_from(m.FilaVerdad)) == (len(payload['result']['table']['rows']) if payload['method'] == 'truth' else 0)
        assert db.scalar(select(func.count()).select_from(m.Mapa)) == (1 if payload['method'] == 'truth' else 0)
    assert client.delete(f'/api/logica/{record_id}', headers=headers).status_code == 204
    with database[1]() as db:
        for model in [m.Logica, m.FilaVerdad, m.Mapa]:
            assert db.scalar(select(func.count()).select_from(model)) == 0


@pytest.mark.parametrize('method,updates', [
    ('argument', {'premises': 'A; B; C; D; A'}),
    ('argument', {'premises': ' ; '}),
    ('predicate', {'domain': 'NaN'}),
    ('predicate', {'domain': '1, Infinity'}),
    ('predicate', {'relation': 'invalid'}),
    ('induction', {'n': 0}),
    ('induction', {'n': 1001}),
    ('induction', {'n': 1.5}),
    ('induction', {'series': 'invalid'}),
])
def test_new_logic_inputs_are_validated(client, headers, method, updates):
    payload = copy.deepcopy(next(case for case in CASES if case['method'] == method))
    payload['input'].update(updates)
    assert client.post('/api/logica', json=payload, headers=headers).status_code == 422


@pytest.mark.parametrize('method', ['truth', 'equivalence', 'argument', 'consistency', 'predicate', 'induction'])
def test_logic_table_dimensions_are_validated(client, headers, method):
    payload = copy.deepcopy(next(case for case in CASES if case['method'] == method))
    payload['result']['table']['rows'].pop()
    assert client.post('/api/logica', json=payload, headers=headers).status_code == 422
