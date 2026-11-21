from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from check_diff_hygiene import (
    check_line,
    missing_handoff,
    parse_added_lines,
    parse_name_status,
    rewritten_handoffs,
)


def rule_ids(path: str, text: str) -> list[str]:
    return [v.rule.rule_id for v in check_line(path, 1, text)]


@pytest.mark.parametrize(
    ("path", "text", "expected"),
    [
        ("backend/app/x.py", "    # TODO: handle later", ["Q4"]),
        ("frontend/src/a.ts", "// FIXME broken", ["Q4"]),
        ("backend/app/x.py", "    raise NotImplementedError", ["Q4"]),
        ("backend/app/x.py", "    except:", ["Q6"]),
        ("backend/app/x.py", "    except Exception: pass", ["Q6"]),
        ("backend/app/x.py", "    except ValueError as exc: ...", ["Q6"]),
        ("frontend/src/a.ts", "} catch (e) {}", ["Q6"]),
        ("backend/app/x.py", "x = f()  # type: ignore", ["Q8"]),
        ("backend/app/x.py", "import os  # noqa", ["Q8"]),
        ("frontend/src/a.ts", "// @ts-ignore", ["Q8"]),
        ("frontend/src/a.ts", "// eslint-disable-next-line", ["Q8"]),
        ("frontend/src/a.ts", "const v: any = 1", ["Q8"]),
        ("frontend/src/a.ts", "const v = x as any", ["Q8"]),
        ("frontend/src/a.test.ts", "it.only('x', () => {})", ["Q9"]),
        ("frontend/src/a.test.ts", "describe.skip('x', () => {})", ["Q9"]),
        ("backend/tests/test_x.py", "@pytest.mark.skip(reason='flaky')", ["Q9"]),
        ("backend/tests/test_x.py", "url = 'postgres://db'", []),
        ("backend/app/x.py", "print('debug')", ["Q14"]),
        ("frontend/src/a.ts", "console.log(state)", ["Q14"]),
        ("backend/app/x.py", "url = 'postgres://db'", ["P3/P10"]),
        ("frontend/src/a.ts", "url = 'https://user:password@example'", ["P3/P10"]),
    ],
)
def test_flags_rule_breaks(path: str, text: str, expected: list[str]) -> None:
    assert rule_ids(path, text) == expected


@pytest.mark.parametrize(
    ("path", "text"),
    [
        ("backend/app/x.py", "x = f()  # type: ignore[attr-defined]  # stub lacks attr"),
        ("backend/app/x.py", "import os  # noqa: F401 re-exported"),
        ("backend/app/x.py", "    except ValueError as exc:"),
        ("backend/app/x.py", "logger.info('todo list loaded')"),
        ("frontend/src/a.ts", "// eslint-disable-next-line no-console -- CLI entry point"),
        ("frontend/src/a.ts", "const company = 'anything'"),
        ("frontend/src/a.ts", "console.error(err)"),
        (".env.example", "DATABASE_URL=postgresql://user:password@localhost/db"),
        ("docs/notes.md", "TODO: write intro"),
        ("scripts/check_diff_hygiene.py", "TODO"),
    ],
)
def test_allows_clean_or_justified_lines(path: str, text: str) -> None:
    assert rule_ids(path, text) == []


def test_parse_added_lines_tracks_paths_and_line_numbers() -> None:
    diff = "\n".join(
        [
            "diff --git a/backend/a.py b/backend/a.py",
            "--- a/backend/a.py",
            "+++ b/backend/a.py",
            "@@ -10,0 +11,2 @@",
            "+first",
            "+second",
            "diff --git a/old.py b/old.py",
            "--- a/old.py",
            "+++ /dev/null",
            "@@ -1 +0,0 @@",
            "-gone",
        ]
    )
    assert parse_added_lines(diff) == [
        ("backend/a.py", 11, "first"),
        ("backend/a.py", 12, "second"),
    ]


HANDOFF = "docs/tasks/T0001-trip-intake/03-codex-handoff.md"


def test_code_change_requires_handoff_file() -> None:
    assert missing_handoff([("M", "backend/app/main.py")])
    assert not missing_handoff([("M", "backend/app/main.py"), ("A", HANDOFF)])


@pytest.mark.parametrize("status", ["M", "D"])
def test_edited_or_deleted_handoff_does_not_count(status: str) -> None:
    changes = [("M", "backend/app/main.py"), (status, HANDOFF)]
    assert missing_handoff(changes)
    assert rewritten_handoffs(changes) == [HANDOFF]


def test_new_handoff_is_not_a_rewrite() -> None:
    assert rewritten_handoffs([("A", HANDOFF), ("M", "docs/tasks/INDEX.md")]) == []


def test_docs_only_change_needs_no_handoff_file() -> None:
    changes = [("M", "AGENTS.md"), ("M", "docs/tasks/README.md"), ("A", ".github/labels.json")]
    assert not missing_handoff(changes)


def test_parse_name_status() -> None:
    output = "M\tbackend/app.py\nD\t" + HANDOFF + "\n"
    assert parse_name_status(output) == [("M", "backend/app.py"), ("D", HANDOFF)]
