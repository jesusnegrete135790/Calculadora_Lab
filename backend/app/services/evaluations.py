from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app import models as m


CATALOG = [
    {
        'module': 'logica', 'title': 'Evaluación de lógica matemática',
        'questions': [
            ('Si A=1 y B=0, ¿cuál es el valor de A ∧ B?', ['0','1','A','No se puede saber'], 'A', 'La conjunción solo es verdadera cuando ambas entradas son verdaderas.'),
            ('Si A=0, ¿cuál es el valor de ¬A?', ['0','1','A','Depende de B'], 'B', 'La negación invierte el valor de verdad: ¬0=1.'),
            ('¿En qué caso es falsa la implicación A → B?', ['A=0, B=0','A=0, B=1','A=1, B=0','A=1, B=1'], 'C', 'La implicación solo es falsa cuando el antecedente es verdadero y el consecuente falso.'),
            ('¿Cuál es el valor de A ↔ B cuando A=1 y B=1?', ['0','1','A ∨ B','No está definido'], 'B', 'El bicondicional es verdadero cuando los dos valores coinciden.'),
            ('¿Qué expresión es equivalente a ¬(A ∧ B)?', ['¬A ∧ ¬B','¬A ∨ ¬B','A ∨ B','A ∧ ¬B'], 'B', 'Por la ley de De Morgan, ¬(A ∧ B) equivale a ¬A ∨ ¬B.'),
        ],
    },
    {
        'module': 'finanzas', 'title': 'Evaluación de matemáticas financieras',
        'questions': [
            ('¿Cuánto interés simple produce un capital de $1,000 al 10% anual durante 2 años?', ['$100','$200','$1,200','$2,000'], 'B', 'I = C·i·t = 1,000·0.10·2 = $200.'),
            ('¿Cuál es el monto compuesto de $1,000 al 10% anual durante 2 años, con capitalización anual?', ['$1,100','$1,200','$1,210','$1,220'], 'C', 'M = C(1+i)^t = 1,000(1.10)^2 = $1,210.'),
            ('Si se descuentan $100 de un valor nominal de $1,000, ¿cuál es el valor actual?', ['$900','$1,000','$1,100','$100'], 'A', 'El valor actual es el valor nominal menos el descuento: 1,000−100=$900.'),
            ('¿Qué sucede con el saldo insoluto cuando un pago de amortización cubre intereses y capital?', ['Aumenta por el pago','Disminuye por el abono a capital','Permanece siempre igual','Se vuelve la tasa'], 'B', 'La parte del pago que abona al capital reduce el saldo insoluto.'),
            ('¿Cuál es el descuento comercial simple de $1,000 al 10% anual durante 1 año?', ['$10','$90','$100','$1,100'], 'C', 'D = N·d·t = 1,000·0.10·1 = $100.'),
        ],
    },
    {
        'module': 'computacionales', 'title': 'Evaluación de matemáticas computacionales',
        'questions': [
            ('¿Qué condición necesita el método de bisección en [a,b] para asegurar un cambio de signo?', ['f(a)·f(b) < 0','f(a)=f(b)','a=b','f(a)+f(b)=1'], 'A', 'Un producto negativo indica signos opuestos en los extremos.'),
            ('¿Qué información usa Newton–Raphson además de f(x)?', ['La derivada f′(x)','La mediana','Una tabla de frecuencias','El determinante'], 'A', 'Newton–Raphson actualiza x usando f(x)/f′(x).'),
            ('La recta que interpola (0,1) y (1,3), ¿qué valor estima en x=0.5?', ['1','1.5','2','3'], 'C', 'Entre esos puntos la recta es y=1+2x; en x=0.5 vale 2.'),
            ('Con Euler, y′=1, y₀=0 y paso h=0.1, ¿cuál es la primera aproximación de y?', ['0','0.01','0.1','1'], 'C', 'Euler calcula y₁=y₀+h·f(x₀,y₀)=0+0.1·1=0.1.'),
            ('¿Cuántas pendientes evalúa Runge–Kutta clásico de orden 4 por paso?', ['1','2','3','4'], 'D', 'El método RK4 combina cuatro pendientes por paso.'),
        ],
    },
    {
        'module': 'estadistica', 'title': 'Evaluación de probabilidad y estadística',
        'questions': [
            ('¿Cuál es la media de 2, 4 y 6?', ['3','4','5','12'], 'B', 'La media es (2+4+6)/3=4.'),
            ('¿Cuál es la mediana de 1, 3 y 9?', ['1','3','4','9'], 'B', 'El valor central de los datos ordenados es 3.'),
            ('En una binomial con n=2 y p=0.5, ¿cuál es P(X=1)?', ['0.25','0.5','0.75','1'], 'B', 'P(X=1)=C(2,1)(0.5)^1(0.5)^1=0.5.'),
            ('En Poisson con λ=2, ¿cuál es P(X=0)?', ['e⁻² ≈ 0.1353','0.5','e²','2'], 'A', 'P(X=0)=e^(-λ)λ⁰/0!=e⁻²≈0.1353.'),
            ('¿Cómo se estandariza un dato x en una distribución normal?', ['z=(x−μ)/σ','z=x+μ+σ','z=μ/(xσ)','z=(μ−σ)/x'], 'A', 'La puntuación z mide cuántas desviaciones estándar separan x de la media.'),
        ],
    },
]


def ensure_catalog(db: Session) -> list[m.Examen]:
    exams = []
    changed = False
    for item in CATALOG:
        exam = db.scalar(select(m.Examen).where(m.Examen.modulo == item['module']))
        if exam is None:
            exam = m.Examen(modulo=item['module'], titulo=item['title'], activo=True)
            db.add(exam)
            db.flush()
            changed = True
        count = db.scalar(select(func.count()).select_from(m.PreguntaExamen).where(m.PreguntaExamen.examen_id == exam.id))
        if count == 0:
            for order, (prompt, options, correct, explanation) in enumerate(item['questions'], 1):
                db.add(m.PreguntaExamen(
                    examen_id=exam.id, orden=order, enunciado=prompt,
                    opcion_a=options[0], opcion_b=options[1], opcion_c=options[2], opcion_d=options[3],
                    correcta=correct, explicacion=explanation,
                ))
            changed = True
        exams.append(exam)
    if changed:
        db.commit()
    return exams


def question_options(question: m.PreguntaExamen) -> dict[str, str]:
    return {'A': question.opcion_a, 'B': question.opcion_b, 'C': question.opcion_c, 'D': question.opcion_d}


def exam_questions(db: Session, exam_id: int) -> tuple[m.Examen, list[m.PreguntaExamen]]:
    exam = db.get(m.Examen, exam_id)
    if exam is None or not exam.activo:
        raise HTTPException(404, 'No se encontró la evaluación')
    questions = list(db.scalars(select(m.PreguntaExamen).where(m.PreguntaExamen.examen_id == exam.id).order_by(m.PreguntaExamen.orden)))
    if len(questions) != 5:
        raise HTTPException(503, 'El banco de preguntas de esta evaluación está incompleto')
    return exam, questions
