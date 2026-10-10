-- Additive, idempotent migration for persistent student evaluations.
USE LaboratorioMatematicas;
GO
IF OBJECT_ID(N'dbo.Examenes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Examenes (
        IdExamen INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Examenes PRIMARY KEY,
        Modulo VARCHAR(30) NOT NULL,
        Titulo NVARCHAR(100) NOT NULL,
        Activo BIT NOT NULL CONSTRAINT DF_Examenes_Activo DEFAULT (1),
        FechaCreacion DATETIME NOT NULL CONSTRAINT DF_Examenes_Fecha DEFAULT (GETUTCDATE()),
        CONSTRAINT UQ_Examenes_Modulo UNIQUE (Modulo),
        CONSTRAINT CK_Examenes_Modulo CHECK (Modulo IN ('logica','finanzas','computacionales','estadistica'))
    );
END;
GO
IF OBJECT_ID(N'dbo.BancoPreguntas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BancoPreguntas (
        IdPregunta INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BancoPreguntas PRIMARY KEY,
        IdExamen INT NOT NULL,
        Orden INT NOT NULL,
        Enunciado NVARCHAR(MAX) NOT NULL,
        OpcionA NVARCHAR(500) NOT NULL,
        OpcionB NVARCHAR(500) NOT NULL,
        OpcionC NVARCHAR(500) NOT NULL,
        OpcionD NVARCHAR(500) NOT NULL,
        RespuestaCorrecta CHAR(1) NOT NULL,
        Explicacion NVARCHAR(MAX) NOT NULL,
        CONSTRAINT FK_BancoPreguntas_Examenes FOREIGN KEY (IdExamen) REFERENCES dbo.Examenes(IdExamen),
        CONSTRAINT UQ_BancoPreguntas_ExamenOrden UNIQUE (IdExamen, Orden),
        CONSTRAINT CK_BancoPreguntas_Orden CHECK (Orden BETWEEN 1 AND 5),
        CONSTRAINT CK_BancoPreguntas_Respuesta CHECK (RespuestaCorrecta IN ('A','B','C','D'))
    );
    CREATE INDEX IX_BancoPreguntas_IdExamen ON dbo.BancoPreguntas(IdExamen);
END;
GO
IF OBJECT_ID(N'dbo.ResultadosExamen', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ResultadosExamen (
        IdResultado INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ResultadosExamen PRIMARY KEY,
        IdUsuario INT NOT NULL,
        IdExamen INT NOT NULL,
        Aciertos INT NOT NULL,
        TotalPreguntas INT NOT NULL,
        Calificacion DECIMAL(5,2) NOT NULL,
        Fecha DATETIME NOT NULL CONSTRAINT DF_ResultadosExamen_Fecha DEFAULT (GETUTCDATE()),
        CONSTRAINT FK_ResultadosExamen_Usuarios FOREIGN KEY (IdUsuario) REFERENCES dbo.Usuarios(IdUsuario),
        CONSTRAINT FK_ResultadosExamen_Examenes FOREIGN KEY (IdExamen) REFERENCES dbo.Examenes(IdExamen),
        CONSTRAINT CK_ResultadosExamen_Aciertos CHECK (Aciertos BETWEEN 0 AND 5),
        CONSTRAINT CK_ResultadosExamen_Total CHECK (TotalPreguntas = 5),
        CONSTRAINT CK_ResultadosExamen_Calificacion CHECK (Calificacion BETWEEN 0 AND 100)
    );
    CREATE INDEX IX_ResultadosExamen_IdUsuario_Fecha ON dbo.ResultadosExamen(IdUsuario, Fecha DESC);
    CREATE INDEX IX_ResultadosExamen_IdExamen ON dbo.ResultadosExamen(IdExamen);
END;
GO
IF OBJECT_ID(N'dbo.RespuestasUsuario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RespuestasUsuario (
        IdRespuesta INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RespuestasUsuario PRIMARY KEY,
        IdResultado INT NOT NULL,
        IdPregunta INT NOT NULL,
        RespuestaSeleccionada CHAR(1) NOT NULL,
        EsCorrecta BIT NOT NULL,
        CONSTRAINT FK_RespuestasUsuario_Resultados FOREIGN KEY (IdResultado) REFERENCES dbo.ResultadosExamen(IdResultado),
        CONSTRAINT FK_RespuestasUsuario_Preguntas FOREIGN KEY (IdPregunta) REFERENCES dbo.BancoPreguntas(IdPregunta),
        CONSTRAINT UQ_RespuestasUsuario_ResultadoPregunta UNIQUE (IdResultado, IdPregunta),
        CONSTRAINT CK_RespuestasUsuario_Opcion CHECK (RespuestaSeleccionada IN ('A','B','C','D'))
    );
    CREATE INDEX IX_RespuestasUsuario_IdPregunta ON dbo.RespuestasUsuario(IdPregunta);
END;
GO
