import json
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_EVEN, localcontext
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from app import models as m
from app.repositories import PARENTS
from app.schemas import HistoryOut


def number(value, scale=6, precision=18):
    """Only parse numeric display fields in their known es-MX format."""
    if value is None:
        return None
    try:
        raw = str(value).replace('$', '').replace(',', '').replace('%', '').strip()
        with localcontext() as ctx:
            ctx.prec = 40
            value = Decimal(raw)
            if not value.is_finite():
                raise ValueError()
            value = value.quantize(Decimal(1).scaleb(-scale), rounding=ROUND_HALF_EVEN)
            if abs(value) >= Decimal(10) ** (precision - scale):
                raise ValueError()
            return value
    except (InvalidOperation, ValueError):
        raise HTTPException(422, 'Un valor numérico no cabe en la precisión SQL o tiene formato inválido') from None


def serialize(module, record):
    result = json.loads(record.resultado_json) if record.resultado_json else {
        'title': 'Registro anterior a la integración',
        'value': str(next((getattr(record, key, None) for key in ['resultado', 'raiz'] if getattr(record, key, None) is not None), 'Sin resultado detallado')),
        'steps': [], 'note': 'El esquema anterior no conservaba el procedimiento ni las gráficas. Se muestra únicamente el valor disponible.'}
    return HistoryOut(id=f'{module}:{record.id}', module='estadistica' if module == 'distribuciones' else module, method=record.metodo or 'Operación anterior', input=record.entrada_json or 'null', result=result, createdAt=record.fecha.isoformat() + 'Z')


def rules(source, accumulate=False):
    parsed = {}
    for entry in re.split(r'[,;\n]+', source):
        if not entry.strip():
            continue
        period, value = entry.split(':')
        period, value = int(period), Decimal(value.strip())
        parsed[period] = parsed.get(period, Decimal(0)) + value if accumulate else value
    return parsed


def save(db, module, payload, user_id):
    inp, result = payload.input, payload.result
    data = {'usuario_id': user_id, 'metodo': payload.method,
            'entrada_json': json.dumps(inp, ensure_ascii=False) if isinstance(inp, str) else inp.model_dump_json(by_alias=True),
            'resultado_json': result.model_dump_json(exclude_none=True)}
    rows = result.table.rows if result.table else []
    children = []
    if module == 'logica':
        data.update(expresion=inp, resultado=result.value)
        for row in rows:
            children.append(m.FilaVerdad(variables=json.dumps([int(v) for v in row[:-1]]), resultado=bool(row[-1])))
        if result.logicMap:
            children.append(m.Mapa(grupos=result.logicMap.model_dump_json(), circuito=json.dumps(result.circuitTerms or [], ensure_ascii=False)))
    elif module == 'finanzas':
        data.update(capital=number(inp.capital, 2), tasa=number(inp.annualRate, 4, 8), tiempo=number(inp.years, 2, 8))
        data['resultado'] = number(result.value, 2)
        if inp.method.startswith('descuento'):
            data['descuento'] = inp.method
        if inp.method == 'tasa-equivalente':
            data['tasa_equivalente'] = number(result.value, 4, 8)
        if inp.method == 'amortizacion':
            for i, row in enumerate(rows, 1):
                if number(row[0], 0) != i:
                    raise HTTPException(422, 'Periodos de amortización inconsistentes')
                values = [number(v, 2) for v in row[2:]]
                if any(v < 0 for v in values):
                    raise HTTPException(422, 'Los importes de amortización no pueden ser negativos')
                children.append(m.FilaAmortizacion(periodo=i, inicial=values[0], interes=values[1], capital=values[2], pago=values[3], final=values[4]))
            changes, payments = rules(inp.rateChanges), rules(inp.partialPayments, True)
            for period in sorted(changes.keys() | payments.keys()):
                children.append(m.Regla(periodo=period, tasa=number(changes.get(period), 4, 8), pago=number(payments.get(period), 2)))
    elif module == 'computacionales':
        data['funcion'] = inp.expression
        if inp.method in ['biseccion', 'newton']:
            data['raiz'] = number(result.value)
        data['polinomio'] = result.polynomial
        if result.numericRows is not None:
            for row in result.numericRows:
                children.append(m.Iteracion(numero=row.numero, **{key: number(getattr(row, key)) for key in ['x','y','aproximado','error','k1','k2','k3','k4']}))
        elif rows and inp.method in ['biseccion', 'newton']:
            for row in rows:
                children.append(m.Iteracion(numero=int(number(row[0], 0)), x=number(row[3] if inp.method == 'biseccion' else row[1]), y=number(row[4] if inp.method == 'biseccion' else row[2]), aproximado=number(row[3] if inp.method == 'biseccion' else row[4]), error=number(row[5])))
        elif rows and inp.method in ['lagrange', 'newton-interpolacion']:
            for row in rows:
                children.append(m.Iteracion(numero=int(number(row[0], 0)), x=number(row[1]) if inp.method == 'lagrange' else None, y=number(row[2]) if inp.method == 'lagrange' else None, aproximado=number(row[4] if inp.method == 'lagrange' else row[3])))
    elif module == 'estadistica':
        if inp.method != 'descriptiva':
            raise HTTPException(422, 'Guarda las distribuciones en /api/distribuciones')
        data.update(datos=inp.data, resultado=number(result.value, 4))
        for key in ['media', 'desviacion', 'asimetria', 'curtosis']:
            data[key] = number(getattr(result.metrics, key), 4)
        cumulative = 0
        for row in rows:
            absolute, accumulated = number(row[1], 0), number(row[3], 0)
            relative = number(row[2], 4)
            if Decimal(str(row[1])) != absolute or Decimal(str(row[3])) != accumulated or absolute <= 0 or not 0 <= relative <= 1:
                raise HTTPException(422, 'Frecuencias inválidas')
            cumulative += int(absolute)
            if cumulative != accumulated:
                raise HTTPException(422, 'Frecuencia acumulada inconsistente')
            children.append(m.Frecuencia(clase=str(row[0]), absoluta=int(absolute), relativa=relative, acumulada=int(accumulated)))
        count = len([v for v in re.split(r'[\s,;]+', inp.data.strip()) if v])
        if cumulative != count:
            raise HTTPException(422, 'La tabla no coincide con el total de datos')
    else:
        if inp.method == 'descriptiva':
            raise HTTPException(422, 'Guarda la descriptiva en /api/estadistica')
        probability = number(result.value)
        if not 0 <= probability <= 1:
            raise HTTPException(422, 'Probabilidad fuera de [0,1]')
        data.update(parametros=inp.model_dump_json(by_alias=True), resultado=probability)
        if inp.method == 'normal':
            data.update(z=number((inp.x-inp.mean)/inp.deviation, 4), area=number(probability, 4), aproximacion='Aproximación numérica erf del frontend')
    parent = PARENTS[module](**data)
    try:
        db.add(parent)
        db.flush()
        for child in children:
            child.padre_id = parent.id
        db.add_all(children)
        db.flush()
        db.commit()
        # SQL Server DATETIME rounds to 1/300 s. Return the stored timestamp,
        # so POST and subsequent GET return the same canonical representation.
        db.refresh(parent)
    except SQLAlchemyError:
        db.rollback()
        raise
    return serialize(module, parent)
