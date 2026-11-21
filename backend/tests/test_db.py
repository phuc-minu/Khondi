import pytest
from pydantic import PostgresDsn

from khondi_api import db
from khondi_api.db import async_url, make_engine


def test_async_url_uses_asyncpg_driver() -> None:
    url = async_url(PostgresDsn("postgresql://user:pass@db:5432/app"))
    assert url == "postgresql+asyncpg://user:pass@db:5432/app"


def test_async_url_drops_sslmode_and_keeps_other_parameters() -> None:
    url = async_url(
        PostgresDsn("postgresql://user:pass@db:5432/app?sslmode=require&application_name=khondi")
    )
    assert url == "postgresql+asyncpg://user:pass@db:5432/app?application_name=khondi"


def test_make_engine_enables_tls_for_sslmode_require(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, object] = {}

    def fake_create(url: str, **kwargs: object) -> object:
        seen["url"] = url
        seen.update(kwargs)
        return object()

    monkeypatch.setattr(db, "create_async_engine", fake_create)
    make_engine(PostgresDsn("postgresql://user:pass@db:5432/app?sslmode=require"))
    assert seen["url"] == "postgresql+asyncpg://user:pass@db:5432/app"
    assert seen["connect_args"] == {"ssl": True}
    assert seen["pool_pre_ping"] is True


def test_make_engine_plain_url_has_no_tls() -> None:
    engine = make_engine(PostgresDsn("postgresql://user:pass@db:5432/app"))
    assert engine.url.drivername == "postgresql+asyncpg"
    assert engine.url.query == {}
