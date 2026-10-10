from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Unicode, UnicodeText, String, Numeric, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.mssql import NVARCHAR
from app.database import Base

# NVARCHAR(MAX) on SQL Server, portable TEXT only for isolated SQLite tests.
LongText = UnicodeText().with_variant(NVARCHAR(None), 'mssql')

def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class Usuario(Base):
    __tablename__ = 'Usuarios'
    id = Column('IdUsuario', Integer, primary_key=True)
    nombre = Column('Nombre', Unicode(100), nullable=False)
    correo = Column('Correo', String(100), nullable=False, unique=True)
    contrasena = Column('Contrasena', String(255), nullable=False)
    rol = Column('Rol', String(20), nullable=False, default='Usuario')
    fecha = Column('FechaRegistro', DateTime, nullable=False, default=now)
    __table_args__ = (CheckConstraint("Rol IN ('Usuario','Administrador')", name='CK_Usuarios_Rol'),)

class Logica(Base):
    __tablename__ = 'LogicaMatematica'
    id = Column('IdLogica', Integer, primary_key=True)
    usuario_id = Column('IdUsuario', Integer, ForeignKey('Usuarios.IdUsuario'), nullable=False, index=True)
    fecha = Column('Fecha', DateTime, nullable=False, default=now)
    entrada_json = Column('EntradaJSON', LongText, nullable=False)
    resultado_json = Column('ResultadoJSON', LongText, nullable=False)
    expresion = Column('ExpresionBooleana', Unicode(255), nullable=True)
    metodo = Column('TipoEjercicio', Unicode(50), nullable=False)
    resultado = Column('Resultado', LongText, nullable=True)

class Finanzas(Base):
    __tablename__ = 'MatematicasFinancieras'
    id = Column('IdFinanzas', Integer, primary_key=True)
    usuario_id = Column('IdUsuario', Integer, ForeignKey('Usuarios.IdUsuario'), nullable=False, index=True)
    fecha = Column('Fecha', DateTime, nullable=False, default=now)
    entrada_json = Column('EntradaJSON', LongText, nullable=False)
    resultado_json = Column('ResultadoJSON', LongText, nullable=False)
    metodo = Column('TipoOperacion', Unicode(50), nullable=False)
    capital = Column('Capital', Numeric(18,2), nullable=True)
    tasa = Column('TasaInteres', Numeric(8,4), nullable=True)
    tiempo = Column('Tiempo', Numeric(8,2), nullable=True)
    descuento = Column('TipoDescuento', Unicode(50), nullable=True)
    tasa_equivalente = Column('TasaEquivalente', Numeric(8,4), nullable=True)
    resultado = Column('Resultado', Numeric(18,2), nullable=True)

class Computacional(Base):
    __tablename__ = 'MatematicasComputacionales'
    id = Column('IdCalculo', Integer, primary_key=True)
    usuario_id = Column('IdUsuario', Integer, ForeignKey('Usuarios.IdUsuario'), nullable=False, index=True)
    fecha = Column('Fecha', DateTime, nullable=False, default=now)
    entrada_json = Column('EntradaJSON', LongText, nullable=False)
    resultado_json = Column('ResultadoJSON', LongText, nullable=False)
    metodo = Column('MetodoUtilizado', Unicode(50), nullable=False)
    funcion = Column('FuncionPolinomio', Unicode(255), nullable=True)
    raiz = Column('RaizResultado', Numeric(18,6), nullable=True)
    polinomio = Column('PolinomioInterpolacion', LongText, nullable=True)

class Estadistica(Base):
    __tablename__ = 'ProbabilidadEstadistica'
    id = Column('IdProbabilidad', Integer, primary_key=True)
    usuario_id = Column('IdUsuario', Integer, ForeignKey('Usuarios.IdUsuario'), nullable=False, index=True)
    fecha = Column('Fecha', DateTime, nullable=False, default=now)
    entrada_json = Column('EntradaJSON', LongText, nullable=False)
    resultado_json = Column('ResultadoJSON', LongText, nullable=False)
    metodo = Column('TipoCalculo', Unicode(50), nullable=False)
    datos = Column('Datos', LongText, nullable=True)
    media = Column('Media', Numeric(18,4), nullable=True)
    desviacion = Column('DesviacionEstandar', Numeric(18,4), nullable=True)
    asimetria = Column('Asimetria', Numeric(18,4), nullable=True)
    curtosis = Column('Curtosis', Numeric(18,4), nullable=True)
    resultado = Column('ResultadoFinal', Numeric(18,4), nullable=True)

