# T0013 · QA rework r1 (finding D1)

| Field | Value |
| --- | --- |
| Task | T0013-new-orleans-example |
| Step | Rework after Claude QA FAIL at `5914ca5` |
| Author | Claude (see `05-claude-authorship-correction.md`; this PR was authored by Claude) |
| Date (UTC) | 2026-11-23 |
| Answers | Claude QA D1 (Medium) |

## D1: cost-table row headers broke mid-word at 320, 375 and 414px
`overflow-wrap:anywhere` on `.cell` in `CostBreakdown.module.css` allowed breaks inside words ("Getting" split across lines).

**Fix (CSS only, Q1/Q3):** removed `overflow-wrap:anywhere` from `.cell`, and reduced horizontal cell padding to `var(--space-2)` below 640px so the table still fits at 320px without breaking words. No other change.

**Regression test (Q9):** `e2e/example-trip.spec.ts` now has `cost table wraps only at word boundaries at 320/375/414px` in both projects. For every word in the table body it checks that the word occupies a single line box, and that neither the table wrapper nor the page overflows horizontally.

## Evidence (local, Windows)
Against the old CSS, the new test fails in both projects at all three widths:
```text
-   "brokenWords": Array [],
+   "brokenWords": Array [
+     "Getting",
```
With the fix:
```text
$ npm run typecheck   -> passed
$ npm run lint        -> No ESLint warnings or errors
$ npm test            -> Test Files 6 passed (6); Tests 39 passed (39)
$ npx playwright test -> 38 passed (32 earlier + 6 new)
```
CI on the pushed head is the authoritative evidence and had not run when this was written.

## Other findings
The review file (`04`) and the Codex cross-check (`06`) are committed alongside this file. Non-blocking items are recorded, not fixed here:
- **NB1** (About "a live price"): accepted as a documented T0013 exception. Epic-wide AC3 stays PARTIAL, and a copy correction is tracked as a follow-up.
- **NB3** (no Senior Designer review): pending a user decision.
