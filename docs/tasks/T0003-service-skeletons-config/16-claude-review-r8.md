# T0003 · Service skeletons and configuration · Claude review and QA · round 8

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 16 · Code review and QA, round 8 |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (rework) |
| Date (UTC) | 2026-11-20 16:42 |
| PR | #52 |
| Commit reviewed | `2e04f2d` |
| Responds to | Codex automated review on `2e04f2d` (two findings), checked by Claude |
| Verdict | `CHANGES_REQUIRED` |

## Summary
`15-claude-review-r7.md` is withdrawn. After the PR was marked ready, Codex's automated review raised two findings. I checked both, and both are real and break the spec or Q8. Everything else from round 5 stands. CI is green on `2e04f2d`.

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| W1 | blocking | AC3, P8, spec "within 2 seconds each" | `backend/khondi_api/main.py` (`check_redis`, `check_postgres`, `dependency_check`) | `socket_connect_timeout=2` only bounds the TCP connect. If Redis accepts the connection but never replies, `await client.ping()` waits forever, and so does `/readyz`. Reproduced: `check_redis()` against a listener that accepts and never answers was still waiting when an outer 10 s `wait_for` stopped it (`TimeoutError`, elapsed 10.0 s). asyncpg's `timeout=2` covers connect plus handshake, but `close()` is not bounded either. | In `dependency_check`, run each check as `await asyncio.wait_for(check(), timeout=DEPENDENCY_TIMEOUT_SECONDS)`, with `DEPENDENCY_TIMEOUT_SECONDS = 2.0` defined once at module level. `asyncio.TimeoutError` is already in the caught tuple, so a timeout counts as "dependency down". Keep `socket_connect_timeout=2` and `timeout=2` on the drivers. |
| W2 | blocking | Q9 | `backend/tests/test_api.py` | Nothing tests a dependency that accepts but never answers. | Add a test that starts an `asyncio.start_server` on `127.0.0.1` port 0, whose handler accepts and never writes. Point `REDIS_URL` at it with `monkeypatch.setenv` plus `get_settings.cache_clear()`, call `dependency_check("redis", main.check_redis)`, assert `("redis", False)`, and assert it returns in under 3 s. Do the same for PostgreSQL. The test must fail on `2e04f2d` (it hangs, so give it an outer `asyncio.wait_for(..., 5)`) and pass with W1. |
| W3 | blocking | Q8 | `backend/khondi_api/connections.py:7,14` | `dict[str, Any]` return types with no Q8 reason. `postgres_options` only returns `{}` or `{"ssl": True}`, and `redis_options` always returns `{}` (S8). | Define `class PostgresOptions(TypedDict, total=False): ssl: bool` and return that. Delete `redis_options` and its call and tests, since the `rediss://` scheme already selects TLS in redis-py (S8). Remove the `Any` import. |

## Required evidence in `17-codex-rework-r6.md`
- The W2 tests failing on `2e04f2d` (timed out) and passing after W1.
- `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy --strict .`, `uv run pytest`. CI runs these if your sandbox can't, so say plainly which ones you ran.
- No other changes.

## Next step
Codex: fix W1–W3 and answer each by ID in `17-codex-rework-r6.md`. The label is set to `state:needs-rework`, and the PR is back in draft. Claude will re-review and, if CI is green, approve for Phil.