class Distribucion(Base):
    __tablename__ = 'DistribucionesProbabilidad'
    id = Column('IdDistribucion', Integer, primary_key=True)
    usuario_id = Column('IdUsuario', Integer, ForeignKey('Usuarios.IdUsuario'), nullable=False, index=True)
    fecha = Column('Fecha', DateTime, nullable=False, default=now)
    entrada_json = Column('EntradaJSON', LongText, nullable=False)
    resultado_json = Column('ResultadoJSON', LongText, nullable=False)
    metodo = Column('TipoDistribucion', Unicode(50), nullable=False)
    parametros = Column('ParametrosEntrada', LongText, nullable=True)
    z = Column('ValorZ', Numeric(18,4), nullable=True)
    area = Column('AreaBajoCurva', Numeric(18,4), nullable=True)
    aproximacion = Column('AproximacionAplicada', Unicode(100), nullable=True)
    resultado = Column('ResultadoProbabilidad', Numeric(18,6), nullable=True)

class FilaVerdad(Base):
    __tablename__ = 'TablaVerdad'
    id = Column('IdFila', Integer, primary_key=True)
    padre_id = Column('IdLogica', Integer, ForeignKey('LogicaMatematica.IdLogica'), nullable=False, index=True)
    variables = Column('ValoresVariables', Unicode(50))
    resultado = Column('ResultadoFila', Boolean)

class Mapa(Base):
    __tablename__ = 'MapasKarnaugh'
    id = Column('IdMapa', Integer, primary_key=True)
    padre_id = Column('IdLogica', Integer, ForeignKey('LogicaMatematica.IdLogica'), nullable=False, index=True)
    grupos = Column('Agrupaciones', LongText)
    circuito = Column('DiagramaCompuertas', LongText)

class FilaAmortizacion(Base):
    __tablename__ = 'TablaAmortizacion'
    id = Column('IdFila', Integer, primary_key=True)
    padre_id = Column('IdFinanzas', Integer, ForeignKey('MatematicasFinancieras.IdFinanzas'), nullable=False, index=True)
    periodo = Column('Periodo', Integer)
    inicial = Column('SaldoInicial', Numeric(18,2))
    interes = Column('Interes', Numeric(18,2))
    capital = Column('AbonoCapital', Numeric(18,2))
    pago = Column('Pago', Numeric(18,2))
    final = Column('SaldoFinal', Numeric(18,2))

class Regla(Base):
    __tablename__ = 'ReglasAmortizacion'
    id = Column('IdRegla', Integer, primary_key=True)
    padre_id = Column('IdFinanzas', Integer, ForeignKey('MatematicasFinancieras.IdFinanzas'), nullable=False, index=True)
    periodo = Column('PeriodoAplica', Integer)
    tasa = Column('NuevaTasaInteres', Numeric(8,4))
    pago = Column('PagoParcial', Numeric(18,2))

class Iteracion(Base):
    __tablename__ = 'IteracionesMetodos'
    id = Column('IdIteracion', Integer, primary_key=True)
    padre_id = Column('IdCalculo', Integer, ForeignKey('MatematicasComputacionales.IdCalculo'), nullable=False, index=True)
    numero = Column('Iteracion', Integer)
    x = Column('ValorX', Numeric(18,6))
    y = Column('ValorY', Numeric(18,6))
    aproximado = Column('ValorAproximado', Numeric(18,6))
    error = Column('MargenError', Numeric(18,6))
    k1 = Column('ConstanteK1', Numeric(18,6))
    k2 = Column('ConstanteK2', Numeric(18,6))
    k3 = Column('ConstanteK3', Numeric(18,6))
    k4 = Column('ConstanteK4', Numeric(18,6))

