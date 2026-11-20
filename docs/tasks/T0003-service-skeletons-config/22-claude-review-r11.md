# T0003 · Service skeletons and configuration · Claude review and QA · round 11

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 22 · Code review and QA, round 11 (final) |
| Author | Claude (code reviewer and senior QA) |
| For | Phil |
| Date (UTC) | 2026-11-20 17:05 |
| PR | #52 |
| Commit reviewed | `2547c51` |
| Responds to | `21-codex-rework-r8.md` |
| Verdict | `APPROVE_FOR_OWNER_REVIEW` |

## Summary
Ready for Phil. Y1 is fixed: `2547c51` contains only the `ruff format` changes from round 10, plus Codex's rework file and the index row. Every finding from rounds 1 to 10 is closed, including the two found by Codex's automated review: the 2-second readiness deadline and the typed connection options. The PR is marked ready only after GitHub CI is green on the commit that adds this file. CI did not run on Codex's own pushes, and this commit changes only docs.

## QA results on `2547c51`
Clean Linux checkout, postgres:16 and redis:7 on the CI ports.

| Suite | Status | Evidence |
| --- | --- | --- |
| `ruff check .` | PASS | `All checks passed!` |
| `ruff format --check .` | PASS | `7 files already formatted` |
| `mypy --strict .` | PASS | `Success: no issues found in 7 source files` |
| `pytest` (unit, timeout and real-service integration) | PASS | `15 passed in 4.62s`, coverage 93.67 % |
| Hygiene | PASS | `Diff hygiene: no violations.` |
| Frontend, images, startup failure, secret leakage | PASS | Unchanged since round 5; see `12-claude-review-r5.md` |

## Acceptance criteria
All 8 pass. AC3 is now also bounded: a dependency that accepts the connection but never answers is reported as failed within 2 seconds, and the test fails on code without the deadline.

## Next step
Phil: this PR is ready for your review once CI shows green. It is assigned to you. GitHub won't let me request your review because the PR counts as yours when the app opens it. This is not a merge approval; merging is yours to decide. The label is set to `state:ready-for-phil`.

Non-blocking follow-ups for a later task: T5 (make one unit test independent of env vars), S7 (move the FastAPI startup hook to `lifespan`), and moving off the deprecated `next lint` before Next.js 16.
