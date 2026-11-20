"""Block pull requests whose added lines break the mechanical code quality rules.

Checks only lines added relative to the base branch, so existing code is not
re-litigated. Rule IDs refer to "Code quality rules" in AGENTS.md.

Usage: python scripts/check_diff_hygiene.py <base-ref>
"""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import PurePosixPath

PY = (".py",)
TS = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
CODE = PY + TS

# Paths whose purpose is to talk about these patterns.
EXEMPT_PREFIXES = ("scripts/check_diff_hygiene.py", "scripts/tests/")

TASK_FILE = re.compile(r"^docs/tasks/T\d{4}-[a-z0-9-]+/\d{2}-[a-z0-9-]+\.md$")
NON_CODE_PREFIXES = ("docs/", ".github/", ".agents/", ".claude/")
NON_CODE_FILES = ("README.md", "AGENTS.md")


@dataclass(frozen=True)
class Rule:
    rule_id: str
    message: str
    pattern: re.Pattern[str]
    suffixes: tuple[str, ...]


RULES: tuple[Rule, ...] = (
    Rule("Q4", "unfinished-work marker", re.compile(r"\b(TODO|FIXME|XXX|HACK)\b"), CODE),
    Rule("Q4", "stub body", re.compile(r"raise\s+NotImplementedError\b"), PY),
    Rule("Q6", "bare except", re.compile(r"^\s*except\s*:"), PY),
    Rule(
        "Q6",
        "swallowed exception",
        re.compile(r"except\b[^:]*:\s*(pass|\.\.\.)\s*(#.*)?$"),
        PY,
    ),
    Rule("Q6", "empty catch block", re.compile(r"catch\s*(\([^)]*\))?\s*\{\s*\}"), TS),
    Rule(
        "Q8",
        "type: ignore without an error code",
        re.compile(r"#\s*type:\s*ignore(?!\[)"),
        PY,
    ),
    Rule("Q8", "noqa without a rule code", re.compile(r"#\s*noqa(?!:)"), PY),
    Rule("Q8", "ts-ignore / ts-nocheck", re.compile(r"@ts-(ignore|nocheck)\b"), TS),
    Rule(
        "Q8",
        "eslint-disable without rule and reason",
        re.compile(r"eslint-disable(?:-next-line|-line)?(?![-\w])(?!\s+\S+.*\s--\s+\S)"),
        TS,
    ),
    Rule("Q8", "explicit any", re.compile(r"(:\s*any\b|\bas\s+any\b|<any>)"), TS),
    Rule(
        "Q9",
        "skipped or focused test",
        re.compile(r"(\b(it|test|describe)\.(skip|only)\(|\bxit\(|\bfdescribe\(|\bfit\()"),
        TS,
    ),
    Rule(
        "Q9",
        "skipped test",
        re.compile(r"(pytest\.mark\.skip\b|@unittest\.skip|pytest\.skip\()"),
        PY,
    ),
    Rule("Q14", "print in code", re.compile(r"^\s*print\("), PY),
    Rule("Q14", "console logging", re.compile(r"\bconsole\.(log|debug|info)\("), TS),
    Rule(
        "P3/P10",
        "backing-service host literal or credential URL",
        re.compile(r"(?:localhost|127\.0\.0\.1|postgres:|redis:|://[^\s/:]+:[^\s/@]+@)"),
        CODE,
    ),
)


@dataclass(frozen=True)
class Violation:
    path: str
    line_no: int
    rule: Rule
    text: str

    def __str__(self) -> str:
        where = f"{self.path}:{self.line_no}"
        return f"{where}: {self.rule.rule_id} {self.rule.message}: {self.text.strip()}"


def is_exempt(path: str) -> bool:
    return path.startswith(EXEMPT_PREFIXES)


def check_line(path: str, line_no: int, text: str) -> list[Violation]:
    if is_exempt(path):
        return []
    suffix = PurePosixPath(path).suffix
    return [
        Violation(path, line_no, rule, text)
        for rule in RULES
        if suffix in rule.suffixes and rule.pattern.search(text)
    ]


HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")


def parse_added_lines(diff: str) -> list[tuple[str, int, str]]:
    """Return (path, new line number, text) for each added line in a unified diff."""
    added: list[tuple[str, int, str]] = []
    path: str | None = None
    line_no = 0
    for raw in diff.splitlines():
        if raw.startswith("+++ "):
            target = raw[4:]
            path = target[2:] if target.startswith("b/") else None
            continue
        hunk = HUNK.match(raw)
        if hunk:
            line_no = int(hunk.group(1))
            continue
        if path is None or raw.startswith(("--- ", "diff ", "index ")):
            continue
        if raw.startswith("+"):
            added.append((path, line_no, raw[1:]))
            line_no += 1
        elif raw.startswith(" "):
            line_no += 1
    return added


Change = tuple[str, str]  # (git name-status letter, path)


def missing_handoff(changes: list[Change]) -> bool:
    """True when code changed but no new task handoff file was added."""
    touches_code = any(
        not p.startswith(NON_CODE_PREFIXES) and p not in NON_CODE_FILES for _, p in changes
    )
    added_handoff = any(status == "A" and TASK_FILE.match(p) for status, p in changes)
    return touches_code and not added_handoff


def rewritten_handoffs(changes: list[Change]) -> list[str]:
    """Earlier handoff files that were edited or deleted, which breaks append-only."""
    return [p for status, p in changes if status != "A" and TASK_FILE.match(p)]


def parse_name_status(output: str) -> list[Change]:
    changes: list[Change] = []
    for line in output.splitlines():
        if line:
            status, path = line.split("\t", 1)
            changes.append((status[0], path))
    return changes


def git(*args: str) -> str:
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        sys.stderr.write("usage: check_diff_hygiene.py <base-ref>\n")
        return 2
    base = argv[1]
    diff = git("diff", "--unified=0", "--no-color", f"{base}...HEAD")
    changes = parse_name_status(git("diff", "--name-status", "--no-renames", f"{base}...HEAD"))

    violations = [v for path, n, text in parse_added_lines(diff) for v in check_line(path, n, text)]
    for violation in violations:
        sys.stdout.write(f"{violation}\n")

    rewritten = rewritten_handoffs(changes)
    for path in rewritten:
        sys.stdout.write(f"{path}: handoff files are append-only; add a new file instead.\n")

    handoff_missing = missing_handoff(changes)
    if handoff_missing:
        sys.stdout.write(
            "Code changed but no handoff file under docs/tasks/T####-<slug>/ was added. "
            "See docs/tasks/README.md.\n"
        )

    if violations or rewritten or handoff_missing:
        sys.stdout.write("\nSee 'Code quality rules' in AGENTS.md.\n")
        return 1
    sys.stdout.write("Diff hygiene: no violations.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
