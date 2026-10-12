-- Additive and idempotent: preserves existing accounts and valid legacy tokens.
USE LaboratorioMatematicas;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH(N'dbo.Usuarios', N'Activo') IS NULL
    ALTER TABLE dbo.Usuarios ADD Activo BIT NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT (1) WITH VALUES;
IF COL_LENGTH(N'dbo.Usuarios', N'VersionToken') IS NULL
    ALTER TABLE dbo.Usuarios ADD VersionToken INT NOT NULL CONSTRAINT DF_Usuarios_VersionToken DEFAULT (0) WITH VALUES;
COMMIT TRANSACTION;
GO
