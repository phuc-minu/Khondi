import asyncio

from alembic import context
from sqlalchemy.engine import Connection

from khondi_api.db import Base, make_engine
from khondi_api.settings import MigrationSettings

if context.is_offline_mode():
    raise SystemExit("Offline (--sql) migrations are not supported; run against a database.")


def run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    settings = MigrationSettings()  # type: ignore[call-arg]  # fields come from env
    engine = make_engine(settings.migrations_dsn)
    try:
        async with engine.connect() as connection:
            await connection.run_sync(run_migrations)
    finally:
        await engine.dispose()


asyncio.run(run_async_migrations())
