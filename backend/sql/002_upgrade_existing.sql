-- Additive/idempotent migration of the user's 13-table original schema.
-- No DROP, no removal of records, no password conversion to plaintext.
USE LaboratorioMatematicas;
GO
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Correo IS NULL OR Nombre IS NULL OR Contrasena IS NULL OR Rol IS NULL OR FechaRegistro IS NULL)
    THROW 51000, 'Usuarios contains NULL required fields; reconcile records before migrating.', 1;
IF EXISTS (SELECT LOWER(LTRIM(RTRIM(Correo))) FROM dbo.Usuarios GROUP BY LOWER(LTRIM(RTRIM(Correo))) HAVING COUNT(*) > 1)
    THROW 51001, 'Duplicate emails exist; reconcile them before migrating.', 1;
IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Rol NOT IN ('Usuario', 'Administrador'))
    THROW 51002, 'Unsupported roles exist; reconcile them before migrating.', 1;
IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE Contrasena NOT LIKE '$argon2%' AND Contrasena NOT LIKE '$2%')
    THROW 51003, 'Legacy plaintext passwords exist. Use the documented password upgrade first.', 1;
ALTER TABLE dbo.Usuarios ALTER COLUMN Contrasena VARCHAR(255) NOT NULL;
ALTER TABLE dbo.Usuarios ALTER COLUMN Nombre NVARCHAR(100) NOT NULL;
ALTER TABLE dbo.Usuarios ALTER COLUMN Correo VARCHAR(100) NOT NULL;
ALTER TABLE dbo.Usuarios ALTER COLUMN Rol VARCHAR(20) NOT NULL;
ALTER TABLE dbo.Usuarios ALTER COLUMN FechaRegistro DATETIME NOT NULL;
UPDATE dbo.Usuarios SET Correo = LOWER(LTRIM(RTRIM(Correo)));
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.Usuarios') AND name=N'UQ_Usuarios_Correo')
    AND NOT EXISTS (SELECT 1 FROM sys.indexes i JOIN sys.index_columns ic ON i.object_id=ic.object_id AND i.index_id=ic.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE i.object_id=OBJECT_ID(N'dbo.Usuarios') AND i.is_unique=1 AND c.name=N'Correo')
    ALTER TABLE dbo.Usuarios ADD CONSTRAINT UQ_Usuarios_Correo UNIQUE(Correo);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Usuarios_Rol')
    ALTER TABLE dbo.Usuarios WITH CHECK ADD CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('Usuario','Administrador'));
ALTER TABLE dbo.[AsistenteIA] ALTER COLUMN [ModuloRelacionado] NVARCHAR(50) NULL;
ALTER TABLE dbo.[AsistenteIA] ALTER COLUMN [PreguntaUsuario] NVARCHAR(MAX) NULL;
ALTER TABLE dbo.[AsistenteIA] ALTER COLUMN [RespuestaIA] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.AsistenteIA') AND name=N'ix_AsistenteIA_IdUsuario')
    CREATE INDEX [ix_AsistenteIA_IdUsuario] ON [AsistenteIA] ([IdUsuario]);
IF COL_LENGTH(N'dbo.DistribucionesProbabilidad', N'EntradaJSON') IS NULL
    ALTER TABLE dbo.[DistribucionesProbabilidad] ADD [EntradaJSON] NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.DistribucionesProbabilidad', N'ResultadoJSON') IS NULL
    ALTER TABLE dbo.[DistribucionesProbabilidad] ADD [ResultadoJSON] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_DistribucionesProbabilidad_ResultadoJSON')
    EXEC(N'ALTER TABLE dbo.[DistribucionesProbabilidad] WITH CHECK ADD CONSTRAINT [CK_DistribucionesProbabilidad_ResultadoJSON] CHECK ([ResultadoJSON] IS NULL OR ISJSON([ResultadoJSON])=1)');
ALTER TABLE dbo.[DistribucionesProbabilidad] ALTER COLUMN [TipoDistribucion] NVARCHAR(50) NULL;
ALTER TABLE dbo.[DistribucionesProbabilidad] ALTER COLUMN [ParametrosEntrada] NVARCHAR(MAX) NULL;
ALTER TABLE dbo.[DistribucionesProbabilidad] ALTER COLUMN [AproximacionAplicada] NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.DistribucionesProbabilidad') AND name=N'ix_DistribucionesProbabilidad_IdUsuario')
    CREATE INDEX [ix_DistribucionesProbabilidad_IdUsuario] ON [DistribucionesProbabilidad] ([IdUsuario]);
IF COL_LENGTH(N'dbo.LogicaMatematica', N'EntradaJSON') IS NULL
    ALTER TABLE dbo.[LogicaMatematica] ADD [EntradaJSON] NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.LogicaMatematica', N'ResultadoJSON') IS NULL
    ALTER TABLE dbo.[LogicaMatematica] ADD [ResultadoJSON] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_LogicaMatematica_ResultadoJSON')
    EXEC(N'ALTER TABLE dbo.[LogicaMatematica] WITH CHECK ADD CONSTRAINT [CK_LogicaMatematica_ResultadoJSON] CHECK ([ResultadoJSON] IS NULL OR ISJSON([ResultadoJSON])=1)');
ALTER TABLE dbo.[LogicaMatematica] ALTER COLUMN [ExpresionBooleana] NVARCHAR(255) NULL;
ALTER TABLE dbo.[LogicaMatematica] ALTER COLUMN [TipoEjercicio] NVARCHAR(50) NULL;
ALTER TABLE dbo.[LogicaMatematica] ALTER COLUMN [Resultado] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.LogicaMatematica') AND name=N'ix_LogicaMatematica_IdUsuario')
    CREATE INDEX [ix_LogicaMatematica_IdUsuario] ON [LogicaMatematica] ([IdUsuario]);
