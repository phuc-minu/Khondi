"""One-off migration job: `python -m khondi_api.migrate` upgrades the schema to head.

Runs as its own Compose service / Container Apps Job, never inside the api (P6).
"""

import sys

from alembic import command
from alembic.config import Config
from pydantic import ValidationError

from khondi_api.settings import MigrationSettings


def alembic_config() -> Config:
    config = Config()
    config.set_main_option("script_location", "khondi_api:migrations")
    return config


def main() -> int:
    try:
        MigrationSettings().migrations_dsn  # type: ignore[call-arg]  # fields come from env
    except ValidationError as error:
        names = ", ".join(str(issue["loc"][0]) for issue in error.errors())
        sys.stderr.write(f"Missing or invalid setting: {names}\n")
        return 2
    except ValueError as error:
        sys.stderr.write(f"{error}\n")
        return 2
    command.upgrade(alembic_config(), "head")
    return 0


if __name__ == "__main__":
    sys.exit(main())
