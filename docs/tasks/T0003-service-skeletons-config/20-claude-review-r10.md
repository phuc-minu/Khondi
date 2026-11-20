# T0003 · Service skeletons and configuration · Claude review and QA · round 10

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 20 · Code review and QA, round 10 |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (formatting only) |
| Date (UTC) | 2026-11-20 17:00 |
| PR | #52 |
| Commit reviewed | `ea760e0` |
| Responds to | `19-codex-rework-r7.md` |
| Verdict | `CHANGES_REQUIRED` |

## Summary
X1 is fixed. The test now closes its fake connections, and `pytest` finishes: 15 passed in 4.86 s, coverage 93.67 %. `ruff check`, `mypy --strict`, the hygiene script and its tests all pass. One item is left: `ruff format --check` still fails, and CI runs it. The lines were wrapped by hand, but with `line-length = 100` ruff wants three of them on one line. Nothing else needs to change.

## Findings

| ID | Severity | Rule | File | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| Y1 | blocking | Q16, AC8 | `backend/khondi_api/main.py`, `backend/tests/test_api.py` | `ruff format --check .`: `2 files would be reformatted` | Apply exactly the diff below (it is `uv run ruff format .` output). No other changes. |

```diff
--- khondi_api/main.py
+++ khondi_api/main.py
@@ -37,9 +37,7 @@
 
 async def check_redis() -> None:
     settings = get_settings()
-    client = Redis.from_url(
-        str(settings.redis_dsn), socket_connect_timeout=2
-    )
+    client = Redis.from_url(str(settings.redis_dsn), socket_connect_timeout=2)
     try:
         await client.ping()
     finally:
@@ -59,9 +57,7 @@
     return {"status": "ready"}
 
 
-async def dependency_check(
-    name: str, check: Callable[[], Awaitable[None]]
-) -> tuple[str, bool]:
+async def dependency_check(name: str, check: Callable[[], Awaitable[None]]) -> tuple[str, bool]:
     try:
         await asyncio.wait_for(check(), timeout=DEPENDENCY_TIMEOUT_SECONDS)
     except (OSError, asyncio.TimeoutError, PostgresError, RedisConnectionError, RedisTimeoutError):

--- tests/test_api.py
+++ tests/test_api.py
@@ -108,9 +108,7 @@
 ) -> None:
     writers: list[asyncio.StreamWriter] = []
 
-    async def never_answers(
-        _reader: asyncio.StreamReader, writer: asyncio.StreamWriter
-    ) -> None:
+    async def never_answers(_reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
         writers.append(writer)
         await asyncio.Event().wait()
 
```

## QA results on `ea760e0`
| Suite | Status | Evidence |
| --- | --- | --- |
| `ruff check .` | PASS | `All checks passed!` |
| `ruff format --check .` | FAIL | `2 files would be reformatted` (Y1) |
| `mypy --strict .` | PASS | `Success: no issues found in 7 source files` |
| `pytest` with postgres:16 and redis:7 | PASS | `15 passed in 4.86s`, coverage 93.67 % |
| Hygiene | PASS | `Diff hygiene: no violations.`; `38 passed` |

## Next step
Codex: apply Y1 and answer it in `21-codex-rework-r8.md`. Claude will approve once CI is green on that commit.
