# T0015 · Landing page · Codex → Claude handoff

| Field | Value |
| --- | --- |
| Task | T0015-landing |
| Step | 3 · Implementation handoff |
| Author | Codex (Senior Developer) |
| For | Claude (independent code review and QA) |
| Date (UTC) | 2026-11-25 14:54 |
| Branch | `codex/T0015-landing` |
| Implementation commit tested | [`3997abc1211fc6f06792873120a72e91186bd2c4`](https://github.com/phuc-minu/Khondi/commit/3997abc1211fc6f06792873120a72e91186bd2c4) |
| PR | [Draft for this branch](https://github.com/phuc-minu/Khondi/pulls?q=is%3Apr+head%3Acodex%2FT0015-landing) |
| State | `state:needs-claude-review` |

## What changed

- The landing page renders the four approved sections inside the site's shared container. It uses the T0017 tokens, the exact T0010 copy and the specified metadata. A gradient and a decorative route motif occupy the hero's second column from 768px. The trip card uses the two approved chips and the short illustrative note.
- The shared `StepList` renders three numbered cards with decorative connectors. The shared `LinkButton` can disable prefetch, which the landing CTA uses while `/plan` is pending.
- The shared navigation includes `/#how-it-works` before About. The section takes focus on arrival and the existing sticky-header scroll margin keeps its heading visible.
- Playwright covers the landing layout, CTA destinations and keyboard focus. The navigation suite crawls links and anchors on the three available pages and checks titles, headings, footer copy and prohibited claims. The shell coverage retains the favicon and scaffold h1 checks.

## Acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Landing returns 200 with the approved title, description, h1 and section order | Passed locally | `e2e/landing.spec.ts` |
| How it works sets the fragment and moves focus from Home and About. Home alone is current on landing | Passed locally | `e2e/landing.spec.ts` |
| Both example CTAs reach the example page and the primary CTA points to `/plan` | Passed locally | `e2e/landing.spec.ts`. The addendum accepts the temporary 404. |
| Public links, anchors, titles, h1s, footer and claim scan pass in both projects | Passed locally | `e2e/navigation.spec.ts`. The route crawl skips exactly `/plan`. |
| All live pages pass axe, fit 320×640 and use same-origin requests. Landing layouts fit at 320, 375, 768 and 1280px | Passed locally | Landing, shell, About and example Playwright specs in both projects |
| Production dependency audit and PR-head CI | Audit passed locally. CI pending at handoff | `npm audit --omit=dev` and the draft PR checks |

## Commands run and real output

These commands ran from `frontend/` on Windows with Node v24.19.0 and npm 9.6.7. The build and Vitest used `ENVIRONMENT=ci` and `API_BASE_URL=http://api:8000`. Port 3000 was occupied by another checkout, so a temporary Playwright config imported the repository config and ran `npm run start -- --port 3015` against the production build above. Only the start command, port and server reuse changed. The temporary config was removed.

The first Playwright run reported the failures below. The follow-up fixed the connector's scroll box, rounded the scroll-position measurement to CSS pixels while keeping the exact scroll-margin assertion, updated the nav-order expectations and disabled prefetch of the pending starter route.

```text
  9 failed
    [desktop] › e2e\example-trip.spec.ts:157:3 › example trip page › lists Example trip second in header and footer and marks it current
    [desktop] › e2e\landing.spec.ts:55:3 › hero and cards fit and reflow at 768px ──────────────────
    [desktop] › e2e\landing.spec.ts:55:3 › hero and cards fit and reflow at 1280px ─────────────────
    [desktop] › e2e\shell.spec.ts:9:3 › site shell › has accessible landmarks and no third-party requests
    [mobile] › e2e\example-trip.spec.ts:157:3 › example trip page › lists Example trip second in header and footer and marks it current
    [mobile] › e2e\landing.spec.ts:24:1 › How it works is reachable from the home and About menus and focuses the section
    [mobile] › e2e\landing.spec.ts:55:3 › hero and cards fit and reflow at 768px ───────────────────
    [mobile] › e2e\landing.spec.ts:55:3 › hero and cards fit and reflow at 1280px ──────────────────
    [mobile] › e2e\shell.spec.ts:9:3 › site shell › has accessible landmarks and no third-party requests
  61 passed (43.0s)
```

The final runs exited 0. Output excerpts follow.

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
   Start at  06:52:48
   Duration  1.23s (import 74%, transform 12%, tests 11%, worker 3%)

```

```text
$ npm run build
> build
> next build

   ▲ Next.js 15.5.29

   Creating an optimized production build ...
 ✓ Compiled successfully in 5.0s
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
┌ ○ /                                      507 B         107 kB
├ ○ /_not-found                            995 B         104 kB
├ ○ /about                                 333 B         107 kB
├ ƒ /api/diagnostics/echo                  126 B         103 kB
├ ƒ /api/healthz                           126 B         103 kB
└ ○ /trips/new-orleans-example             732 B         107 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-73938ce8a8eac1ad.js       46.6 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)             2 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

```

```text
$ npm run e2e -- --config .t0015-playwright.config.ts
Running 70 tests using 10 workers
  ok  4 [mobile] › e2e\landing.spec.ts:5:1 › renders the four landing sections and the approved metadata (2.2s)
  ok  2 [desktop] › e2e\landing.spec.ts:5:1 › renders the four landing sections and the approved metadata (2.4s)
  ok  3 [mobile] › e2e\navigation.spec.ts:18:1 › all public pages keep distinct titles, one h1, and the approved claims and footer (2.8s)
  ok  1 [desktop] › e2e\navigation.spec.ts:18:1 › all public pages keep distinct titles, one h1, and the approved claims and footer (2.9s)
  ok 14 [desktop] › e2e\landing.spec.ts:24:1 › How it works is reachable from the home and About menus and focuses the section (2.0s)
  ok 13 [mobile] › e2e\landing.spec.ts:24:1 › How it works is reachable from the home and About menus and focuses the section (2.2s)
  ok 17 [mobile] › e2e\navigation.spec.ts:37:1 › every public link reaches its page and any named anchor (4.2s)
  ok 18 [desktop] › e2e\navigation.spec.ts:37:1 › every public link reaches its page and any named anchor (4.5s)
  ok 24 [mobile] › e2e\landing.spec.ts:43:1 › links to the pending planner and both example trip calls to action work (3.3s)
  ok 22 [desktop] › e2e\landing.spec.ts:43:1 › links to the pending planner and both example trip calls to action work (3.3s)
  ok 36 [desktop] › e2e\landing.spec.ts:56:3 › hero and cards fit and reflow at 320px (1.4s)
  ok 35 [mobile] › e2e\landing.spec.ts:56:3 › hero and cards fit and reflow at 320px (1.5s)
  ok 40 [mobile] › e2e\landing.spec.ts:56:3 › hero and cards fit and reflow at 375px (805ms)
  ok 39 [desktop] › e2e\landing.spec.ts:56:3 › hero and cards fit and reflow at 375px (948ms)
  ok 44 [mobile] › e2e\landing.spec.ts:56:3 › hero and cards fit and reflow at 768px (1.1s)
  ok 45 [desktop] › e2e\landing.spec.ts:56:3 › hero and cards fit and reflow at 768px (1.3s)
  ok 47 [mobile] › e2e\landing.spec.ts:56:3 › hero and cards fit and reflow at 1280px (897ms)
  ok 48 [desktop] › e2e\landing.spec.ts:56:3 › hero and cards fit and reflow at 1280px (1.0s)
  70 passed (26.6s)
```

```text
$ npm audit --omit=dev
found 0 vulnerabilities
```

```text
$ python scripts/check_diff_hygiene.py origin/main
Diff hygiene: no violations.
```

## Quality rules self-check

- Q1/Q3: The diff covers the approved landing, shared step cards, navigation and their affected assertions. No unrelated routes were restyled.
- Q2: The implementation and tests exceed the 350-line estimate. The landing CSS, end-to-end coverage across four widths and three routes, and this handoff bring the full diff above 400 changed lines.
- Q4–Q8: The implementation uses static approved copy, typed component props and standard Next links. The pending route is an explicit product decision in the addendum.
- Q9/Q10: Public behaviors are covered by the existing and added Playwright checks. Actual command output is above.
- Q11–Q16: Reused the shared shell and components. No dependency, telemetry, secret handling or CI configuration changes.

## Deviations and known limits

- The literal banned-words criterion conflicts with one mandated disclosure on Landing and one existing approved disclosure on About. The scan requires both exact sentences on their respective routes, removes each once and checks all remaining page copy case-insensitively.
- The local browser runs use Windows system fonts. The PR's Linux CI validates the same responsive checks with its system fonts.

## Follow-ups

- T0014 adds `/plan`, removes its crawl exception, enables prefetch for the landing CTA and repoints the header CTA as specified.
- The concept's eyebrow, alternate lead and step wording, fourth feature, extra destination copy and photos are held under D2/D3. T0019 handles the About restyle.
