import asyncio
import os
import uuid
from collections.abc import Iterator
from urllib.parse import urlsplit, urlunsplit

import asyncpg
import pytest
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient

from khondi_api import migrate
from khondi_api.main import app
from khondi_api.settings import get_settings


def test_missing_url_exits_and_names_it(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.delenv("MIGRATIONS_DATABASE_URL", raising=False)
    assert migrate.main() == 2
    assert "MIGRATIONS_DATABASE_URL" in capsys.readouterr().err


def test_invalid_url_exits_without_echoing_it(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("MIGRATIONS_DATABASE_URL", "notaurl-SUPERSECRET")
    assert migrate.main() == 2
    captured = capsys.readouterr()
    assert "MIGRATIONS_DATABASE_URL" in captured.err
    assert "SUPERSECRET" not in captured.err + captured.out


def head_revision() -> str:
    head = ScriptDirectory.from_config(migrate.alembic_config()).get_current_head()
    assert head is not None
    return head


def with_database(url: str, name: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, f"/{name}", "", ""))


async def admin(url: str, statement: str) -> None:
    connection = await asyncpg.connect(url)
    try:
        await connection.execute(statement)
    finally:
        await connection.close()


async def fetch_value(url: str, query: str) -> object:
    connection = await asyncpg.connect(url)
    try:
        return await connection.fetchval(query)
    finally:
        await connection.close()


@pytest.fixture
def fresh_database() -> Iterator[str]:
    # The CI backend job's DATABASE_URL points at a superuser on its PostgreSQL service.
    base = os.environ["DATABASE_URL"]
    name = f"t0005_{uuid.uuid4().hex[:12]}"
    asyncio.run(admin(base, f'CREATE DATABASE "{name}"'))
    try:
        yield with_database(base, name)
    finally:
        asyncio.run(admin(base, f'DROP DATABASE "{name}" WITH (FORCE)'))


@pytest.mark.integration
def test_upgrade_is_idempotent(fresh_database: str, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("MIGRATIONS_DATABASE_URL", fresh_database)

    assert migrate.main() == 0
    first = asyncio.run(fetch_value(fresh_database, "SELECT version_num FROM alembic_version"))
    assert migrate.main() == 0
    rows = asyncio.run(fetch_value(fresh_database, "SELECT count(*) FROM alembic_version"))
    second = asyncio.run(fetch_value(fresh_database, "SELECT version_num FROM alembic_version"))

    assert first == head_revision()
    assert second == first
    assert rows == 1


@pytest.mark.integration
def test_api_startup_never_migrates(fresh_database: str, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("DATABASE_URL", fresh_database)
    get_settings.cache_clear()
    try:
        with TestClient(app) as client:
            assert client.get("/healthz").status_code == 200
    finally:
        get_settings.cache_clear()

    table = asyncio.run(fetch_value(fresh_database, "SELECT to_regclass('public.alembic_version')"))
    assert table is None
