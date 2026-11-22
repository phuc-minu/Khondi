"""Arq worker: `python -m khondi_api.worker` runs it; `--check` reports its heartbeat (P8).

Runs from the api image with a different command (P1). On SIGTERM Arq cancels running jobs and
puts them back on the queue, so the process stops quickly (P7) and the job runs again later.
"""

import argparse
import asyncio
import sys
from collections.abc import Sequence

from arq.connections import RedisSettings
from arq.constants import default_queue_name
from arq.typing import WorkerCoroutine
from arq.worker import Worker, async_check_health
from pydantic import RedisDsn, ValidationError

from khondi_api.jobs import JOBS
from khondi_api.settings import WorkerSettings
from khondi_api.telemetry import setup_telemetry

MAX_TRIES = 3
JOB_TIMEOUT_SECONDS = 300
KEEP_RESULT_SECONDS = 3600
HEALTH_CHECK_INTERVAL_SECONDS = 10


def redis_settings(dsn: RedisDsn) -> RedisSettings:
    return RedisSettings.from_dsn(str(dsn))


def create_worker(
    dsn: RedisDsn, functions: Sequence[WorkerCoroutine], *, burst: bool = False
) -> Worker:
    return Worker(
        functions,
        queue_name=default_queue_name,
        redis_settings=redis_settings(dsn),
        burst=burst,
        max_tries=MAX_TRIES,
        job_timeout=JOB_TIMEOUT_SECONDS,
        keep_result=KEEP_RESULT_SECONDS,
        health_check_interval=HEALTH_CHECK_INTERVAL_SECONDS,
        retry_jobs=True,
        allow_abort_jobs=False,
        # Results hold job content (R1, R4); the traced job logs its own end line.
        log_results=False,
    )


def check(dsn: RedisDsn) -> int:
    return asyncio.run(async_check_health(redis_settings(dsn), None, default_queue_name))


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m khondi_api.worker")
    parser.add_argument(
        "--check", action="store_true", help="exit 0 if a worker's heartbeat is fresh, else 1"
    )
    args = parser.parse_args(argv)
    try:
        settings = WorkerSettings()  # type: ignore[call-arg]  # fields come from env
        dsn = settings.redis_dsn
    except ValidationError as error:
        names = ", ".join(str(issue["loc"][0]) for issue in error.errors())
        sys.stderr.write(f"Missing or invalid setting: {names}\n")
        return 2
    except ValueError as error:
        sys.stderr.write(f"{error}\n")
        return 2
    if args.check:
        return check(dsn)
    setup_telemetry("khondi-worker", settings.ENVIRONMENT, settings.OTEL_EXPORTER_OTLP_ENDPOINT)
    create_worker(dsn, JOBS).run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
