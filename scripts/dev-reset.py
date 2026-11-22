"""Delete the local Khondi stack's data volumes, only after typed confirmation.

`docker compose down` keeps data; this script is the one documented way to wipe it.
It lists the volumes first and stops unless the user types RESET exactly.

Usage: python scripts/dev-reset.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import TextIO

PROJECT = "khondi"
CONFIRMATION = "RESET"
UNATTENDED_FLAG = "--yes-i-really-mean-it"
COMPOSE_FILE = Path(__file__).resolve().parents[1] / "compose.yaml"

Runner = Callable[[Sequence[str]], "subprocess.CompletedProcess[str]"]


def run_command(args: Sequence[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(  # noqa: S603 argument lists are built in this file from fixed values
        list(args), check=False, capture_output=True, text=True
    )


def main(
    argv: Sequence[str],
    *,
    run: Runner = run_command,
    read: Callable[[str], str] = input,
    out: TextIO = sys.stdout,
    err: TextIO = sys.stderr,
    docker: str | None = None,
) -> int:
    docker_path = docker if docker is not None else shutil.which("docker")
    if docker_path is None:
        err.write("docker was not found on PATH; nothing was deleted.\n")
        return 2

    listed = run(
        [
            docker_path,
            "volume",
            "ls",
            "--filter",
            f"label=com.docker.compose.project={PROJECT}",
            "--format",
            "{{.Name}}",
        ]
    )
    if listed.returncode != 0:
        err.write(f"Could not list volumes: {listed.stderr.strip()}\nNothing was deleted.\n")
        return listed.returncode

    volumes = [name for name in listed.stdout.splitlines() if name.strip()]
    if not volumes:
        out.write(f"No volumes found for the '{PROJECT}' stack; nothing to reset.\n")
        return 0

    out.write("This will stop the stack and permanently delete these volumes:\n")
    for name in volumes:
        out.write(f"  {name}\n")

    if UNATTENDED_FLAG not in argv:
        try:
            answer = read(f"Type {CONFIRMATION} to continue: ")
        except EOFError:
            answer = ""
        if answer != CONFIRMATION:
            out.write("Aborted; nothing was deleted.\n")
            return 1

    # --project-name pins the teardown to the project listed above; otherwise
    # COMPOSE_PROJECT_NAME in the shell or .env would override compose.yaml's name.
    down = run(
        [
            docker_path,
            "compose",
            "--project-name",
            PROJECT,
            "-f",
            str(COMPOSE_FILE),
            "down",
            "--volumes",
            "--remove-orphans",
        ]
    )
    if down.returncode != 0:
        err.write(f"docker compose down failed: {down.stderr.strip()}\n")
        return down.returncode
    out.write("Local data deleted. Start again with: docker compose up --wait\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
