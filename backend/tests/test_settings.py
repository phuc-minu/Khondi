import pytest
from pydantic import ValidationError

from khondi_api.settings import Settings


def valid_environment() -> dict[str, str]:
    return {
        "ENVIRONMENT": "ci",
        "DATABASE_URL": "postgresql://user:pass@db:5432/app",
        "REDIS_URL": "redis://db:6379/0",
    }


def test_settings_parse_valid_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for name, value in valid_environment().items():
        monkeypatch.setenv(name, value)
    settings = Settings()  # type: ignore[call-arg]  # fields are supplied from the test environment
    assert settings.database_dsn.scheme == "postgresql"
    assert settings.redis_dsn.scheme == "redis"


def test_settings_missing_variable_names_it(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    with pytest.raises(ValidationError) as error:
        Settings()  # type: ignore[call-arg]  # fields are intentionally omitted for validation
    assert "ENVIRONMENT" in str(error.value)
    assert "DATABASE_URL" in str(error.value)
    assert "REDIS_URL" in str(error.value)


def test_settings_invalid_secret_does_not_echo_value(monkeypatch: pytest.MonkeyPatch) -> None:
    secret = "notaurl-SUPERSECRET"
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("DATABASE_URL", secret)
    monkeypatch.setenv("REDIS_URL", "redis://db:6379/0")
    settings = Settings()  # type: ignore[call-arg]  # fields are supplied from the test environment
    with pytest.raises(ValueError, match="DATABASE_URL") as error:
        settings.database_dsn
    assert secret not in str(error.value)
