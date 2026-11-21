from typing import TypedDict
from urllib.parse import parse_qs

from pydantic import PostgresDsn


class PostgresOptions(TypedDict, total=False):
    ssl: bool


def postgres_options(url: PostgresDsn) -> PostgresOptions:
    options: PostgresOptions = {}
    if parse_qs(str(url).split("?", 1)[-1]).get("sslmode") == ["require"]:
        options["ssl"] = True
    return options
