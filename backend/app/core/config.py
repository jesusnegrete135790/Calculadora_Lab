from functools import lru_cache
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore', case_sensitive=False, hide_input_in_errors=True)
    db_server: str = 'localhost'
    db_port: int | None = Field(default=1433, ge=1, le=65535)
    db_name: str = 'LaboratorioMatematicas'
    db_user: str = ''
    db_password: SecretStr = SecretStr('')
    db_driver: str = 'ODBC Driver 18 for SQL Server'
    db_trusted_connection: bool = False
    db_encrypt: bool = True
    db_trust_server_certificate: bool = False
    jwt_secret_key: SecretStr
    jwt_algorithm: Literal['HS256'] = 'HS256'
    jwt_access_token_expire_minutes: int = Field(default=60, ge=1, le=1440)
    frontend_url: str = 'http://localhost:5173'
    gemini_api_key: SecretStr = SecretStr('')
    ai_model: str = 'gemini-3.5-flash-lite'
    gemini_api_base_url: str = 'https://generativelanguage.googleapis.com/v1beta'
    ai_timeout_seconds: int = Field(default=30, ge=1, le=120)

    @field_validator('db_port', mode='before')
    @classmethod
    def optional_port(cls, value):
        return None if value == '' else value

    @field_validator('jwt_secret_key')
    @classmethod
    def strong_secret(cls, value: SecretStr):
        if len(value.get_secret_value()) < 32:
            raise ValueError('JWT_SECRET_KEY requiere al menos 32 caracteres aleatorios')
        return value

    @field_validator('frontend_url')
    @classmethod
    def explicit_origins(cls, value: str):
        if any(origin.strip() == '*' for origin in value.split(',')):
            raise ValueError('CORS requiere orígenes explícitos')
        return value


@lru_cache
def get_settings():
    return Settings()
