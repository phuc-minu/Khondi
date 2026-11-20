import asyncio
import sys
import traceback

import asyncpg
import pytest
from fastapi import Response
from fastapi.testclient import TestClient
from pydantic import SecretStr
from redis.asyncio import Redis

from khondi_api import main
from khondi_api.main import app, dependency_check
from khondi_api.settings import Settings, get_settings


def test_healthz() -> None:
    response = TestClient(app).get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_invalid_database_url_traceback_does_not_include_secret() -> None:
    settings = Settings(
        ENVIRONMENT="ci",
        DATABASE_URL=SecretStr("notaurl-SUPERSECRET"),
        REDIS_URL=SecretStr("redis://localhost:6379/0"),
    )

    try:
        settings.database_dsn
    except ValueError:
        formatted = "".join(traceback.format_exception(*sys.exc_info()))
    else:
        pytest.fail("invalid database URL was accepted")

    assert "SUPERSECRET" not in formatted


def test_dependency_check_reports_connection_failure() -> None:
    async def fails() -> None:
        raise OSError("connection refused")

    assert asyncio.run(dependency_check("postgres", fails)) == ("postgres", False)


def test_dependency_check_does_not_swallow_unexpected_errors() -> None:
    async def fails() -> None:
        raise RuntimeError("bug")

    with pytest.raises(RuntimeError, match="bug"):
        asyncio.run(dependency_check("postgres", fails))


def test_readyz_reports_failed_dependency(monkeypatch: pytest.MonkeyPatch) -> None:
    async def postgres() -> None:
        return None

    async def redis() -> None:
        raise OSError("connection refused")

    monkeypatch.setattr(main, "check_postgres", postgres)
    monkeypatch.setattr(main, "check_redis", redis)
    response = Response()
    result = asyncio.run(main.readyz(response))
    assert response.status_code == 503
    assert result == {"status": "not_ready", "failed": ["redis"]}


def test_readyz_is_ready_when_dependencies_pass(monkeypatch: pytest.MonkeyPatch) -> None:
    async def passes() -> None:
        return None

    monkeypatch.setattr(main, "check_postgres", passes)
    monkeypatch.setattr(main, "check_redis", passes)
    response = Response()
    result = asyncio.run(main.readyz(response))
    assert response.status_code == 200
    assert result == {"status": "ready"}


def test_connection_checks_close_clients(monkeypatch: pytest.MonkeyPatch) -> None:
    class Connection:
        async def close(self) -> None:
            return None

    class Client:
        async def ping(self) -> None:
            return None

        async def aclose(self) -> None:
            return None

    async def connect(*args: object, **kwargs: object) -> Connection:
        return Connection()

    def from_url(*args: object, **kwargs: object) -> Client:
        return Client()

    monkeypatch.setattr(asyncpg, "connect", connect)
    monkeypatch.setattr(Redis, "from_url", from_url)
    asyncio.run(main.check_postgres())
    asyncio.run(main.check_redis())


def test_dependency_check_times_out_when_server_never_answers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    writers: list[asyncio.StreamWriter] = []

    async def never_answers(
        _reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        writers.append(writer)
        await asyncio.Event().wait()

    async def run() -> None:
        server = await asyncio.start_server(never_answers, "127.0.0.1", 0)
        port = server.sockets[0].getsockname()[1]
        monkeypatch.setenv("ENVIRONMENT", "ci")
        monkeypatch.setenv(
            "DATABASE_URL", f"postgresql://khondi:khondi@127.0.0.1:{port}/khondi_test"
        )
        monkeypatch.setenv("REDIS_URL", f"redis://127.0.0.1:{port}/0")
        get_settings.cache_clear()
        try:
            for name, check in (("postgres", main.check_postgres), ("redis", main.check_redis)):
                started = asyncio.get_running_loop().time()
                result = await asyncio.wait_for(dependency_check(name, check), timeout=5)
                elapsed = asyncio.get_running_loop().time() - started
                assert result == (name, False)
                assert elapsed < 3
        finally:
            for writer in writers:
                writer.close()
            server.close()
            await server.wait_closed()
            get_settings.cache_clear()

    asyncio.run(run())


@pytest.mark.integration
def test_readyz_uses_ci_services(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("DATABASE_URL", "postgresql://khondi:khondi@localhost:5432/khondi_test")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    get_settings.cache_clear()

    response = TestClient(app).get("/readyz")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}
    get_settings.cache_clear()


@pytest.mark.integration
def test_readyz_names_unreachable_dependency(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("DATABASE_URL", "postgresql://khondi:khondi@localhost:59999/khondi_test")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:59998/0")
    get_settings.cache_clear()

    response = TestClient(app).get("/readyz")

    assert response.status_code == 503
    assert response.json() == {"status": "not_ready", "failed": ["postgres", "redis"]}
    get_settings.cache_clear()
