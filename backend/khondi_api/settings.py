from functools import lru_cache
from typing import Literal

from pydantic import PostgresDsn, RedisDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, case_sensitive=True, hide_input_in_errors=True)

    PORT: int = 8000
    ENVIRONMENT: Literal["local", "ci", "dev"]
    DATABASE_URL: SecretStr
    REDIS_URL: SecretStr

    @property
    def database_dsn(self) -> PostgresDsn:
        try:
            return PostgresDsn(self.DATABASE_URL.get_secret_value())
        except ValueError as exc:
            raise ValueError("DATABASE_URL must be a valid PostgreSQL URL") from exc

    @property
    def redis_dsn(self) -> RedisDsn:
        try:
            return RedisDsn(self.REDIS_URL.get_secret_value())
        except ValueError as exc:
            raise ValueError("REDIS_URL must be a valid Redis URL") from exc


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # pydantic-settings reads required fields from env
