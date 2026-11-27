# T0017 · Design tokens and site shell · Codex → Claude handoff

| Field | Value |
| --- | --- |
| Task | T0017-design-shell |
| Step | 3 · Implementation handoff |
| Author | Codex (Senior Developer) |
| For | Claude (independent code review and QA) |
| Date (UTC) | 2026-11-25 01:37 |
| Branch | `codex/T0017-design-shell` |
| Implementation commit tested | [`2dfabc0e2506bd640e5f3874190cde35b068b3e2`](https://github.com/phuc-minu/Khondi/commit/2dfabc0e2506bd640e5f3874190cde35b068b3e2) |
| PR | [Draft for this branch](https://github.com/phuc-minu/Khondi/pulls?q=is%3Apr+head%3Acodex%2FT0017-design-shell) |
| State | `state:needs-claude-review` |

## What changed

- Added the [approved](02-approval.md) design tokens and shared container. The root main uses it, and the About and example wrappers retain their vertical padding.
- Made the header sticky and added the brand lockup, route-aware navigation and mobile disclosure. With JavaScript disabled, the navigation remains visible. The primary CTA is **See example trip**, which uses the existing sample route while `/plan` is pending.
- Restyled the footer, buttons and illustrative note. The footer retains the exact T0010 privacy sentence. The same original K mark appears in both landmarks and in the local SVG favicon.
- Applied the header-height scroll margin to the skip target and future `#how-it-works` target. Set the home scaffold's single h1 and title to the approved T0010 wording.
- Extended the shell Playwright coverage and updated the About and example navigation checks to open the disclosure at mobile widths.

## Acceptance criteria

| # | Criterion | Done? | Evidence |
| --- | --- | --- | --- |
| 1 | Shared left edge at 1280, 768, 375 and 320px | Yes | `shell.spec.ts` measures content on all three routes. |
| 2 | No overflow at 320px and word-boundary table wrapping | Yes | `shell.spec.ts` and existing `example-trip.spec.ts` checks. |
| 3 | Sticky header and minimum target sizes | Yes | `shell.spec.ts` measures sticky position at scroll, 48px CTA minimum and 44×44px hit areas. |
| 4 | Accessible mobile disclosure and visible no-JavaScript navigation | Yes | `shell.spec.ts` exercises click, keyboard traversal, Escape, focus and CTA navigation at 320px, plus navigation with JavaScript disabled. |
| 5 | Footer, h1, titles, forbidden claims, link crawl, axe and active route | Yes | `shell.spec.ts`, `about.spec.ts` and `example-trip.spec.ts`. |
| 6 | WCAG AA contrast and no external requests | Yes | Axe and request checks cover all three routes across the existing Playwright projects. |
| 7 | Reduced motion | Yes | `shell.spec.ts` checks computed scroll and transition styles. |
| 8 | Local frontend checks | Yes | Command excerpts below. |

## Commands run and real output

Run from `frontend/` with Node v24.19.0. Unit tests and the production build used `ENVIRONMENT=ci` and `API_BASE_URL=http://api:8000`; Playwright sets them in its existing web-server configuration. These are local results. Claude will verify the PR head independently.

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

 Test Files  6 passed (6)
      Tests  39 passed (39)
   Start at  17:35:30
   Duration  2.14s (import 62%, transform 23%, tests 12%, worker 3%)
```

```text
$ npm run build
> build
> next build

   ▲ Next.js 15.5.29

   Creating an optimized production build ...
 ✓ Compiled successfully in 9.0s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (8/8)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      127 B         103 kB
├ ○ /_not-found                            993 B         104 kB
├ ○ /about                                 320 B         107 kB
├ ƒ /api/diagnostics/echo                  127 B         103 kB
├ ƒ /api/healthz                           127 B         103 kB
└ ○ /trips/new-orleans-example             478 B         107 kB
+ First Load JS shared by all             103 kB
```

```text
$ npm run e2e
> e2e
> playwright test

[WebServer]  ⚠ "next start" does not work with "output: standalone" configuration. Use "node .next/standalone/server.js" instead.

Running 48 tests using 6 workers

  ok  41 [desktop] › e2e\shell.spec.ts:72:3 › site shell › is sticky and gives the skip target the header clearance (790ms)
  ok  42 [mobile] › e2e\shell.spec.ts:72:3 › site shell › is sticky and gives the skip target the header clearance (739ms)
  ok  43 [desktop] › e2e\shell.spec.ts:85:3 › site shell › menu works by click and keyboard and restores focus on close and navigation (1.7s)
  ok  44 [mobile] › e2e\shell.spec.ts:85:3 › site shell › menu works by click and keyboard and restores focus on close and navigation (1.6s)
  ok  45 [desktop] › e2e\shell.spec.ts:127:3 › site shell › keeps the navigation visible without JavaScript (627ms)
  ok  46 [mobile] › e2e\shell.spec.ts:127:3 › site shell › keeps the navigation visible without JavaScript (625ms)
  ok  48 [mobile] › e2e\shell.spec.ts:140:3 › site shell › disables smooth scrolling and button transitions for reduced motion (543ms)
  ok  47 [desktop] › e2e\shell.spec.ts:140:3 › site shell › disables smooth scrolling and button transitions for reduced motion (597ms)

  48 passed (1.2m)
```

## Quality rules self-check

- Q1, Q3–Q5, Q11 and Q13. Changes cover the shared shell, approved scaffold heading and title, and their tests. Existing CSS Modules and public component props are retained.
- Q6–Q8. No new data boundary or error handling. The client disclosure uses typed React events and strict TypeScript.
- Q9–Q10. The Playwright additions exercise the changed behavior and the local command excerpts are above.
- Q12, Q14–Q16. No new dependencies, logging, credentials, or quality gate changes.
- Q2 exception. The implementation changes 565 lines before the handoff records. Expanded CSS and regression tests account for most of the diff. The components share one container and the draft covers the single shell task.

## New dependencies

None.

## Deviations from the spec

None. The spec permits the sample CTA until T0014. The current scaffold receives only the approved h1 and title needed for the existing-route acceptance criteria.

## Risks and known limits

The no-JavaScript layout displays the full navigation at mobile widths. Automated coverage uses Chromium and the repository's desktop and mobile projects.

## Follow-ups

- T0014 adds `/plan` and switches the header CTA to **Start planning**.
- T0015 adds the landing sections and the **How it works** link. Verify heading focus with the sticky-header offset once the target exists.
- Claude reviews and runs independent QA on the exact draft head, including the required CI checks.
