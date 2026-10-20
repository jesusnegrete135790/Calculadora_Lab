-- Run with SSMS or sqlcmd. Creates missing tables only; existing schemas use 002.

USE LaboratorioMatematicas;
GO
IF OBJECT_ID(N'dbo.Usuarios', N'U') IS NULL
BEGIN
CREATE TABLE [Usuarios] (
	[IdUsuario] INTEGER NOT NULL IDENTITY, 
	[Nombre] NVARCHAR(100) NOT NULL, 
	[Correo] VARCHAR(100) NOT NULL, 
	[Contrasena] VARCHAR(255) NOT NULL, 
	[Rol] VARCHAR(20) NOT NULL, 
	[FechaRegistro] DATETIME NOT NULL, 
	PRIMARY KEY ([IdUsuario]), 
	CONSTRAINT [CK_Usuarios_Rol] CHECK (Rol IN ('Usuario','Administrador')), 
	UNIQUE ([Correo])
);
END;
GO
IF OBJECT_ID(N'dbo.AsistenteIA', N'U') IS NULL
BEGIN
CREATE TABLE [AsistenteIA] (
	[IdAsistencia] INTEGER NOT NULL IDENTITY, 
	[IdUsuario] INTEGER NOT NULL, 
	[ModuloRelacionado] NVARCHAR(50) NOT NULL, 
	[PreguntaUsuario] NVARCHAR(max) NOT NULL, 
	[RespuestaIA] NVARCHAR(max) NOT NULL, 
	[Fecha] DATETIME NOT NULL, 
	PRIMARY KEY ([IdAsistencia]), 
	FOREIGN KEY([IdUsuario]) REFERENCES [Usuarios] ([IdUsuario])
);
CREATE INDEX [ix_AsistenteIA_IdUsuario] ON [AsistenteIA] ([IdUsuario]);
END;
GO
IF OBJECT_ID(N'dbo.DistribucionesProbabilidad', N'U') IS NULL
BEGIN
CREATE TABLE [DistribucionesProbabilidad] (
	[IdDistribucion] INTEGER NOT NULL IDENTITY, 
	[IdUsuario] INTEGER NOT NULL, 
	[Fecha] DATETIME NOT NULL, 
	[EntradaJSON] NVARCHAR(max) NOT NULL, 
	[ResultadoJSON] NVARCHAR(max) NOT NULL, 
	[TipoDistribucion] NVARCHAR(50) NOT NULL, 
	[ParametrosEntrada] NVARCHAR(max) NULL, 
	[ValorZ] NUMERIC(18, 4) NULL, 
	[AreaBajoCurva] NUMERIC(18, 4) NULL, 
	[AproximacionAplicada] NVARCHAR(100) NULL, 
	[ResultadoProbabilidad] NUMERIC(18, 6) NULL, 
	PRIMARY KEY ([IdDistribucion]), 
	FOREIGN KEY([IdUsuario]) REFERENCES [Usuarios] ([IdUsuario])
);
CREATE INDEX [ix_DistribucionesProbabilidad_IdUsuario] ON [DistribucionesProbabilidad] ([IdUsuario]);
END;
GO
IF OBJECT_ID(N'dbo.LogicaMatematica', N'U') IS NULL
BEGIN
CREATE TABLE [LogicaMatematica] (
	[IdLogica] INTEGER NOT NULL IDENTITY, 
	[IdUsuario] INTEGER NOT NULL, 
	[Fecha] DATETIME NOT NULL, 
	[EntradaJSON] NVARCHAR(max) NOT NULL, 
	[ResultadoJSON] NVARCHAR(max) NOT NULL, 
	[ExpresionBooleana] NVARCHAR(255) NULL, 
	[TipoEjercicio] NVARCHAR(50) NOT NULL, 
	[Resultado] NVARCHAR(max) NULL, 
	PRIMARY KEY ([IdLogica]), 
	FOREIGN KEY([IdUsuario]) REFERENCES [Usuarios] ([IdUsuario])
);
CREATE INDEX [ix_LogicaMatematica_IdUsuario] ON [LogicaMatematica] ([IdUsuario]);
END;
GO
IF OBJECT_ID(N'dbo.MatematicasComputacionales', N'U') IS NULL
BEGIN
CREATE TABLE [MatematicasComputacionales] (
	[IdCalculo] INTEGER NOT NULL IDENTITY, 
	[IdUsuario] INTEGER NOT NULL, 
	[Fecha] DATETIME NOT NULL, 
	[EntradaJSON] NVARCHAR(max) NOT NULL, 
	[ResultadoJSON] NVARCHAR(max) NOT NULL, 
	[MetodoUtilizado] NVARCHAR(50) NOT NULL, 
	[FuncionPolinomio] NVARCHAR(255) NULL, 
	[RaizResultado] NUMERIC(18, 6) NULL, 
	[PolinomioInterpolacion] NVARCHAR(max) NULL, 
	PRIMARY KEY ([IdCalculo]), 
	FOREIGN KEY([IdUsuario]) REFERENCES [Usuarios] ([IdUsuario])
);
CREATE INDEX [ix_MatematicasComputacionales_IdUsuario] ON [MatematicasComputacionales] ([IdUsuario]);
END;
GO
IF OBJECT_ID(N'dbo.MatematicasFinancieras', N'U') IS NULL
BEGIN
CREATE TABLE [MatematicasFinancieras] (
	[IdFinanzas] INTEGER NOT NULL IDENTITY, 
	[IdUsuario] INTEGER NOT NULL, 
	[Fecha] DATETIME NOT NULL, 
	[EntradaJSON] NVARCHAR(max) NOT NULL, 
	[ResultadoJSON] NVARCHAR(max) NOT NULL, 
	[TipoOperacion] NVARCHAR(50) NOT NULL, 
	[Capital] NUMERIC(18, 2) NULL, 
	[TasaInteres] NUMERIC(8, 4) NULL, 
	[Tiempo] NUMERIC(8, 2) NULL, 
	[TipoDescuento] NVARCHAR(50) NULL, 
	[TasaEquivalente] NUMERIC(8, 4) NULL, 
	[Resultado] NUMERIC(18, 2) NULL, 
	PRIMARY KEY ([IdFinanzas]), 
	FOREIGN KEY([IdUsuario]) REFERENCES [Usuarios] ([IdUsuario])
);
CREATE INDEX [ix_MatematicasFinancieras_IdUsuario] ON [MatematicasFinancieras] ([IdUsuario]);
END;
GO
IF OBJECT_ID(N'dbo.ProbabilidadEstadistica', N'U') IS NULL
BEGIN
CREATE TABLE [ProbabilidadEstadistica] (
	[IdProbabilidad] INTEGER NOT NULL IDENTITY, 
	[IdUsuario] INTEGER NOT NULL, 
	[Fecha] DATETIME NOT NULL, 
	[EntradaJSON] NVARCHAR(max) NOT NULL, 
	[ResultadoJSON] NVARCHAR(max) NOT NULL, 
	[TipoCalculo] NVARCHAR(50) NOT NULL, 
	[Datos] NVARCHAR(max) NULL, 
	[Media] NUMERIC(18, 4) NULL, 
	[DesviacionEstandar] NUMERIC(18, 4) NULL, 
	[Asimetria] NUMERIC(18, 4) NULL, 
	[Curtosis] NUMERIC(18, 4) NULL, 
	[ResultadoFinal] NUMERIC(18, 4) NULL, 
	PRIMARY KEY ([IdProbabilidad]), 
	FOREIGN KEY([IdUsuario]) REFERENCES [Usuarios] ([IdUsuario])
);
CREATE INDEX [ix_ProbabilidadEstadistica_IdUsuario] ON [ProbabilidadEstadistica] ([IdUsuario]);
END;
GO
IF OBJECT_ID(N'dbo.IteracionesMetodos', N'U') IS NULL
BEGIN
CREATE TABLE [IteracionesMetodos] (
	[IdIteracion] INTEGER NOT NULL IDENTITY, 
	[IdCalculo] INTEGER NOT NULL, 
	[Iteracion] INTEGER NULL, 
	[ValorX] NUMERIC(18, 6) NULL, 
	[ValorY] NUMERIC(18, 6) NULL, 
	[ValorAproximado] NUMERIC(18, 6) NULL, 
	[MargenError] NUMERIC(18, 6) NULL, 
	[ConstanteK1] NUMERIC(18, 6) NULL, 
	[ConstanteK2] NUMERIC(18, 6) NULL, 
	[ConstanteK3] NUMERIC(18, 6) NULL, 
	[ConstanteK4] NUMERIC(18, 6) NULL, 
	PRIMARY KEY ([IdIteracion]), 
	FOREIGN KEY([IdCalculo]) REFERENCES [MatematicasComputacionales] ([IdCalculo])
);
CREATE INDEX [ix_IteracionesMetodos_IdCalculo] ON [IteracionesMetodos] ([IdCalculo]);
END;
GO
IF OBJECT_ID(N'dbo.MapasKarnaugh', N'U') IS NULL
BEGIN
CREATE TABLE [MapasKarnaugh] (
	[IdMapa] INTEGER NOT NULL IDENTITY, 
	[IdLogica] INTEGER NOT NULL, 
	[Agrupaciones] NVARCHAR(max) NULL, 
	[DiagramaCompuertas] NVARCHAR(max) NULL, 
	PRIMARY KEY ([IdMapa]), 
	FOREIGN KEY([IdLogica]) REFERENCES [LogicaMatematica] ([IdLogica])
);
CREATE INDEX [ix_MapasKarnaugh_IdLogica] ON [MapasKarnaugh] ([IdLogica]);
END;
GO
IF OBJECT_ID(N'dbo.ReglasAmortizacion', N'U') IS NULL
BEGIN
CREATE TABLE [ReglasAmortizacion] (
	[IdRegla] INTEGER NOT NULL IDENTITY, 
	[IdFinanzas] INTEGER NOT NULL, 
	[PeriodoAplica] INTEGER NULL, 
	[NuevaTasaInteres] NUMERIC(8, 4) NULL, 
	[PagoParcial] NUMERIC(18, 2) NULL, 
	PRIMARY KEY ([IdRegla]), 
	FOREIGN KEY([IdFinanzas]) REFERENCES [MatematicasFinancieras] ([IdFinanzas])
);
CREATE INDEX [ix_ReglasAmortizacion_IdFinanzas] ON [ReglasAmortizacion] ([IdFinanzas]);
END;
GO
IF OBJECT_ID(N'dbo.TablaAmortizacion', N'U') IS NULL
BEGIN
CREATE TABLE [TablaAmortizacion] (
	[IdFila] INTEGER NOT NULL IDENTITY, 
	[IdFinanzas] INTEGER NOT NULL, 
	[Periodo] INTEGER NULL, 
	[SaldoInicial] NUMERIC(18, 2) NULL, 
	[Interes] NUMERIC(18, 2) NULL, 
	[AbonoCapital] NUMERIC(18, 2) NULL, 
	[Pago] NUMERIC(18, 2) NULL, 
	[SaldoFinal] NUMERIC(18, 2) NULL, 
	PRIMARY KEY ([IdFila]), 
	FOREIGN KEY([IdFinanzas]) REFERENCES [MatematicasFinancieras] ([IdFinanzas])
);
CREATE INDEX [ix_TablaAmortizacion_IdFinanzas] ON [TablaAmortizacion] ([IdFinanzas]);
END;
GO
IF OBJECT_ID(N'dbo.TablaFrecuencias', N'U') IS NULL
BEGIN
CREATE TABLE [TablaFrecuencias] (
	[IdFrecuencia] INTEGER NOT NULL IDENTITY, 
	[IdProbabilidad] INTEGER NOT NULL, 
	[Clase] NVARCHAR(50) NULL, 
	[FrecuenciaAbsoluta] INTEGER NULL, 
	[FrecuenciaRelativa] NUMERIC(18, 4) NULL, 
	[FrecuenciaAcumulada] INTEGER NULL, 
	PRIMARY KEY ([IdFrecuencia]), 
	FOREIGN KEY([IdProbabilidad]) REFERENCES [ProbabilidadEstadistica] ([IdProbabilidad])
);
CREATE INDEX [ix_TablaFrecuencias_IdProbabilidad] ON [TablaFrecuencias] ([IdProbabilidad]);
END;
GO
IF OBJECT_ID(N'dbo.TablaVerdad', N'U') IS NULL
BEGIN
CREATE TABLE [TablaVerdad] (
	[IdFila] INTEGER NOT NULL IDENTITY, 
	[IdLogica] INTEGER NOT NULL, 
	[ValoresVariables] NVARCHAR(50) NULL, 
	[ResultadoFila] BIT NULL, 
	PRIMARY KEY ([IdFila]), 
	FOREIGN KEY([IdLogica]) REFERENCES [LogicaMatematica] ([IdLogica])
);
CREATE INDEX [ix_TablaVerdad_IdLogica] ON [TablaVerdad] ([IdLogica]);
END;
GO
