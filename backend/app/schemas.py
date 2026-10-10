import math
import re
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

Text = Annotated[str, Field(min_length=1, max_length=255)]
Number = Annotated[Decimal, Field(allow_inf_nan=False)]
Finite = Annotated[float, Field(allow_inf_nan=False)]


class Schema(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Login(Schema):
    correo: EmailStr = Field(max_length=100)
    contrasena: str = Field(min_length=1, max_length=128)

    @field_validator('correo')
    @classmethod
    def normalize_email(cls, value):
        return value.lower()


class Register(Login):
    nombre: str = Field(min_length=1, max_length=100)
    contrasena: str = Field(min_length=10, max_length=128)

    @field_validator('nombre')
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError('El nombre no puede estar vacío')
        return value.strip()


class UserOut(Schema):
    id: int
    nombre: str
    correo: str
    rol: str


class SessionOut(Schema):
    token: str
    token_type: Literal['bearer'] = 'bearer'
    usuario: UserOut


class Step(Schema):
    title: Text
    detail: str = Field(max_length=20000)


class Table(Schema):
    columns: list[Text] = Field(min_length=1, max_length=16)
    rows: list[list[str | Finite]] = Field(max_length=1000)

    @model_validator(mode='after')
    def width(self):
        if any(len(row) != len(self.columns) for row in self.rows):
            raise ValueError('Las filas deben coincidir con las columnas')
        if any(isinstance(cell, str) and len(cell) > 500 for row in self.rows for cell in row):
            raise ValueError('Celda demasiado larga')
        return self


class Chart(Schema):
    labels: list[str] = Field(max_length=1001)
    values: list[Finite] = Field(max_length=1001)
    label: Text
    kind: Literal['line', 'bar'] | None = None
    shadeThroughIndex: int | None = Field(default=None, ge=-1, le=1000)

    @model_validator(mode='after')
    def matching(self):
        if len(self.labels) != len(self.values):
            raise ValueError('La gráfica requiere igual número de etiquetas y valores')
        return self


class Surface(Schema):
    x: list[Finite] = Field(min_length=3, max_length=41)
    y: list[Finite] = Field(min_length=3, max_length=41)
    z: list[list[Finite]] = Field(min_length=3, max_length=41)
    label: Text

    @model_validator(mode='after')
    def dimensions(self):
        if len(self.z) != len(self.y) or any(len(row) != len(self.x) for row in self.z):
            raise ValueError('Dimensiones de superficie inconsistentes')
        return self


class Cell(Schema):
    value: Literal[0, 1]
    minterm: int = Field(ge=0, le=15)
    groups: list[Annotated[int, Field(ge=0, le=15)]] = Field(max_length=16)


class LogicMap(Schema):
    rowLabels: list[str] = Field(min_length=1, max_length=4)
    columnLabels: list[str] = Field(min_length=1, max_length=8)
    cells: list[Cell] = Field(max_length=16)

    @model_validator(mode='after')
    def dimensions(self):
        if len(self.cells) != len(self.rowLabels) * len(self.columnLabels):
            raise ValueError('Mapa de Karnaugh inconsistente')
        return self


class NumericRow(Schema):
    numero: int = Field(ge=0, le=200)
    x: Number | None = None
    y: Number | None = None
    aproximado: Number | None = None
    error: Number | None = Field(default=None, ge=0)
    k1: Number | None = None
    k2: Number | None = None
    k3: Number | None = None
    k4: Number | None = None


class Metrics(Schema):
    media: Number
    desviacion: Number = Field(ge=0)
    asimetria: Number
    curtosis: Number


class Result(Schema):
    title: Text
    value: str = Field(min_length=1, max_length=2000)
    subtitle: str | None = Field(default=None, max_length=2000)
    steps: list[Step] = Field(max_length=100)
    table: Table | None = None
    chart: Chart | None = None
    charts: list[Chart] | None = Field(default=None, max_length=10)
    surface3d: Surface | None = None
    logicMap: LogicMap | None = None
    circuitTerms: list[list[str]] | None = Field(default=None, max_length=16)
    note: str | None = Field(default=None, max_length=5000)
    numericRows: list[NumericRow] | None = Field(default=None, max_length=201)
    polynomial: str | None = Field(default=None, max_length=10000)
    metrics: Metrics | None = None


class FinanceInput(Schema):
    method: Literal['simple','compuesto','valor-actual','descuento-comercial','descuento-racional','descuento-serie','tasa-equivalente','amortizacion']
    capital: Number = Field(gt=0, lt=Decimal('1e16'))
    annualRate: Number = Field(ge=0, lt=10000)
    years: Number = Field(gt=0, lt=1000000)
    periods: int = Field(ge=1, le=10000)
    extraPayment: Number = Field(ge=0)
    secondaryRate: Number = Field(default=0, ge=0)
    targetPeriods: int = Field(default=12, ge=1, le=10000)
    rateChanges: str = Field(default='', max_length=10000)
    partialPayments: str = Field(default='', max_length=10000)

    @model_validator(mode='after')
    def validate_method(self):
        if self.method == 'descuento-serie' and (self.annualRate >= 100 or self.secondaryRate >= 100):
            raise ValueError('Los descuentos deben ser menores a 100%')
        if self.method == 'amortizacion':
            count = math.floor(self.years * self.periods + Decimal('.5'))
            if not 1 <= count <= 600:
                raise ValueError('La amortización requiere entre 1 y 600 periodos')
            for source, is_rate in [(self.rateChanges, True), (self.partialPayments, False)]:
                for entry in re.split(r'[,;\n]+', source):
                    if not entry.strip():
                        continue
                    match = re.fullmatch(r'\s*(\d+)\s*:\s*(\d+(?:\.\d+)?)\s*', entry)
                    if not match or not 1 <= int(match[1]) <= count:
                        raise ValueError('Regla de amortización inválida')
                    number = Decimal(match[2])
                    if (is_rate and number > 100) or (not is_rate and (number <= 0 or number >= Decimal('1e12'))):
                        raise ValueError('Monto o tasa de regla fuera de rango')
        return self


class NumericInput(Schema):
    method: Literal['biseccion','newton','lagrange','newton-interpolacion','euler','euler-mejorado','runge-kutta','superficie-3d']
    expression: Text
    a: Number
    b: Number
    x0: Number
    y0: Number
    tolerance: Number = Field(gt=0)
    iterations: int = Field(ge=1, le=200)
    points: str = Field(max_length=10000)
    yMin: Number = -2
    yMax: Number = 2

    @model_validator(mode='after')
    def intervals(self):
        if self.method in ['biseccion','euler','euler-mejorado','runge-kutta','superficie-3d'] and self.b <= self.a:
            raise ValueError('Intervalo creciente requerido')
        if self.method == 'superficie-3d' and self.yMax <= self.yMin:
            raise ValueError('Intervalo y creciente requerido')
        if self.method in ['lagrange','newton-interpolacion']:
            points = [p.strip().split(',') for p in re.split(r'[;\n]+', self.points) if p.strip()]
            if not 2 <= len(points) <= 12 or any(len(p) != 2 for p in points):
                raise ValueError('Se requieren entre 2 y 12 puntos x,y')
            try:
                values = [[Decimal(v.strip()) for v in p] for p in points]
                if any(not v.is_finite() or abs(v) >= Decimal('1e12') for p in values for v in p):
                    raise ValueError('Punto fuera de rango')
                if len({p[0] for p in values}) != len(values):
                    raise ValueError('Los valores x no pueden repetirse')
            except ArithmeticError:
                raise ValueError('Puntos inválidos') from None
        return self


class StatisticsInput(Schema):
    method: Literal['descriptiva','binomial','poisson','normal']
    data: str = Field(max_length=20000)
    n: int = Field(ge=0, le=170)
    k: int = Field(ge=0, le=170)
    p: Number = Field(ge=0, le=1)
    lambda_: Number = Field(alias='lambda', ge=0, le=100)
    mean: Number
    deviation: Number = Field(gt=0)
    x: Number

    @model_validator(mode='after')
    def method_constraints(self):
        if self.method == 'binomial' and self.k > self.n:
            raise ValueError('k no puede ser mayor a n')
        if self.method == 'descriptiva':
            try:
                values = [Decimal(v) for v in re.split(r'[\s,;]+', self.data.strip()) if v]
                if not 1 <= len(values) <= 1000 or any(not v.is_finite() or abs(v) >= Decimal('1e12') for v in values):
                    raise ValueError('Se requieren entre 1 y 1000 datos finitos')
            except ArithmeticError:
                raise ValueError('Datos inválidos') from None
        return self


class Calculation(Schema):
    method: str = Field(min_length=1, max_length=50)
    result: Result

    @model_validator(mode='after')
    def total_size(self):
        if len(self.model_dump_json().encode()) > 1_000_000:
            raise ValueError('El cálculo excede 1 MB')
        return self


class LogicCalculation(Calculation):
    input: str = Field(min_length=1, max_length=255)

    @model_validator(mode='after')
    def truth_rows(self):
        if self.result.table:
            width = len(self.result.table.columns) - 1
            if not 1 <= width <= 4 or len(self.result.table.rows) != 2 ** width or any(v not in [0, 1] for row in self.result.table.rows for v in row):
                raise ValueError('Tabla de verdad inválida')
        return self


class FinanceCalculation(Calculation):
    input: FinanceInput

    @model_validator(mode='after')
    def schedule(self):
        if self.input.method == 'amortizacion':
            if not self.result.table or not 1 <= len(self.result.table.rows) <= 600 or len(self.result.table.columns) != 7:
                raise ValueError('Tabla de amortización de siete columnas requerida')
        return self


class NumericCalculation(Calculation):
    input: NumericInput

    @model_validator(mode='after')
    def required_details(self):
        method = self.input.method
        if method in ['biseccion', 'newton'] and self.result.table:
            rows = self.result.table.rows
            if len(self.result.table.columns) != 6 or len(rows) > self.input.iterations or any(row[0] != index or not isinstance(row[5], (float, int)) or row[5] < 0 for index, row in enumerate(rows, 1)):
                raise ValueError('Tabla de iteraciones inválida')
        if method in ['lagrange', 'newton-interpolacion'] and (not self.result.polynomial or not self.result.table):
            raise ValueError('El polinomio y su tabla son requeridos')
        if method in ['lagrange', 'newton-interpolacion'] and self.result.table:
            if len(self.result.table.columns) != (5 if method == 'lagrange' else 4) or len(self.result.table.rows) > 12:
                raise ValueError('Tabla de interpolación inválida')
        if method in ['euler', 'euler-mejorado', 'runge-kutta']:
            rows = self.result.numericRows
            if not rows or len(rows) != self.input.iterations + 1:
                raise ValueError('Se requieren todas las iteraciones de la EDO')
            for index, row in enumerate(rows):
                required = ['x', 'y'] + (['k1', 'k2', 'k3', 'k4'] if method == 'runge-kutta' and index else ['k1', 'k2'] if method == 'euler-mejorado' and index else ['k1'] if index else [])
                if row.numero != index or any(getattr(row, key) is None for key in required):
                    raise ValueError('Iteración incompleta o fuera de secuencia')
        return self


class StatisticsCalculation(Calculation):
    input: StatisticsInput

    @model_validator(mode='after')
    def frequencies(self):
        if self.input.method == 'descriptiva' and (not self.result.metrics or not self.result.table or len(self.result.table.columns) != 4):
            raise ValueError('Métricas y tabla de frecuencias requeridas')
        return self


class HistoryOut(Schema):
    id: str
    module: Literal['logica','finanzas','computacionales','estadistica']
    method: str
    input: str
    result: Result
    createdAt: str


class Question(Schema):
    pregunta: str = Field(min_length=1, max_length=4000)
    moduloRelacionado: Literal['Lógica matemática','Matemáticas financieras','Matemáticas computacionales','Probabilidad y estadística']

    @field_validator('pregunta')
    @classmethod
    def not_empty(cls, value):
        if not value.strip():
            raise ValueError('Escribe una pregunta')
        return value.strip()


class AssistanceOut(Schema):
    id: int
    moduloRelacionado: str
    pregunta: str
    respuesta: str
    fecha: str


class ExamSummary(Schema):
    id: int
    module: Literal['logica','finanzas','computacionales','estadistica']
    title: Text
    questionCount: int


class ExamQuestion(Schema):
    id: int
    order: int
    prompt: str
    options: dict[Literal['A','B','C','D'], str]


class ExamDetail(ExamSummary):
    questions: list[ExamQuestion]


class ExamAnswerInput(Schema):
    questionId: int = Field(ge=1)
    option: Literal['A','B','C','D']


class ExamAttemptSubmit(Schema):
    answers: list[ExamAnswerInput] = Field(min_length=5, max_length=5)


class ExamAnswerOut(Schema):
    questionId: int
    prompt: str
    selected: Literal['A','B','C','D']
    correctOption: Literal['A','B','C','D']
    isCorrect: bool
    explanation: str


class ExamAttemptOut(Schema):
    id: int
    examId: int
    module: Literal['logica','finanzas','computacionales','estadistica']
    title: Text
    correct: int
    total: int
    score: Number = Field(ge=0, le=100)
    createdAt: str
    answers: list[ExamAnswerOut]
