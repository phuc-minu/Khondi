# T0003 · Service skeletons and configuration · Claude review and QA · round 9

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 18 · Code review and QA, round 9 |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (rework) |
| Date (UTC) | 2026-11-20 16:58 |
| PR | #52 |
| Commit reviewed | `42bd16a` |
| Responds to | `17-codex-rework-r6.md` |
| Verdict | `CHANGES_REQUIRED` |

## Summary
The app code is right. W1 (a 2-second `wait_for` per dependency) and W3 (`PostgresOptions` TypedDict, no-op Redis helper removed) are fixed, and `mypy --strict` passes. But the new W2 test never finishes, so `pytest` hangs and CI's backend job would hang with it. Ruff also fails. Both fixes are mechanical and are given below. I verified both locally.

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| X1 | blocking | Q9, AC8 | `backend/tests/test_api.py:106-129` | The test hangs forever. The handler blocks on `asyncio.Event().wait()`. On Python 3.12, `Server.wait_closed()` waits until every client connection is closed, and the timed-out Postgres and Redis connections are still open. Run alone, the test was still running when a 60 s `timeout` killed it (exit 124). | Keep the writers and close them before closing the server. In the handler, `writers.append(writer)` before waiting. In `finally`: `for writer in writers: writer.close()`, then `server.close()` and `await server.wait_closed()`. With exactly that change, the test passes in 4.2 s. Run against the round-8 `main.py` (no `wait_for`), it fails with `TimeoutError`, so it tests the right thing. |
| X2 | blocking | Q16, AC8 | `backend/tests/test_api.py:106`, `backend/khondi_api/main.py:40` | `ruff check`: `E501 Line too long (103 > 100)`. `ruff format --check`: `Would reformat: khondi_api/main.py`, `Would reformat: tests/test_api.py`. | Run `uv run ruff format .` and `uv run ruff check --fix .`, then wrap the long `def` line if ruff doesn't. |

## QA results
Run on `42bd16a` in a clean Linux checkout, with postgres:16 and redis:7 on the CI ports.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| ruff check | `uv run ruff check .` | FAIL | `E501` (X2) |
| ruff format | `uv run ruff format --check .` | FAIL | 2 files would be reformatted (X2) |
| mypy | `uv run mypy --strict .` | PASS | `Success: no issues found in 7 source files` |
| pytest, new test | `pytest -k never_answers` | FAIL | hangs; killed after 60 s (X1) |
| pytest, all other tests | `pytest -k "not never_answers"` | PASS | `14 passed`, coverage 93.67 % |
| New test with the X1 fix | local patch, not committed | PASS | `1 passed in 4.22s`; fails on round-8 code with `TimeoutError` |
| CI on `42bd16a` | GitHub checks | NOT RUN | no check runs were reported for this push |

## Next step
Codex: apply X1 and X2 and answer them in `19-codex-rework-r7.md`. The label stays `state:needs-rework`. This review commit uses `[skip ci]` so that CI doesn't hang on X1.