IF COL_LENGTH(N'dbo.MatematicasComputacionales', N'EntradaJSON') IS NULL
    ALTER TABLE dbo.[MatematicasComputacionales] ADD [EntradaJSON] NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.MatematicasComputacionales', N'ResultadoJSON') IS NULL
    ALTER TABLE dbo.[MatematicasComputacionales] ADD [ResultadoJSON] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_MatematicasComputacionales_ResultadoJSON')
    EXEC(N'ALTER TABLE dbo.[MatematicasComputacionales] WITH CHECK ADD CONSTRAINT [CK_MatematicasComputacionales_ResultadoJSON] CHECK ([ResultadoJSON] IS NULL OR ISJSON([ResultadoJSON])=1)');
ALTER TABLE dbo.[MatematicasComputacionales] ALTER COLUMN [MetodoUtilizado] NVARCHAR(50) NULL;
ALTER TABLE dbo.[MatematicasComputacionales] ALTER COLUMN [FuncionPolinomio] NVARCHAR(255) NULL;
ALTER TABLE dbo.[MatematicasComputacionales] ALTER COLUMN [PolinomioInterpolacion] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.MatematicasComputacionales') AND name=N'ix_MatematicasComputacionales_IdUsuario')
    CREATE INDEX [ix_MatematicasComputacionales_IdUsuario] ON [MatematicasComputacionales] ([IdUsuario]);
IF COL_LENGTH(N'dbo.MatematicasFinancieras', N'EntradaJSON') IS NULL
    ALTER TABLE dbo.[MatematicasFinancieras] ADD [EntradaJSON] NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.MatematicasFinancieras', N'ResultadoJSON') IS NULL
    ALTER TABLE dbo.[MatematicasFinancieras] ADD [ResultadoJSON] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_MatematicasFinancieras_ResultadoJSON')
    EXEC(N'ALTER TABLE dbo.[MatematicasFinancieras] WITH CHECK ADD CONSTRAINT [CK_MatematicasFinancieras_ResultadoJSON] CHECK ([ResultadoJSON] IS NULL OR ISJSON([ResultadoJSON])=1)');
ALTER TABLE dbo.[MatematicasFinancieras] ALTER COLUMN [TipoOperacion] NVARCHAR(50) NULL;
ALTER TABLE dbo.[MatematicasFinancieras] ALTER COLUMN [TipoDescuento] NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.MatematicasFinancieras') AND name=N'ix_MatematicasFinancieras_IdUsuario')
    CREATE INDEX [ix_MatematicasFinancieras_IdUsuario] ON [MatematicasFinancieras] ([IdUsuario]);
IF COL_LENGTH(N'dbo.ProbabilidadEstadistica', N'EntradaJSON') IS NULL
    ALTER TABLE dbo.[ProbabilidadEstadistica] ADD [EntradaJSON] NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.ProbabilidadEstadistica', N'ResultadoJSON') IS NULL
    ALTER TABLE dbo.[ProbabilidadEstadistica] ADD [ResultadoJSON] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_ProbabilidadEstadistica_ResultadoJSON')
    EXEC(N'ALTER TABLE dbo.[ProbabilidadEstadistica] WITH CHECK ADD CONSTRAINT [CK_ProbabilidadEstadistica_ResultadoJSON] CHECK ([ResultadoJSON] IS NULL OR ISJSON([ResultadoJSON])=1)');
ALTER TABLE dbo.[ProbabilidadEstadistica] ALTER COLUMN [TipoCalculo] NVARCHAR(50) NULL;
ALTER TABLE dbo.[ProbabilidadEstadistica] ALTER COLUMN [Datos] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ProbabilidadEstadistica') AND name=N'ix_ProbabilidadEstadistica_IdUsuario')
    CREATE INDEX [ix_ProbabilidadEstadistica_IdUsuario] ON [ProbabilidadEstadistica] ([IdUsuario]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.IteracionesMetodos') AND name=N'ix_IteracionesMetodos_IdCalculo')
    CREATE INDEX [ix_IteracionesMetodos_IdCalculo] ON [IteracionesMetodos] ([IdCalculo]);
ALTER TABLE dbo.[MapasKarnaugh] ALTER COLUMN [Agrupaciones] NVARCHAR(MAX) NULL;
ALTER TABLE dbo.[MapasKarnaugh] ALTER COLUMN [DiagramaCompuertas] NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.MapasKarnaugh') AND name=N'ix_MapasKarnaugh_IdLogica')
    CREATE INDEX [ix_MapasKarnaugh_IdLogica] ON [MapasKarnaugh] ([IdLogica]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.ReglasAmortizacion') AND name=N'ix_ReglasAmortizacion_IdFinanzas')
    CREATE INDEX [ix_ReglasAmortizacion_IdFinanzas] ON [ReglasAmortizacion] ([IdFinanzas]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.TablaAmortizacion') AND name=N'ix_TablaAmortizacion_IdFinanzas')
    CREATE INDEX [ix_TablaAmortizacion_IdFinanzas] ON [TablaAmortizacion] ([IdFinanzas]);
ALTER TABLE dbo.[TablaFrecuencias] ALTER COLUMN [Clase] NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.TablaFrecuencias') AND name=N'ix_TablaFrecuencias_IdProbabilidad')
    CREATE INDEX [ix_TablaFrecuencias_IdProbabilidad] ON [TablaFrecuencias] ([IdProbabilidad]);
ALTER TABLE dbo.[TablaVerdad] ALTER COLUMN [ValoresVariables] NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.TablaVerdad') AND name=N'ix_TablaVerdad_IdLogica')
    CREATE INDEX [ix_TablaVerdad_IdLogica] ON [TablaVerdad] ([IdLogica]);
COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
