from collections import defaultdict, deque
from decimal import Decimal
from threading import Lock
from time import monotonic
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select, union_all, literal
from sqlalchemy.orm import Session
from app import models as m, schemas as s, repositories as repo
from app.database import get_db
from app.core.security import current_user, require_role, create_token, hasher, verify_password, DUMMY_HASH
from app.services.calculations import save, serialize
from app.services.ai_service import AIProvider, get_ai_provider
from app.services.evaluations import ensure_catalog, exam_questions, question_options
from app.services.users import create_user, update_user, delete_user, ensure_email_available, commit_user

router = APIRouter(prefix='/api')


class RateLimiter:
    """Bounded single-process development limiter. Use a shared gateway for multiworker deployments."""
    def __init__(self):
        self.entries = defaultdict(deque)
        self.lock = Lock()

    def check(self, key, maximum):
        now = monotonic()
        with self.lock:
            if len(self.entries) > 10000:
                self.entries = defaultdict(deque, {k: v for k, v in self.entries.items() if v and v[-1] > now - 60})
                if len(self.entries) > 10000:
                    raise HTTPException(429, 'Servidor ocupado. Intenta más tarde.')
            attempts = self.entries[key]
            while attempts and attempts[0] <= now - 60:
                attempts.popleft()
            if len(attempts) >= maximum:
                raise HTTPException(429, 'Demasiadas solicitudes. Intenta en un minuto.', headers={'Retry-After': '60'})
            attempts.append(now)


limiter = RateLimiter()


def user_out(user):
    return s.UserOut(id=user.id, nombre=user.nombre, correo=user.correo, rol=user.rol, activo=user.activo)


@router.post('/auth/register', tags=['Auth'], response_model=s.SessionOut, status_code=201)
def register(payload: s.Register, request: Request, db: Session = Depends(get_db)):
    limiter.check(('register', request.client.host if request.client else 'unknown'), 10)
    ensure_email_available(db, str(payload.correo))
    user = m.Usuario(nombre=payload.nombre, correo=str(payload.correo),
                     contrasena=hasher.hash(payload.contrasena), rol='Usuario', activo=True)
    db.add(user)
    commit_user(db, user)
    return s.SessionOut(token=create_token(user.id, user.token_version), usuario=user_out(user))


@router.post('/auth/login', tags=['Auth'], response_model=s.SessionOut)
def login(payload: s.Login, request: Request, db: Session = Depends(get_db)):
    limiter.check(('login', request.client.host if request.client else 'unknown'), 10)
    user = db.scalar(select(m.Usuario).where(m.Usuario.correo == str(payload.correo)))
    valid = verify_password(payload.contrasena, user.contrasena if user else DUMMY_HASH)
    if not user or not valid or not user.activo:
        raise HTTPException(401, 'Correo o contraseña incorrectos', headers={'WWW-Authenticate': 'Bearer'})
    if hasher.check_needs_rehash(user.contrasena):
        user.contrasena = hasher.hash(payload.contrasena)
        db.commit()
    return s.SessionOut(token=create_token(user.id, user.token_version), usuario=user_out(user))


@router.get('/auth/me', tags=['Usuarios'], response_model=s.UserOut)
def me(user: m.Usuario = Depends(current_user)):
    return user_out(user)


@router.get('/usuarios', tags=['Usuarios'], response_model=list[s.UserOut])
def users(offset: int = Query(0, ge=0, le=100000), limit: int = Query(50, ge=1, le=100), q: str = Query('', max_length=100), rol: s.UserRole | None = None, activo: bool | None = None, admin: m.Usuario = Depends(require_role('Administrador')), db: Session = Depends(get_db)):
    return [user_out(u) for u in repo.users(db, offset, limit, q.strip(), rol, activo)]


@router.get('/usuarios/roles', tags=['Usuarios'], response_model=list[s.UserRole])
def user_roles(admin: m.Usuario = Depends(require_role('Administrador'))):
    return list(s.UserRole.__args__)


@router.post('/usuarios', tags=['Usuarios'], response_model=s.UserOut, status_code=201)
def user_create(payload: s.UserCreate, admin: m.Usuario = Depends(require_role('Administrador')), db: Session = Depends(get_db)):
    return user_out(create_user(db, payload, admin))


@router.get('/usuarios/{user_id}', tags=['Usuarios'], response_model=s.UserOut)
def user_detail(user_id: int, admin: m.Usuario = Depends(require_role('Administrador')), db: Session = Depends(get_db)):
    if user_id < 1:
        raise HTTPException(422, 'ID inválido')
    return user_out(repo.user_by_id(db, user_id))