class Frecuencia(Base):
    __tablename__ = 'TablaFrecuencias'
    id = Column('IdFrecuencia', Integer, primary_key=True)
    padre_id = Column('IdProbabilidad', Integer, ForeignKey('ProbabilidadEstadistica.IdProbabilidad'), nullable=False, index=True)
    clase = Column('Clase', Unicode(50))
    absoluta = Column('FrecuenciaAbsoluta', Integer)
    relativa = Column('FrecuenciaRelativa', Numeric(18,4))
    acumulada = Column('FrecuenciaAcumulada', Integer)

class Asistencia(Base):
    __tablename__ = 'AsistenteIA'
    id = Column('IdAsistencia', Integer, primary_key=True)
    usuario_id = Column('IdUsuario', Integer, ForeignKey('Usuarios.IdUsuario'), nullable=False, index=True)
    modulo = Column('ModuloRelacionado', Unicode(50), nullable=False)
    pregunta = Column('PreguntaUsuario', LongText, nullable=False)
    respuesta = Column('RespuestaIA', LongText, nullable=False)
    fecha = Column('Fecha', DateTime, nullable=False, default=now)

class Examen(Base):
    __tablename__ = 'Examenes'
    id = Column('IdExamen', Integer, primary_key=True)
    modulo = Column('Modulo', String(30), nullable=False, unique=True)
    titulo = Column('Titulo', Unicode(100), nullable=False)
    activo = Column('Activo', Boolean, nullable=False, default=True)
    fecha = Column('FechaCreacion', DateTime, nullable=False, default=now)

class PreguntaExamen(Base):
    __tablename__ = 'BancoPreguntas'
    id = Column('IdPregunta', Integer, primary_key=True)
    examen_id = Column('IdExamen', Integer, ForeignKey('Examenes.IdExamen'), nullable=False, index=True)
    orden = Column('Orden', Integer, nullable=False)
    enunciado = Column('Enunciado', LongText, nullable=False)
    opcion_a = Column('OpcionA', Unicode(500), nullable=False)
    opcion_b = Column('OpcionB', Unicode(500), nullable=False)
    opcion_c = Column('OpcionC', Unicode(500), nullable=False)
    opcion_d = Column('OpcionD', Unicode(500), nullable=False)
    correcta = Column('RespuestaCorrecta', String(1), nullable=False)
    explicacion = Column('Explicacion', LongText, nullable=False)
    __table_args__ = (
        CheckConstraint("RespuestaCorrecta IN ('A','B','C','D')", name='CK_BancoPreguntas_RespuestaCorrecta'),
        CheckConstraint('Orden BETWEEN 1 AND 5', name='CK_BancoPreguntas_Orden'),
    )

class ResultadoExamen(Base):
    __tablename__ = 'ResultadosExamen'
    id = Column('IdResultado', Integer, primary_key=True)
    usuario_id = Column('IdUsuario', Integer, ForeignKey('Usuarios.IdUsuario'), nullable=False, index=True)
    examen_id = Column('IdExamen', Integer, ForeignKey('Examenes.IdExamen'), nullable=False, index=True)
    aciertos = Column('Aciertos', Integer, nullable=False)
    total = Column('TotalPreguntas', Integer, nullable=False)
    calificacion = Column('Calificacion', Numeric(5,2), nullable=False)
    fecha = Column('Fecha', DateTime, nullable=False, default=now)
    __table_args__ = (
        CheckConstraint('Aciertos BETWEEN 0 AND 5', name='CK_ResultadosExamen_Aciertos'),
        CheckConstraint('TotalPreguntas = 5', name='CK_ResultadosExamen_Total'),
        CheckConstraint('Calificacion BETWEEN 0 AND 100', name='CK_ResultadosExamen_Calificacion'),
    )

class RespuestaUsuario(Base):
    __tablename__ = 'RespuestasUsuario'
    id = Column('IdRespuesta', Integer, primary_key=True)
    resultado_id = Column('IdResultado', Integer, ForeignKey('ResultadosExamen.IdResultado'), nullable=False, index=True)
    pregunta_id = Column('IdPregunta', Integer, ForeignKey('BancoPreguntas.IdPregunta'), nullable=False, index=True)
    seleccionada = Column('RespuestaSeleccionada', String(1), nullable=False)
    correcta = Column('EsCorrecta', Boolean, nullable=False)
    __table_args__ = (
        CheckConstraint("RespuestaSeleccionada IN ('A','B','C','D')", name='CK_RespuestasUsuario_Opcion'),
    )

