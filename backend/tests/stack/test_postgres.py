"""T0005 and T0004: migrations, the api's database role, backup and restore, and persistence."""

from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

from .conftest import Compose, Database, StackSettings

pytestmark = pytest.mark.stack

ALEMBIC_INI = Path(__file__).resolve().parents[2] / "alembic.ini"
SCRATCH_DATABASE = "t0008_restore_check"

# Runs inside the api container with the api's own DATABASE_URL, so it checks the role the api
# really connects as. It writes "<role> denied" or "<role> created" to stdout.
ROLE_CHECK = """
import asyncio
import os
import sys

import asyncpg


async def main() -> None:
    connection = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        role = await connection.fetchval("SELECT current_user")
        try:
            await connection.execute("CREATE TABLE t0008_denied (v int)")
        except asyncpg.InsufficientPrivilegeError:
            sys.stdout.write(f"{role} denied")
            return
        sys.stdout.write(f"{role} created")
    finally:
        await connection.close()


asyncio.run(main())
"""


def migration_head() -> str:
    head = ScriptDirectory.from_config(Config(str(ALEMBIC_INI))).get_current_head()
    assert head is not None, "the migrations have no head revision"
    return head


def test_migrations_ran_before_the_api_and_are_idempotent(
    compose: Compose, database: Database
) -> None:
    head = migration_head()
    assert compose.text("ps", "--all", "--format", "{{.ExitCode}}", "migrate") == "0"
    assert database.fetchval("SELECT version_num FROM alembic_version") == head

    compose.run("run", "--rm", "migrate")

    assert database.fetchval("SELECT count(*) FROM alembic_version") == 1
    assert database.fetchval("SELECT version_num FROM alembic_version") == head


def test_the_api_role_cannot_change_the_schema(compose: Compose, database: Database) -> None:
    try:
        outcome = compose.run("exec", "-T", "api", "python", "-", stdin=ROLE_CHECK.encode())
        assert outcome.decode().strip() == "khondi_app denied"
    finally:
        database.execute("DROP TABLE IF EXISTS t0008_denied")


def test_a_backup_restores_into_a_new_database(
    compose: Compose, database: Database, stack: StackSettings
) -> None:
    owner = stack.database_url.hosts()[0]["username"]
    assert owner is not None, "STACK_DATABASE_URL has no user"
    name = (stack.database_url.path or "").lstrip("/")
    database.execute(
        "DROP TABLE IF EXISTS t0008_backup;"
        "CREATE TABLE t0008_backup (v text); INSERT INTO t0008_backup VALUES ('kept')"
    )
    database.execute(f"DROP DATABASE IF EXISTS {SCRATCH_DATABASE}")
    try:
        dump = compose.run("exec", "-T", "postgres", "pg_dump", "-Fc", "-U", owner, name)
        database.execute(f"CREATE DATABASE {SCRATCH_DATABASE}")
        restore = ("pg_restore", "--exit-on-error", "-U", owner, "-d", SCRATCH_DATABASE)
        compose.run("exec", "-T", "postgres", *restore, stdin=dump)

        restored = SCRATCH_DATABASE
        assert database.fetchval("SELECT v FROM t0008_backup", database=restored) == "kept"
        version = database.fetchval("SELECT version_num FROM alembic_version", database=restored)
        assert version == migration_head()
    finally:
        database.execute(f"DROP DATABASE IF EXISTS {SCRATCH_DATABASE}")
        database.execute("DROP TABLE IF EXISTS t0008_backup")


def test_data_survives_down_and_up(compose: Compose, database: Database) -> None:
    database.execute(
        "DROP TABLE IF EXISTS t0008_persist;"
        "CREATE TABLE t0008_persist (v text); INSERT INTO t0008_persist VALUES ('kept')"
    )
    try:
        compose.run("down")
        compose.run("up", "--wait")
        assert database.fetchval("SELECT v FROM t0008_persist") == "kept"
    finally:
        database.execute("DROP TABLE IF EXISTS t0008_persist")
