import copy
import json
from pathlib import Path

import pytest
from sqlalchemy import func, select

from app import models as m

CASES = json.loads((Path(__file__).parent / 'matrix_fixtures.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('payload', CASES, ids=[f"{case['method']}-{i}" for i, case in enumerate(CASES)])
def test_matrix_calculations_roundtrip(client, headers, database, payload, account_factory):
    assert client.post('/api/computacionales', json=payload).status_code == 401
    response = client.post('/api/computacionales', json=payload, headers=headers)
    assert response.status_code == 201, response.text
    record = response.json()
    assert {key: value for key, value in json.loads(record['input']).items() if value is not None} == payload['input']
    assert record['result']['value'] == payload['result']['value']
    assert record['result']['table'] == payload['result']['table']
    assert record['result']['steps'] == payload['result']['steps']
    assert [{key: value for key, value in step.items() if value is not None} for step in record['result']['matrixSteps']] == payload['result']['matrixSteps']
    record_id = int(record['id'].split(':')[1])
    assert client.get(f'/api/computacionales/{record_id}', headers=headers).json() == record
    assert client.get('/api/historial', headers=headers).json()[0] == record
    other = account_factory('otro@example.com', 'Otro')
    other_headers = {'Authorization': 'Bearer ' + other['token']}
    assert client.get(f'/api/computacionales/{record_id}', headers=other_headers).status_code == 404
    assert client.delete(f'/api/computacionales/{record_id}', headers=other_headers).status_code == 404
    with database[1]() as db:
        assert db.scalar(select(func.count()).select_from(m.Iteracion)) == 0
    assert client.delete(f'/api/computacionales/{record_id}', headers=headers).status_code == 204


@pytest.mark.parametrize('changes', [
    {'matrix': []}, {'matrix': [[1]]}, {'matrix': [[1, 2], [3]]},
    {'matrix': [[1e10, 2]]}, {'matrix': [[1, 2]] * 7},
    {'tolerance': 0}, {'tolerance': 1e-15}, {'tolerance': 1},
    {'method': 'matriz-invalida'}, {'secondMatrix': [[1, 2]]},
])
def test_invalid_matrix_inputs(client, headers, changes):
    payload = copy.deepcopy(CASES[0])
    payload['input'].update(changes)
    assert client.post('/api/computacionales', json=payload, headers=headers).status_code == 422


def test_sum_requires_matching_matrices(client, headers):
    payload = copy.deepcopy(CASES[-1])
    payload['input']['secondMatrix'] = [[1]]
    assert client.post('/api/computacionales', json=payload, headers=headers).status_code == 422


@pytest.mark.parametrize('field', ['table', 'matrixSteps'])
def test_matrix_procedures_are_required(client, headers, field):
    payload = copy.deepcopy(CASES[0])
    del payload['result'][field]
    assert client.post('/api/computacionales', json=payload, headers=headers).status_code == 422


@pytest.mark.parametrize('changes', [
    {'matrix': [[1, 2, 3], [4, 5, 6]]},
    {'matrix': [[1, 2], [3, 4], [5, 6]]},
    {'inverseOnly': False},
    {'method': 'matriz-reduccion'},
])
def test_inverse_requires_square_coefficients(client, headers, changes):
    payload = copy.deepcopy(next(case for case in CASES if case['input'].get('inverseOnly')))
    payload['input'].update(changes)
    assert client.post('/api/computacionales', json=payload, headers=headers).status_code == 422


@pytest.mark.parametrize('split', [0, 1, 4, None])
def test_inverse_block_separator_is_validated(client, headers, split):
    payload = copy.deepcopy(next(case for case in CASES if case['input'].get('inverseOnly')))
    payload['result']['matrixSteps'][0]['splitAt'] = split
    assert client.post('/api/computacionales', json=payload, headers=headers).status_code == 422
