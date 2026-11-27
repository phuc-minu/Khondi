# T0014 · Budget starter design addendum · Codex handoff

| Field | Value |
| --- | --- |
| Task | T0014-budget-starter |
| Step | 6 · Design implementation handoff |
| Author | Codex |
| For | Claude, independent code review and QA |
| Date (UTC) | 2026-11-25 18:07 |
| Branch | `codex/T0014-budget-starter` |
| Implementation commit tested | `f306ee51c98c2e888f0e2eda39e40fc98ac04b76` |
| Draft PR | [#85](https://github.com/phuc-minu/Khondi/pull/85) |
| State | `state:needs-claude-review` |

Refs [#56](https://github.com/phuc-minu/Khondi/issues/56). See the [design addendum](02-design-addendum.md) and [delegated approval](05-design-addendum-approval.md).

## Implementation

- `/plan` uses the shared container and design tokens. At 768px the heading and progress sit beside a form card. The progress wraps on mobile and marks the current step both in text and with `aria-current="step"`.
- The existing Zod parser, validation copy, focus behavior, sample prefill, privacy line and no-JavaScript fallback carry forward from v1. Answers stay in React state.
- The header and About page lead to the planner. The example's Customize this trip button leads to its prefilled variant. The landing and public link tests now follow `/plan`.
- Shell links and the example's About button disable automatic route prefetch. The sample-plan link performs a document navigation after the visitor activates it.

## Local verification

The production and development servers used separate ports. The local Playwright run targeted the production build on port 3100 via `BASE_URL` because port 3000 was already occupied. The run used the repository's desktop and mobile projects. Output excerpts follow.

```text
$ npm run typecheck
> tsc --noEmit

$ npm run lint -- --max-warnings=0
> next lint --max-warnings=0
✔ No ESLint warnings or errors

$ npm test
> vitest run
 Test Files  8 passed (8)
      Tests  81 passed (81)

$ npm run build
   ▲ Next.js 15.5.29
 ✓ Compiled successfully in 2.5s
 ✓ Generating static pages (9/9)
├ ƒ /plan                                27.8 kB         131 kB
ƒ  (Dynamic)  server-rendered on demand

$ npm run e2e -- --workers=6
Running 84 tests using 6 workers
  84 passed (31.9s)

$ python scripts/check_diff_hygiene.py origin/main
Diff hygiene: no violations.
```

The two initial keyboard-flow tests failed on background fetches from the sample page after navigation. Both passed after disabling the relevant prefetches. The final suite covers the request allowlist, full keyboard flow, zero axe violations and no overflow at 320px in all three planner states, and the 768px layout breakpoint. Next and Vitest emitted existing warnings about the lint command, standalone startup, and Vite config loading.

## Review notes

- Q2. The frontend diff is 690 insertions and 24 deletions against main, including the earlier implementation and its tests. This exceeds the usual guide and the addendum's estimate. The existing draft carries the parser, design, and tests together so Claude can verify the complete flow and retain the original review history.
- Records `02-approval.md`, `03-codex-handoff.md` and `04-claude-review-r1.md` remain in the task history. The design changes need an independent review of the new PR head.
- GitHub `frontend` and `e2e` checks on the new head are pending at handoff. Local checks used Windows system fonts.
