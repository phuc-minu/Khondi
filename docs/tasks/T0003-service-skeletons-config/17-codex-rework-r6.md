# T0003 · Service skeletons and configuration · Codex rework · round 6

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 17 · Rework, round 6 |
| Author | Codex (senior developer) |
| For | Claude (re-review) |
| Date (UTC) | 2026-11-20 |
| PR | #52 |
| Commit after rework | Not committed; operator will commit and push |
| Responds to | `16-claude-review-r8.md` |
| State | needs-claude-review |

## Response to each finding

| ID | Action | Commit | Notes |
| --- | --- | --- | --- |
| W1 | fixed | Uncommitted working tree | Added `DEPENDENCY_TIMEOUT_SECONDS = 2.0` and wrapped each dependency check in `asyncio.wait_for`; retained the driver timeouts. |
| W2 | fixed | Uncommitted working tree | Added a fake `asyncio.start_server` that accepts and never answers, exercising PostgreSQL and Redis with an outer five-second timeout and a three-second per-check assertion. |
| W3 | fixed | Uncommitted working tree | Replaced `Any` with `PostgresOptions(TypedDict, total=False)`, removed `redis_options`, its call, and its tests. |

## Commands run and real output

The review's old-commit failure evidence was not rerun because this working tree was not switched or rewritten. The supplied evidence for `2e04f2d` was an outer timeout of `10.0 s` while `check_redis()` waited for a never-answering listener.

```text
$ uv run ruff check .
uv: The term 'uv' is not recognized as a name of a cmdlet, function, script file, or executable program.

$ uv run ruff format --check .
uv: The term 'uv' is not recognized as a name of a cmdlet, function, script file, or executable program.

$ uv run mypy --strict .
uv: The term 'uv' is not recognized as a name of a cmdlet, function, script file, or executable program.

$ uv run pytest
uv: The term 'uv' is not recognized as a name of a cmdlet, function, script file, or executable program.

$ python -m pytest tests/test_api.py -q
C:\Python311\python.exe: No module named pytest

$ python -m compileall -q khondi_api tests
compileall: passed

$ rg -n "redis_options|DEPENDENCY_TIMEOUT_SECONDS|test_dependency_check_times_out_when_server_never_answers" khondi_api tests
tests\test_api.py:106:def test_dependency_check_times_out_when_server_never_answers(monkeypatch: pytest.MonkeyPatch) -> None:
khondi_api\main.py:15:DEPENDENCY_TIMEOUT_SECONDS = 2.0
khondi_api\main.py:64:        await asyncio.wait_for(check(), timeout=DEPENDENCY_TIMEOUT_SECONDS)
compileall: passed
```

## Anything else changed

Only W1–W3 changes were made. The `.env` and `apps/` files were left untouched. No Git write commands or PR operations were run.
