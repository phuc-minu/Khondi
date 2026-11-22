# T0007 · Observability PR 1 · Codex review and QA · round 2

| Field | Value |
| --- | --- |
| Task | T0007-observability |
| Step | 08 · Code review and QA, round 2 |
| Author | Codex (independent code reviewer and QA) |
| Date (UTC) | 2026-11-22 |
| PR | #69 |
| Commit reviewed | `1e9bafcb515e4105f028d9157d7665adfb068ab8` |
| Responds to | `07-claude-devops-rework-pr1-r1.md`; `T7P1-R1` |
| Verdict | APPROVE_FOR_OWNER_REVIEW |

## Summary

The rework resolves T7P1-R1. `RedactFilter` removes exception messages and chained messages before stdout and OTLP handlers, retaining only `error_type` and masked traceback frames. The request middleware logs a 500 line and re-raises, while the regression test drives real uvicorn and checks logs and spans.

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | No findings; T7P1-R1 is resolved. | — |

## QA results

| Suite | Status | Evidence |
| --- | --- | --- |
| Backend lint, format, types | PASS | Exact-head CI passed; local `uv` unavailable. |
| Backend unit + integration | PASS | Exact-head CI passed: 68 tests, 96.23% coverage. |
| Redaction regression | PASS | Test uses `uvicorn.Server`, HTTP request, request-line/error-type assertions, OTLP export, span and canary assertions. |
| Diff hygiene | PASS | Local `python scripts/check_diff_hygiene.py 6fb4232` reported no violations. |
| CI on PR | PASS | All checks passed on exact head `1e9bafc`; merge state CLEAN. |

## Acceptance criteria coverage

PR1 redaction, error request logging, trace propagation and exception re-raise criteria pass. Source-code frames remain, but runtime exception messages are removed, consistent with R1–R4.

## Next step

PR #69 is ready for Phil’s Gate 2 review once the lower stacked PRs are approved.
