import asyncio
import logging
import time
from collections.abc import Awaitable, Callable

import asyncpg
from arq.connections import ArqRedis
from asyncpg import PostgresError
from fastapi import FastAPI, Request, Response, status
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from redis.asyncio import Redis
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError
from starlette.routing import Route

from khondi_api import diagnostics
from khondi_api.connections import postgres_options
from khondi_api.settings import get_settings
from khondi_api.telemetry import setup_telemetry

app = FastAPI()
app.include_router(diagnostics.router)
DEPENDENCY_TIMEOUT_SECONDS = 2.0
# Compose polls these every few seconds; tracing or logging them would bury real requests.
HEALTH_PATHS = frozenset({"/healthz", "/readyz"})
# Instrumented here, not at startup, because Starlette builds the middleware stack on the
# first ASGI call, which is the startup event itself. Spans start once setup_telemetry runs.
FastAPIInstrumentor.instrument_app(
    app, excluded_urls=",".join(HEALTH_PATHS), exclude_spans=["receive", "send"]
)
request_log = logging.getLogger("khondi_api.request")


@app.middleware("http")
async def log_request(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    if request.url.path in HEALTH_PATHS:
        return await call_next(request)
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as error:
        # Uvicorn answers 500 and logs the error; this line keeps the route and the type (R1).
        log_request_line(request, 500, started, error_type=type(error).__name__)
        raise
    log_request_line(request, response.status_code, started)
    return response


def log_request_line(request: Request, status_code: int, started: float, **extra: str) -> None:
    route = request.scope.get("route")
    request_log.info(
        "request",
        extra={
            "method": request.method,
            "route": route.path if isinstance(route, Route) else "unmatched",
            "status": status_code,
            "duration_ms": round((time.perf_counter() - started) * 1000, 1),
            **extra,
        },
    )


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def load_settings() -> None:
    settings = get_settings()
    settings.database_dsn
    settings.redis_dsn


@app.on_event("startup")
async def start_telemetry() -> None:
    settings = get_settings()
    setup_telemetry("khondi-api", settings.ENVIRONMENT, settings.OTEL_EXPORTER_OTLP_ENDPOINT)


@app.on_event("startup")
async def open_queue() -> None:
    # Connects on first use, so the api still starts (and /readyz reports it) if Redis is down.
    settings = get_settings()
    if settings.DIAGNOSTICS_ENABLED:
        app.state.queue = ArqRedis.from_url(str(settings.redis_dsn), socket_connect_timeout=2)


@app.on_event("shutdown")
async def close_queue() -> None:
    queue = getattr(app.state, "queue", None)
    if isinstance(queue, ArqRedis):
        await queue.aclose()
        del app.state.queue


async def check_postgres() -> None:
    settings = get_settings()
    connection = await asyncpg.connect(
        str(settings.database_dsn), timeout=2, **postgres_options(settings.database_dsn)
    )
    await connection.close()


async def check_redis() -> None:
    settings = get_settings()
    client = Redis.from_url(str(settings.redis_dsn), socket_connect_timeout=2)
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
