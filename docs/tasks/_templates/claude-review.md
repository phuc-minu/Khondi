# T0000 · <Task title> · Claude review and QA · round K

| Field | Value |
| --- | --- |
| Task | T0000-<slug> |
| Step | NN · Code review and QA, round K |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (if rework) or Phil (if approved) |
| Date (UTC) | YYYY-MM-DD HH:MM |
| PR | #<n> |
| Commit reviewed | <full sha> |
| Responds to | `NN-codex-handoff.md` or `NN-codex-rework-r(K-1).md` |
| Verdict | `APPROVE_FOR_OWNER_REVIEW` / `CHANGES_REQUIRED` / `BLOCKED` |

## Summary
Two or three sentences: is this ready for Phil, and if not, what most needs fixing.

## Findings
Each finding has an ID that the rework file answers by ID. Blocking findings must be fixed. Non-blocking ones may be fixed or answered with a reason.

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| R1 | blocking / non-blocking | Q<n> | | | |

## Code review checklist
- [ ] Matches the approved spec version; nothing extra, nothing missing (Q1)
- [ ] Diff is small and focused; no unrelated refactors or reformatting (Q2, Q3)
- [ ] No TODOs, stubs, placeholders, fake data passed off as real, or commented-out code (Q4)
- [ ] No dead or speculative code (Q5)
- [ ] Errors are specific, handled or re-raised with context; nothing swallowed; unknown never turned into confirmed (Q6)
- [ ] Inputs validated at boundaries with typed schemas (Q7)
- [ ] Fully typed; no unexplained `Any` / `any`, casts or suppressions (Q8)
- [ ] Every behavior change has a test that fails without it; no weakened or skipped tests (Q9)
- [ ] Every claimed command result is backed by pasted output (Q10)
- [ ] Follows existing patterns and reuses helpers (Q11)
- [ ] New dependencies justified, or none (Q12)
- [ ] Comments explain why; no filler (Q13)
- [ ] Structured logging with trace ID; no print or console logging; no secrets or PII in logs (Q14)
- [ ] No secrets, tokens or personal data anywhere in the diff or PR text (Q15)
- [ ] No CI, lint, type or coverage settings loosened (Q16)
- [ ] Architecture: providers behind interfaces, deterministic verifier separate from the LLM, ADR followed

## QA results
Run on the commit above. Status per suite: `PASS`, `FAIL` or `NOT RUN (reason)`.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend lint, format, types | | | |
| Backend unit + integration | | | |
| Frontend lint, types, unit | | | |
| Replay evals | | | |
| Playwright E2E | | | trace / screenshot path |
| CI on the PR | link | | |

## Acceptance criteria coverage
| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1 | | | pass / fail |

## Next step
- `CHANGES_REQUIRED`: Codex, fix every blocking finding above and answer each finding by ID in `NN-codex-rework-rK.md`. Label set to `state:needs-rework`.
- `APPROVE_FOR_OWNER_REVIEW`: Phil, this PR is ready for your review. It is marked ready, assigned to you and your review is requested. This is not a merge approval; that is yours to give. Label set to `state:ready-for-phil`.
- `BLOCKED`: what decision or fix is needed, and from whom. Label set to `state:blocked`.
