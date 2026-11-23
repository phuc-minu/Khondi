# T0000 · <Task title> · Claude review and QA · round K

| Field | Value |
| --- | --- |
| Task | T0000-<slug> |
| Step | NN · Code review and QA, round K |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (if rework) or the merging Claude (if approved) |
| Date (UTC) | YYYY-MM-DD HH:MM |
| PR | #<n> |
| Commit reviewed | <full sha> |
| Responds to | `NN-codex-handoff.md` or `NN-codex-rework-r(K-1).md` |
| Verdict | `APPROVE_FOR_MERGE` / `CHANGES_REQUIRED` / `BLOCKED` |

## Summary
Two or three sentences: does this pass the merge gate, and if not, what most needs fixing.

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
| CI on the PR (all required checks, this SHA) | link | | |

## Merge gate items
- [ ] Reviewer session did not write this code; Codex cross-check done if Claude wrote it
- [ ] Senior Designer fidelity review passed, or not a UI change
- [ ] Nothing on the hard boundary, or Phil's explicit approval is linked:
- [ ] PR body uses `Refs #N` with no `Closes`/`Fixes`/`Resolves`

## Acceptance criteria coverage
| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1 | | | pass / fail |

## Next step
- `CHANGES_REQUIRED`: Codex, fix every blocking finding above and answer each finding by ID in `NN-codex-rework-rK.md`. Label set to `state:needs-rework`.
- `APPROVE_FOR_MERGE`: review and QA pass on the commit above. The merging Claude completes the merge gate in `NN-merge-record.md`, sets `state:ready-to-merge` and merges. Phil is not asked to review. This verdict is void if any commit other than the merge record lands after it.
- If a hard-boundary item lacks Phil's approval: label set to `state:needs-owner-approval`, and the approval needed is named here.
- `BLOCKED`: what decision or fix is needed, and from whom. Label set to `state:blocked`.
