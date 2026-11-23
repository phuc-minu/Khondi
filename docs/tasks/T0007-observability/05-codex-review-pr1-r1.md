# T0007 · Observability · Codex review and QA · round 1

| Field | Value |
| --- | --- |
| Task | T0007-observability |
| Step | 05 · Code review and QA, round 1 |
| Author | Codex (independent code reviewer and QA) |
| Date (UTC) | 2026-11-22 |
| PR | #69 (T0007 PR 1 carried in the #69 base) |
| Commit reviewed | `531f5249a844269a8ed6d9242ffdbefcad65467a` |
| Responds to | `03-claude-devops-handoff.md` |
| Verdict | CHANGES_REQUIRED |

## Summary

The T0007 PR 1 implementation is substantially within scope and the reported CI checks pass on the exact commit. It cannot proceed to owner review because the handoff explicitly identifies an unhandled-exception logging path that can emit request/job content, violating the standing redaction contract.

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| T7P1-R1 | blocking | R1, R4, Q14 | `backend/khondi_api/telemetry.py` (uvicorn error logging setup) | The handoff says unhandled API exceptions remain logged by uvicorn with their traceback and only URL credentials are masked. A handler that raises with a request message or job argument can therefore place content in stdout and OTLP logs, contrary to the requirement that no request/job content is logged. The committed tests cover handled/failing echo paths but not this unhandled-exception path. | Ensure the production error-log path serializes only approved fields (or removes exception message/traceback content) before both stdout and OTLP handlers receive it; add a public-interface regression test that raises with `t0007-canary-content` and proves the string is absent from every captured log/export. |

## Code review checklist

- [x] Scope, typing, tests, dependency rationale and CI settings reviewed against Q1–Q16.
- [x] Redaction rules R1–R4 reviewed; T7P1-R1 blocks completion.

## QA results

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend lint, format, types | CI backend job on exact SHA | PASS | Handoff reports ruff, format and `mypy --strict` success; PR checks are green. |
| Backend unit + integration | CI backend job on exact SHA | PASS | Handoff reports 71 passed and 96.17% coverage. |
| Frontend lint, types, unit | Not applicable to this unit | NOT RUN | No frontend changes in PR 1. |
| Playwright E2E | Not applicable to this unit | NOT RUN | No browser behavior in PR 1. |
| Local Docker stack | `docker compose up --wait --build` | NOT RUN | Docker config access is denied in this review environment; exact-SHA CI stack evidence was inspected. |
| CI on the PR | `gh pr checks 69 --repo phuc-minu/Khondi` | PASS | All required checks passed on head `f220389286d3c0206bdaa662929493a3e9502935`; PR 1 was reviewed at carried commit `531f5249a844269a8ed6d9242ffdbefcad65467a`. |

## Acceptance criteria coverage

| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1–7 | Backend telemetry behavior and redaction | Static review, handoff evidence and exact-SHA CI | fail: R1/R4 unhandled-exception path remains |

## Next step

Codex cannot mark #69 ready. Claude must fix T7P1-R1, answer it by ID in the next append-only rework file, rerun the redaction regression and CI on the exact new head, then request re-review.
