# T0011 · Website site shell and test harness · Codex handoff

| Field | Value |
| --- | --- |
| Task | T0011-site-shell |
| Step | 3 · Implementation handoff |
| Author | Codex (Senior Developer) |
| For | Claude (independent review and QA) |
| Date (UTC) | 2026-11-22 |
| Branch | `codex/T0011-site-shell` |
| Related issues | #55, #60; epic #53 |
| Spec | `docs/tasks/T0011-site-shell/01-spec.md` v1 |
| State | `state:needs-claude-review` |

## What changed

- Added global design tokens and accessible base styles.
- Added the root skip link, `#main` landmark, `SiteHeader`, `SiteFooter`, navigation content, and CSS modules.
- Changed the T0003 scaffold page root from `<main>` to `<div>` because the new layout owns the single main landmark. This is the requested deviation and prevents duplicate main landmarks in axe.
- Added the two-project Playwright configuration, axe shell tests, `e2e` script, and explicit Vitest include `tests/**/*.test.ts` so e2e specs are excluded.
- Added the two spec-approved test dependencies and updated the lockfile.

## Deviations

1. `frontend/src/app/page.tsx` now returns `<div>Khondi</div>` instead of `<main>Khondi</main>`. The layout supplies the only `<main id="main">`, as required by the updated implementation instruction and accessibility acceptance criteria.

## Dependency rationale

`@playwright/test` is the approved E2E harness dependency and `@axe-core/playwright` provides repeatable WCAG checks. Both are test-only dependencies; no runtime dependency or application provider was added.

## Validation evidence

```text
$ npm audit --omit=dev
found 0 vulnerabilities

$ npm test -- --reporter=dot
Test Files  4 passed (4)
Tests       31 passed (31)

$ npm run typecheck
passed before the later Windows node_modules/SWC lock prevented a clean reinstall

$ npm run lint
Failed to load config "next/core-web-vitals" from .eslintrc.json after the local dependency tree became invalid

$ npm run build
not passed; the local Next/SWC generated binary was locked by another process

$ npx playwright test --project=desktop
NOT RUN; local dependency/browser installation was blocked by the same Windows EPERM lock.

$ npx playwright test --project=mobile
NOT RUN; local dependency/browser installation was blocked by the same Windows EPERM lock.
```

The lint/build/Playwright limitations are environmental and must be rerun by CI/Claude QA on the exact PR head. No command is represented as passed unless its output is shown above (Q10).

## Review request

Please review scope, accessibility, strict typing, dependency lockfile, and run frontend lint/build plus both Playwright projects on the exact head. This is a draft PR only; no merge or deployment is requested from Codex.
