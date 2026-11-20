from typing import Any
from urllib.parse import parse_qs

from pydantic import PostgresDsn, RedisDsn


def postgres_options(url: PostgresDsn) -> dict[str, Any]:
    options: dict[str, Any] = {}
    if parse_qs(str(url).split("?", 1)[-1]).get("sslmode") == ["require"]:
        options["ssl"] = True
    return options


def redis_options(url: RedisDsn) -> dict[str, Any]:
    return {}
