from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import PostgresDsn
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from khondi_api.connections import postgres_options


class Base(DeclarativeBase):
    """Metadata Alembic compares against; tables arrive with feature work (#2)."""


def async_url(url: PostgresDsn) -> str:
    # asyncpg rejects libpq's sslmode as a connect argument; TLS goes through connect_args.
    parts = urlsplit(str(url))
    query = urlencode([(k, v) for k, v in parse_qsl(parts.query) if k != "sslmode"])
    return urlunsplit(("postgresql+asyncpg", parts.netloc, parts.path, query, parts.fragment))


def make_engine(url: PostgresDsn) -> AsyncEngine:
    return create_async_engine(
        async_url(url), connect_args=dict(postgres_options(url)), pool_pre_ping=True
    )
