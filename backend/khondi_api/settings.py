from functools import lru_cache
from typing import Literal

from pydantic import PostgresDsn, RedisDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, case_sensitive=True)

    PORT: int = 8000
    ENVIRONMENT: Literal["local", "ci", "dev"]
    DATABASE_URL: SecretStr
    REDIS_URL: SecretStr

    @property
    def database_dsn(self) -> PostgresDsn:
        return PostgresDsn(self.DATABASE_URL.get_secret_value())

    @property
    def redis_dsn(self) -> RedisDsn:
        return RedisDsn(self.REDIS_URL.get_secret_value())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
