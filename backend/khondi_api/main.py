import asyncio
import asyncpg
from fastapi import FastAPI, Response, status
from redis.asyncio import Redis

from khondi_api.connections import postgres_options, redis_options
from khondi_api.settings import get_settings

app = FastAPI()


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


async def check_postgres() -> None:
    settings = get_settings()
    connection = await asyncpg.connect(
        str(settings.database_dsn), timeout=2, **postgres_options(settings.database_dsn)
    )
    await connection.close()


async def check_redis() -> None:
    settings = get_settings()
    client = Redis.from_url(
        str(settings.redis_dsn), socket_connect_timeout=2, **redis_options(settings.redis_dsn)
    )
    try:
        await client.ping()
    finally:
        await client.aclose()


@app.get("/readyz")
async def readyz(response: Response) -> dict[str, object]:
    checks = await asyncio.gather(check_postgres(), check_redis(), return_exceptions=True)
    failed = [name for name, result in zip(("postgres", "redis"), checks) if isinstance(result, Exception)]
    if failed:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "not_ready", "failed": failed}
    return {"status": "ready"}
