import asyncio
from collections.abc import Awaitable, Callable

import asyncpg
from asyncpg import PostgresError
from fastapi import FastAPI, Response, status
from redis.asyncio import Redis
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError

from khondi_api.connections import postgres_options
from khondi_api.settings import get_settings

app = FastAPI()
DEPENDENCY_TIMEOUT_SECONDS = 2.0


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def load_settings() -> None:
    settings = get_settings()
    settings.database_dsn
    settings.redis_dsn


async def check_postgres() -> None:
    settings = get_settings()
    connection = await asyncpg.connect(
        str(settings.database_dsn), timeout=2, **postgres_options(settings.database_dsn)
    )
    await connection.close()


async def check_redis() -> None:
    settings = get_settings()
    client = Redis.from_url(
        str(settings.redis_dsn), socket_connect_timeout=2
    )
    try:
        await client.ping()
    finally:
        await client.aclose()


@app.get("/readyz")
async def readyz(response: Response) -> dict[str, object]:
    checks = await asyncio.gather(
        dependency_check("postgres", check_postgres),
        dependency_check("redis", check_redis),
    )
    failed = [name for name, ok in checks if not ok]
    if failed:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "failed": failed}
    return {"status": "ready"}


async def dependency_check(name: str, check: Callable[[], Awaitable[None]]) -> tuple[str, bool]:
    try:
        await asyncio.wait_for(check(), timeout=DEPENDENCY_TIMEOUT_SECONDS)
    except (OSError, asyncio.TimeoutError, PostgresError, RedisConnectionError, RedisTimeoutError):
        return name, False
    return name, True
