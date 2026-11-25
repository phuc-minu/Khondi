# T0014 · Budget-first trip starter · Codex handoff

| Field | Value |
| --- | --- |
| Task | T0014-budget-starter |
| Step | 3 · Implementation handoff |
| Author | Codex |
| For | Claude, independent code review and QA |
| Date (UTC) | 2026-11-25 00:49 |
| Branch | `codex/T0014-budget-starter` |
| Implementation commit tested | [`97a250dd286e6b1deb67a3ecb0f721bface7c55e`](https://github.com/phuc-minu/Khondi/commit/97a250dd286e6b1deb67a3ecb0f721bface7c55e) |
| Draft PR changes | [Compare implementation branch to main](https://github.com/phuc-minu/Khondi/compare/main...codex%2FT0014-budget-starter) |
| State | `state:needs-claude-review` |

Refs [#56](https://github.com/phuc-minu/Khondi/issues/56). See the [v1 spec](01-spec.md) and [delegated approval](02-approval.md).

## What changed

- `plan-input.ts` validates the form with Zod, loads the known sample prefill, and compares submitted answers against the sample assumptions. Interests are used only for the echo.
- The `/plan` server page supplies metadata, prefill, and a no-JavaScript link. `BudgetStarter` keeps answers in React state and handles errors and step focus within the browser. The controls carry no submission names so a native submission before hydration cannot transmit answers.
- The header and About page link to the starter. The example trip links to the prefilled starter. Shell link prefetching is disabled to prevent background route requests on `/plan`. The sample-plan link makes a normal page navigation when activated.

## Acceptance criteria

| # | Result | Evidence |
| --- | --- | --- |
| 1 | Pass | `tests/plan-input.test.ts` covers validation and exact errors, parsing boundaries, prefill and comparisons. |
| 2 | Pass | `e2e/plan.spec.ts` asserts all four error texts, summary focus, accessible field descriptions and link focus. |
| 3 | Pass | The browser tests assert heading focus, the status announcement, both notes below budget, the mismatch note alone, and neither note for a match. |
| 4 | Pass | The browser tests return to step 1 and check every edited value. |
| 5 | Pass | The browser tests check sample prefill and that an unknown source leaves budget and origin blank. |
| 6 | Pass | The request listener sees only same-origin static assets and the two expected document navigations during the keyboard flow. |
| 7 | Pass | The keyboard flow passes on desktop and mobile. |
| 8 | Pass | Axe reports zero violations in all three planner states on both projects. At 320×640, each page fits and each header CTA measures at least 44×44. |
| 9 | Pass | The browser tests follow both Start planning entries and Customize this trip. |
| 10 | Pending CI | Claude should verify the `frontend` and `e2e` jobs on the draft PR head. |

## Commands run and output

Local Windows results. `npm run e2e` also built the final implementation through the configured Playwright web server.

```text
$ npm run lint -- --max-warnings=0
> next lint --max-warnings=0
✔ No ESLint warnings or errors

$ npm run typecheck
> tsc --noEmit

$ npm test
 Test Files  7 passed (7)
      Tests  77 passed (77)

$ npm run build
 ✓ Compiled successfully in 9.0s
 ✓ Generating static pages (9/9)
├ ƒ /plan                                27.6 kB         130 kB
ƒ  (Dynamic)  server-rendered on demand

$ npm run e2e
  6 failed
  44 passed (1.4m)

$ npm run e2e -- plan.spec.ts --workers=4
  12 passed (9.7s)

$ npm run e2e
Running 50 tests using 8 workers
  50 passed (38.2s)

$ npm audit --omit=dev
found 0 vulnerabilities

$ python scripts/check_diff_hygiene.py origin/main
Diff hygiene: no violations.
```

The first Playwright run matched the framework's route announcer with the page-wide alert selector and failed to resolve `noscript` descendants through text-based locators. The final run scopes the alert to the main landmark and checks and follows the actual `noscript` markup. Next emitted the existing lint deprecation and standalone startup warnings. Vitest emitted an existing Vite config-loader warning.

## Quality rules and review notes

- Q2 size is 576 added lines before this handoff, including 270 test lines and the approval record. The tests exercise the approved validation, keyboard, accessibility, privacy and navigation criteria in one reviewable PR.
- The source diff adds no forbidden phrases. The pre-existing About disclosure still contains the phrase identified in the [T0013 handoff](../T0013-new-orleans-example/03-codex-handoff.md). A scan across the entire site would still flag that line.
- No new dependencies. Claude should independently verify the network boundary, keyboard and accessibility behavior, and CI on the draft head.
