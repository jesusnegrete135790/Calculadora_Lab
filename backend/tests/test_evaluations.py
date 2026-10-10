from sqlalchemy import func, select
from app import models as m
from app.services.evaluations import CATALOG


def test_evaluations_catalog_hides_answer_key(client, headers):
    response = client.get('/api/evaluaciones', headers=headers)
    assert response.status_code == 200
    exams = response.json()
    assert len(exams) == 4
    assert all(exam['questionCount'] == 5 for exam in exams)
    detail = client.get(f"/api/evaluaciones/{exams[0]['id']}", headers=headers)
    assert detail.status_code == 200
    assert len(detail.json()['questions']) == 5
    assert 'correcta' not in detail.text.lower()
    assert 'correctOption' not in detail.text


def test_evaluation_attempt_is_graded_and_persisted(client, headers, database):
    exams = client.get('/api/evaluaciones', headers=headers).json()
    logic_exam = next(exam for exam in exams if exam['module'] == 'logica')
    detail = client.get(f"/api/evaluaciones/{logic_exam['id']}", headers=headers).json()
    correct_options = [question[2] for question in CATALOG[0]['questions']]
    payload = {'answers': [
        {'questionId': question['id'], 'option': correct}
        for question, correct in zip(detail['questions'], correct_options, strict=True)
    ]}
    result = client.post(f"/api/evaluaciones/{logic_exam['id']}/intentos", json=payload, headers=headers)
    assert result.status_code == 201, result.text
    attempt = result.json()
    assert (attempt['correct'], attempt['total'], float(attempt['score'])) == (5, 5, 100.0)
    assert all(answer['isCorrect'] for answer in attempt['answers'])
    with database[1]() as db:
        assert db.scalar(select(func.count()).select_from(m.ResultadoExamen)) == 1
        assert db.scalar(select(func.count()).select_from(m.RespuestaUsuario)) == 5
    history = client.get('/api/evaluaciones/historial', headers=headers)
    assert history.status_code == 200
    assert history.json()[0]['id'] == attempt['id']


def test_evaluation_requires_all_unique_answers_and_is_private(client, headers):
    exams = client.get('/api/evaluaciones', headers=headers).json()
    exam_id = exams[0]['id']
    questions = client.get(f'/api/evaluaciones/{exam_id}', headers=headers).json()['questions']
    incomplete = {'answers': [{'questionId': q['id'], 'option': 'A'} for q in questions[:4]]}
    assert client.post(f'/api/evaluaciones/{exam_id}/intentos', json=incomplete, headers=headers).status_code == 422
    duplicate = {'answers': [{'questionId': questions[0]['id'], 'option': 'A'} for _ in range(5)]}
    assert client.post(f'/api/evaluaciones/{exam_id}/intentos', json=duplicate, headers=headers).status_code == 422
    assert client.get('/api/evaluaciones').status_code == 401
    assert client.get('/api/evaluaciones/historial').status_code == 401
