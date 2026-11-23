"""Fixtures for the stack suite: tests against the stack `docker compose up --wait --build`
started (T0008). Run them with `uv run pytest -m stack --no-cov`; docs/infra/local-setup.md
lists the STACK_* variables.

The suite restarts services but never removes volumes, and it creates and drops only its own
`t0008_*` objects, so it can run against a developer's stack.
"""

from __future__ import annotations

import asyncio
import shutil
import subprocess
from pathlib import Path

import asyncpg
import pytest
from pydantic import AnyHttpUrl, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

COMPOSE_FILE = Path(__file__).resolve().parents[3] / "compose.yaml"
# compose.yaml names the project too; passing it keeps every command on the same stack.
PROJECT = "khondi"


class StackSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="STACK_")

    api_url: AnyHttpUrl
    web_url: AnyHttpUrl
    # The schema owner on the published PostgreSQL port.
    database_url: PostgresDsn

    def api(self, path: str) -> str:
        return str(self.api_url).rstrip("/") + path

    def web(self, path: str) -> str:
        return str(self.web_url).rstrip("/") + path


class ComposeError(RuntimeError):
    pass


class Compose:
    """Runs `docker compose` for the Khondi project with argument lists, never a shell string."""

    def __init__(self) -> None:
        docker = shutil.which("docker")
        if docker is None:
            raise ComposeError("docker was not found on PATH; the stack suite needs it")
        self.docker = docker

    def run(self, *args: str, stdin: bytes | None = None, timeout: float = 300) -> bytes:
        """Runs one command and returns its stdout; a non-zero exit raises with its stderr."""
        command = [self.docker, "compose", "--project-name", PROJECT, "--file", str(COMPOSE_FILE)]
        result = subprocess.run(
            [*command, *args], input=stdin, capture_output=True, timeout=timeout, check=False
        )
        if result.returncode != 0:
            raise ComposeError(
                f"docker compose {' '.join(args)} exited {result.returncode}: "
                f"{result.stderr.decode(errors='replace').strip()}"
            )
        return result.stdout

    def text(self, *args: str) -> str:
        return self.run(*args).decode().strip()


class Database:
    """Runs SQL as the schema owner over the published port."""

    def __init__(self, url: PostgresDsn) -> None:
        self.url = str(url)

    def fetchval(self, sql: str, *, database: str | None = None) -> object:
        return asyncio.run(self._fetchval(sql, database))

    def execute(self, sql: str) -> None:
        asyncio.run(self._execute(sql))

    async def _fetchval(self, sql: str, database: str | None) -> object:
        connection = await asyncpg.connect(self.url, database=database)
        try:
            return await connection.fetchval(sql)
        finally:
            await connection.close()

    async def _execute(self, sql: str) -> None:
        connection = await asyncpg.connect(self.url)
        try:
            await connection.execute(sql)
        finally:
            await connection.close()


@pytest.fixture(scope="session")
def stack() -> StackSettings:
    return StackSettings()  # type: ignore[call-arg]  # every field comes from STACK_* variables


@pytest.fixture(scope="session")
def compose() -> Compose:
    return Compose()


@pytest.fixture(scope="session")
def database(stack: StackSettings) -> Database:
    return Database(stack.database_url)
