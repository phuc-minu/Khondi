# T0018 · New Orleans example page restyle · Codex → Claude handoff

| Field | Value |
| --- | --- |
| Task | T0018-example-restyle |
| Step | 3 · Implementation handoff |
| Author | Codex (Senior Developer) |
| For | Claude (independent code review and QA) |
| Date (UTC) | 2026-11-25 01:59 |
| Branch | `codex/T0018-example-restyle` |
| Implementation commit tested | [`d325c85987555127a9cce413627f8be4ec9d0adb`](https://github.com/phuc-minu/Khondi/commit/d325c85987555127a9cce413627f8be4ec9d0adb) |
| PR | [Draft for this branch](https://github.com/phuc-minu/Khondi/pulls?q=is%3Apr+head%3Acodex%2FT0018-example-restyle) |
| State | `state:needs-claude-review` |

## What changed

- The compact hero uses the shared container and tokens, the three specified trip chips and the full illustrative note.
- The budget card groups the new proportional bar and text legend with the original cost table and no-buffer note. The pure budget-share function derives the percentages from the fixture and the bar uses the unrounded proportions.
- The assumptions card keeps the definition list and exclusions together. The existing day plans have numbered markers and switch to two columns at 768px.

## Acceptance criteria

| # | Criterion | Done? | Evidence |
| --- | --- | --- | --- |
| 1 | Title, one h1, original text, numbers and fixture | Yes | Existing example and fixture tests, plus assertions for the hero chips. |
| 2 | Budget widths and legend match the table | Yes | Unit tests check fixture shares and labels. Playwright reads the table, legend and rendered proportions. |
| 3 | Semantic table and axe | Yes | Caption, header scopes and axe assertions in `example-trip.spec.ts`. |
| 4 | Shared alignment and no horizontal overflow at all four widths | Yes | Example and shell Playwright tests, including existing word-boundary wrapping. |
| 5 | Four day cards in order and a two-column grid from 768px | Yes | Playwright checks order and measured card positions at all four widths. |
| 6 | Canvas gaps and meaningful text legend | Yes | Playwright checks the 2px gap, gap background, legend list, matching swatches and text. |
| 7 | Immediate bar under reduced motion | Yes | Playwright checks visible segments and the computed animation property. |
| 8 | Local requests, banned words and footer sentence | Yes | Existing example and shell Playwright checks. |
| 9 | Local frontend checks | Yes | Output below. |

## Commands run and real output

Run from `frontend/` with Node v24.19.0. Unit tests and the build used `ENVIRONMENT=ci` and `API_BASE_URL=http://api:8000`. The first standalone typecheck attempt overlapped the build while Next regenerated `.next/types` and reported missing generated files (TS6053). The standalone rerun below passed after the build and Playwright completed.

```text
$ npm run typecheck
> typecheck
> tsc --noEmit
```

```text
$ npm run lint -- --max-warnings=0
> lint
> next lint --max-warnings=0

`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .

✔ No ESLint warnings or errors
```

```text
$ npm test
> test
> vitest run
Test Files  7 passed (7)
      Tests  43 passed (43)
   Start at  17:58:27
   Duration  886ms (import 70%, transform 17%, tests 10%, worker 3%)
```

```text
$ npm run build
> build
> next build

✓ Compiled successfully in 1513ms
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/8) ...
   Generating static pages (2/8)
   Generating static pages (4/8)
   Generating static pages (6/8)
 ✓ Generating static pages (8/8)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      127 B         103 kB
├ ○ /_not-found                            990 B         104 kB
├ ○ /about                                 322 B         107 kB
├ ƒ /api/diagnostics/echo                  127 B         103 kB
├ ƒ /api/healthz                           127 B         103 kB
└ ○ /trips/new-orleans-example             727 B         107 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-73938ce8a8eac1ad.js       46.6 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)          2.01 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Port 3000 was occupied. A temporary local Playwright config inherited both repository projects and started the production build on port 3178 using `npm run start -- --port 3178`. The override was removed after the run.

```text
$ npm run e2e -- --config playwright.t0018.local.ts --workers 6
> e2e
> playwright test --config playwright.t0018.local.ts --workers 6

Running 52 tests using 6 workers

  ok 17 [mobile] › e2e\example-trip.spec.ts:65:3 › example trip page › matches the budget bar and legend to the cost table without motion (1.2s)
  ok 20 [desktop] › e2e\example-trip.spec.ts:65:3 › example trip page › matches the budget bar and legend to the cost table without motion (1.2s)
  ok 25 [mobile] › e2e\example-trip.spec.ts:120:3 › example trip page › aligns sections without overflow and reflows day cards at 768px (1.6s)
  ok 27 [desktop] › e2e\example-trip.spec.ts:120:3 › example trip page › aligns sections without overflow and reflows day cards at 768px (1.5s)
  ok 36 [desktop] › e2e\example-trip.spec.ts:167:3 › example trip page › has no axe violations, overflow or cross-origin requests (1.6s)
  ok 35 [mobile] › e2e\example-trip.spec.ts:167:3 › example trip page › has no axe violations, overflow or cross-origin requests (1.6s)
  52 passed (12.3s)
```

## Quality rules self-check

- Q1, Q3–Q5, Q11 and Q13. The diff is scoped to the approved route, its components and tests. It reuses the existing fixture, money formatter, note, link and CSS tokens.
- Q2 exception. The implementation and tests change 493 lines before the handoff records. The expanded CSS and responsive and DOM regression assertions keep the work together in one route-scoped PR.
- Q6–Q8. The budget calculation accepts typed fixture data and has no external data boundary. The TypeScript check passed.
- Q9–Q10. Unit and browser checks cover the new behavior. The existing assumptions assertion is scoped to the assumptions section so it still checks that section after the hero adds the same trip facts.
- Q12, Q14–Q16. No dependency, application logging, credential or quality gate changes.

## New dependencies

None.

## Deviations from the spec

None.

## Risks and known limits

Local browser verification used the repository’s Chromium desktop and mobile projects. CI and independent review are pending.

## Follow-ups

Claude reviews and runs independent QA on the exact draft head. Photos remain a later asset task, and additional copy remains with the Product Manager under [D2 and D3](../T0016-visual-design/03-claude-design-review.md#owner-decisions).
