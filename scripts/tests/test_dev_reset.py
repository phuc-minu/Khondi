from __future__ import annotations

import importlib.util
import subprocess
from collections.abc import Callable, Sequence
from io import StringIO
from pathlib import Path
from types import ModuleType

import pytest


def load_dev_reset() -> ModuleType:
    # The spec names the script dev-reset.py, which is not an importable module name.
    path = Path(__file__).resolve().parents[1] / "dev-reset.py"
    spec = importlib.util.spec_from_file_location("dev_reset", path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


dev_reset = load_dev_reset()


class FakeDocker:
    def __init__(
        self, volumes: str = "khondi-pgdata\n", ls_code: int = 0, down_code: int = 0
    ) -> None:
        self.volumes = volumes
        self.ls_code = ls_code
        self.down_code = down_code
        self.calls: list[list[str]] = []

    def __call__(self, args: Sequence[str]) -> subprocess.CompletedProcess[str]:
        self.calls.append(list(args))
        if args[1:3] == ["volume", "ls"]:
            return subprocess.CompletedProcess(args, self.ls_code, self.volumes, "ls failed")
        return subprocess.CompletedProcess(args, self.down_code, "", "down failed")

    @property
    def ran_down(self) -> bool:
        return any("down" in call for call in self.calls)


def answer(text: str) -> Callable[[str], str]:
    def read(prompt: str) -> str:
        return text

    return read


def run_reset(
    fake: FakeDocker, argv: Sequence[str] = (), reply: str = "RESET"
) -> tuple[int, str, str]:
    out, err = StringIO(), StringIO()
    code = dev_reset.main(
        argv, run=fake, read=answer(reply), out=out, err=err, docker="/usr/bin/docker"
    )
    return code, out.getvalue(), err.getvalue()


def test_exact_confirmation_deletes_volumes() -> None:
    fake = FakeDocker()
    code, out, _ = run_reset(fake, reply="RESET")
    assert code == 0
    assert "khondi-pgdata" in out
    assert fake.calls[-1][-3:] == ["down", "--volumes", "--remove-orphans"]


@pytest.mark.parametrize("reply", ["", "reset", "yes", "RESET please", "RESE"])
def test_any_other_answer_deletes_nothing(reply: str) -> None:
    fake = FakeDocker()
    code, out, _ = run_reset(fake, reply=reply)
    assert code == 1
    assert "nothing was deleted" in out
    assert not fake.ran_down


def test_closed_input_deletes_nothing() -> None:
    def closed(prompt: str) -> str:
        raise EOFError

    fake = FakeDocker()
    code = dev_reset.main(
        [], run=fake, read=closed, out=StringIO(), err=StringIO(), docker="/usr/bin/docker"
    )
    assert code == 1
    assert not fake.ran_down


def test_unattended_flag_skips_prompt() -> None:
    def must_not_prompt(prompt: str) -> str:
        raise AssertionError("prompted despite the unattended flag")

    fake = FakeDocker()
    code = dev_reset.main(
        ["--yes-i-really-mean-it"],
        run=fake,
        read=must_not_prompt,
        out=StringIO(),
        err=StringIO(),
        docker="/usr/bin/docker",
    )
    assert code == 0
    assert fake.ran_down


def test_lists_only_this_projects_volumes() -> None:
    fake = FakeDocker()
    run_reset(fake)
    assert "label=com.docker.compose.project=khondi" in fake.calls[0]


def test_no_volumes_means_nothing_to_do() -> None:
    fake = FakeDocker(volumes="")
    code, out, _ = run_reset(fake)
    assert code == 0
    assert "nothing to reset" in out
    assert not fake.ran_down


def test_volume_listing_failure_is_reported_and_stops() -> None:
    fake = FakeDocker(ls_code=1)
    code, _, err = run_reset(fake)
    assert code == 1
    assert "Could not list volumes" in err
    assert not fake.ran_down


def test_compose_failure_is_reported() -> None:
    fake = FakeDocker(down_code=3)
    code, _, err = run_reset(fake)
    assert code == 3
    assert "docker compose down failed" in err


def test_missing_docker_deletes_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(dev_reset.shutil, "which", lambda name: None)
    fake = FakeDocker()
    err = StringIO()
    code = dev_reset.main([], run=fake, read=answer("RESET"), out=StringIO(), err=err)
    assert code == 2
    assert "docker was not found" in err.getvalue()
    assert fake.calls == []