@router.patch('/usuarios/{user_id}', tags=['Usuarios'], response_model=s.UserOut)
def user_update(user_id: int, payload: s.UserUpdate, admin: m.Usuario = Depends(require_role('Administrador')), db: Session = Depends(get_db)):
    if user_id < 1:
        raise HTTPException(422, 'ID inválido')
    return user_out(update_user(db, user_id, payload, admin))


@router.delete('/usuarios/{user_id}', tags=['Usuarios'], status_code=204)
def user_delete(user_id: int, admin: m.Usuario = Depends(require_role('Administrador')), db: Session = Depends(get_db)):
    if user_id < 1:
        raise HTTPException(422, 'ID inválido')
    delete_user(db, user_id, admin)
    return Response(status_code=204)


def calculation_routes(module, schema, tag):
    group = APIRouter(prefix='/' + module, tags=[tag])

    def create(payload: schema, user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
        return save(db, module, payload, user.id)

    def listing(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
        return [serialize(module, r) for r in repo.history(db, module, user.id, offset, limit)]

    def detail(record_id: int, user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
        if record_id < 1:
            raise HTTPException(422, 'ID inválido')
        return serialize(module, repo.owned(db, module, record_id, user.id))

    def remove(record_id: int, user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
        if record_id < 1:
            raise HTTPException(422, 'ID inválido')
        repo.remove(db, module, repo.owned(db, module, record_id, user.id))
        return Response(status_code=204)

    group.add_api_route('', create, methods=['POST'], response_model=s.HistoryOut, status_code=201, name='guardar_' + module)
    group.add_api_route('', listing, methods=['GET'], response_model=list[s.HistoryOut], name='historial_' + module)
    group.add_api_route('/{record_id}', detail, methods=['GET'], response_model=s.HistoryOut, name='detalle_' + module)
    group.add_api_route('/{record_id}', remove, methods=['DELETE'], status_code=204, name='eliminar_' + module)
    return group


for module, schema, tag in [('logica', s.LogicCalculation, 'Lógica'), ('finanzas', s.FinanceCalculation, 'Finanzas'), ('computacionales', s.NumericCalculation, 'Matemáticas Computacionales'), ('estadistica', s.StatisticsCalculation, 'Estadística'), ('distribuciones', s.StatisticsCalculation, 'Distribuciones')]:
    router.include_router(calculation_routes(module, schema, tag))


@router.get('/historial', tags=['Historial'], response_model=list[s.HistoryOut])
def all_history(offset: int = Query(0, ge=0, le=100000), limit: int = Query(50, ge=1, le=100), user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
    combined = union_all(*[select(literal(module).label('modulo'), cls.id.label('id'), cls.fecha.label('fecha')).where(cls.usuario_id == user.id) for module, cls in repo.PARENTS.items()]).subquery()
    page = db.execute(select(combined).order_by(combined.c.fecha.desc(), combined.c.modulo, combined.c.id.desc()).offset(offset).limit(limit)).all()
    return [serialize(row.modulo, repo.owned(db, row.modulo, row.id, user.id)) for row in page]


def exam_summary(exam, count=5):
    return {'id': exam.id, 'module': exam.modulo, 'title': exam.titulo, 'questionCount': count}


def exam_attempt_out(db, record):
    exam = db.get(m.Examen, record.examen_id)
    rows = db.execute(
        select(m.RespuestaUsuario, m.PreguntaExamen)
        .join(m.PreguntaExamen, m.PreguntaExamen.id == m.RespuestaUsuario.pregunta_id)
        .where(m.RespuestaUsuario.resultado_id == record.id)
        .order_by(m.PreguntaExamen.orden)
    ).all()
    answers = [{
        'questionId': question.id, 'prompt': question.enunciado,
        'selected': answer.seleccionada, 'correctOption': question.correcta,
        'isCorrect': answer.correcta, 'explanation': question.explicacion,
    } for answer, question in rows]
    return {
        'id': record.id, 'examId': exam.id, 'module': exam.modulo, 'title': exam.titulo,
        'correct': record.aciertos, 'total': record.total, 'score': record.calificacion,
        'createdAt': record.fecha.isoformat() + 'Z', 'answers': answers,
    }


@router.get('/evaluaciones', tags=['Evaluaciones'], response_model=list[s.ExamSummary])
def evaluation_list(user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
    exams = ensure_catalog(db)
    return [exam_summary(exam) for exam in exams if exam.activo]


@router.get('/evaluaciones/historial', tags=['Evaluaciones'], response_model=list[s.ExamAttemptOut])
def evaluation_history(offset: int = Query(0, ge=0, le=100000), limit: int = Query(50, ge=1, le=100), user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
    ensure_catalog(db)
    records = db.scalars(
        select(m.ResultadoExamen).where(m.ResultadoExamen.usuario_id == user.id)
        .order_by(m.ResultadoExamen.fecha.desc(), m.ResultadoExamen.id.desc())
        .offset(offset).limit(limit)
    )
    return [exam_attempt_out(db, record) for record in records]


@router.get('/evaluaciones/intentos/{attempt_id}', tags=['Evaluaciones'], response_model=s.ExamAttemptOut)
def evaluation_attempt_detail(attempt_id: int, user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
    if attempt_id < 1:
        raise HTTPException(422, 'ID inválido')
    record = db.scalar(select(m.ResultadoExamen).where(m.ResultadoExamen.id == attempt_id, m.ResultadoExamen.usuario_id == user.id))
    if record is None:
        raise HTTPException(404, 'No se encontró el intento solicitado')
    return exam_attempt_out(db, record)


@router.get('/evaluaciones/{exam_id}', tags=['Evaluaciones'], response_model=s.ExamDetail)
def evaluation_detail(exam_id: int, user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
    ensure_catalog(db)
    exam, questions = exam_questions(db, exam_id)
    return {**exam_summary(exam), 'questions': [{
        'id': question.id, 'order': question.orden, 'prompt': question.enunciado,
        'options': question_options(question),
    } for question in questions]}


@router.post('/evaluaciones/{exam_id}/intentos', tags=['Evaluaciones'], response_model=s.ExamAttemptOut, status_code=201)
def submit_evaluation(exam_id: int, payload: s.ExamAttemptSubmit, user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
    ensure_catalog(db)
    exam, questions = exam_questions(db, exam_id)
    submitted = [answer.model_dump() for answer in payload.answers]
    question_ids = [answer['questionId'] for answer in submitted]
    expected_ids = {question.id for question in questions}
    if len(set(question_ids)) != len(question_ids) or set(question_ids) != expected_ids:
        raise HTTPException(422, 'Envía una respuesta para cada pregunta de esta evaluación')
    choices = {answer['questionId']: answer['option'] for answer in submitted}
    correct = sum(choices[question.id] == question.correcta for question in questions)
    score = (Decimal(correct) * Decimal(100) / Decimal(len(questions))).quantize(Decimal('0.01'))
    record = m.ResultadoExamen(
        usuario_id=user.id, examen_id=exam.id, aciertos=correct,
        total=len(questions), calificacion=score,
    )
    try:
        db.add(record)
        db.flush()
        db.add_all([m.RespuestaUsuario(
            resultado_id=record.id, pregunta_id=question.id,
            seleccionada=choices[question.id], correcta=choices[question.id] == question.correcta,
        ) for question in questions])
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        raise
    return exam_attempt_out(db, record)


@router.post('/asistente/preguntar', tags=['Asistente IA'], response_model=s.AssistanceOut)
async def ask(payload: s.Question, user: m.Usuario = Depends(current_user), db: Session = Depends(get_db), provider: AIProvider = Depends(get_ai_provider)):
    limiter.check(('ai', user.id), 5)
    answer = await provider.answer(payload.pregunta, payload.moduloRelacionado)
    record = m.Asistencia(usuario_id=user.id, modulo=payload.moduloRelacionado, pregunta=payload.pregunta, respuesta=answer)
    db.add(record)
    db.commit()
    db.refresh(record)
    return assistance_out(record)


def assistance_out(record):
    return s.AssistanceOut(id=record.id, moduloRelacionado=record.modulo, pregunta=record.pregunta, respuesta=record.respuesta, fecha=record.fecha.isoformat() + 'Z')


@router.get('/asistente/historial', tags=['Asistente IA'], response_model=list[s.AssistanceOut])
def assistant_history(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), user: m.Usuario = Depends(current_user), db: Session = Depends(get_db)):
    return [assistance_out(r) for r in db.scalars(select(m.Asistencia).where(m.Asistencia.usuario_id == user.id).order_by(m.Asistencia.fecha.desc(), m.Asistencia.id.desc()).offset(offset).limit(limit))]
