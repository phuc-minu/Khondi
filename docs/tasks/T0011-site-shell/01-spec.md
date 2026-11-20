# T0011 · Website site shell and test harness · Spec

| Field | Value |
| --- | --- |
| Task | T0011-site-shell |
| Step | 1 · Spec (delegated Gate 1, see `../T0010-website-epic53/02-claude-delegated-signoff.md`) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-20 15:40 |
| Spec version | v1 |
| Related | Parent spec [T0010 v1](../T0010-website-epic53/01-spec.md); issues #53, #55, #60; foundation T0003 / PR #52; delegation PR #61 |

## Goal
Give every website page the same accessible frame:
- design tokens;
- a skip link;
- a header with main navigation;
- a footer.

It also adds the Playwright + axe test harness that later website tasks reuse. No new page content.

## Context
- **Foundation.** T0003 (PR #52) creates `frontend/` with a root layout and a one-line scaffold `page.tsx`. This task builds on whatever T0003 merges and changes only what is listed below.
- **Parent spec.** See T0010, sections "Design tokens", "Shared components (behavior)" and "Test plan".
- **CI.** CI's `e2e` job starts running once `frontend/playwright.config.ts` exists. It calls `npm run e2e`.

## Precondition (Codex checks before writing code)
1. PR #52 is **merged** into `main`, and `frontend/package.json` exists on `main`. If not, stop, set `state:blocked`, and record that in `02-approval.md`.
2. Run `npm audit --omit=dev` in `frontend/` on `main`.
   - If it reports any critical or high advisory for `next`, `react` or `react-dom`, this task upgrades `next`, `eslint-config-next`, `react` and `react-dom` to the lowest patched versions within their current major lines.
   - Paste the before and after audit output in the handoff.
   - List the upgrade under Q12.

## Scope
**In scope**
- `frontend/src/app/globals.css`: every token in T0010 "Design tokens", plus base styles:
  - box-sizing and body font, color and line height;
  - heading fonts;
  - link color and underline;
  - the focus outline rule;
  - the `prefers-reduced-motion` rule;
  - a `.visually-hidden` utility.
- `frontend/src/app/layout.tsx`:
  - `<html lang="en">`;
  - the skip link "Skip to main content" → `#main`;
  - `<SiteHeader/>`, then `<main id="main" tabIndex={-1}>{children}</main>`, then `<SiteFooter/>`;
  - default `metadata` (title template `%s — Khondi`, default title "Khondi", description "Plan the right trip for your budget.").
  - Keep whatever T0003 put in the layout that is still needed. If T0003 has no layout, create it.
- `frontend/src/content/navigation.ts`: `export const mainNavigation: readonly NavItem[]` with `NavItem = { href: string; label: string }`. It contains only `{ href: "/", label: "Home" }` in this task. Later tasks append items.
- `frontend/src/components/SiteHeader.tsx` + `.module.css`:
  - brand text link "Khondi" → `/`;
  - `<nav aria-label="Main">` rendering `mainNavigation`;
  - `aria-current="page"` on the item matching the current path. Use `usePathname` in a small client child (`NavLinks.tsx`) so the header itself stays a server component.
  - Layout per T0010: wraps on <640px, no hamburger, targets ≥44px.
- `frontend/src/components/SiteFooter.tsx` + `.module.css`:
  - footer nav list from `mainNavigation`;
  - the data-behavior sentence, **exactly**: "This site doesn't use cookies or analytics, and the trip planner keeps your answers in your browser.";
  - "© 2026 Khondi".
- Playwright harness:
  - `frontend/playwright.config.ts`:
    - `testDir: "e2e"`;
    - `webServer: { command: "npm run build && npm run start", port: 3000, reuseExistingServer: !process.env.CI }`;
    - `use.baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000"`;
    - projects `desktop` (Desktop Chrome, 1280×800) and `mobile` (Chromium, 375×812, `isMobile: true`, `hasTouch: true`);
    - `retries: process.env.CI ? 1 : 0`;
    - `trace: "retain-on-failure"`, `screenshot: "only-on-failure"`;
    - reporter `[["list"], ["html", { open: "never" }]]`.
  - `package.json` script `"e2e": "playwright test"`.
  - Dev dependencies `@playwright/test` and `@axe-core/playwright`, pinned exactly, with the lockfile updated.
  - `frontend/e2e/shell.spec.ts`: see Test plan.
  - `.gitignore`: add `frontend/playwright-report/` and `frontend/test-results/` if they aren't already covered.
  - Make sure Vitest doesn't pick up `e2e/` and Playwright doesn't pick up `tests/`. Set `include`/`testDir` explicitly.

**Out of scope**
- Any page content beyond what T0003's scaffold `page.tsx` already renders. Leave it unchanged; T0015 replaces it.
- Nav items other than Home, and any CTA. `LinkButton` arrives in T0012 together with its first use, so it isn't unused code here (Q5).
- Images and fonts from external origins.
- Backend, Docker, Compose, CI workflow files, lint/tsconfig/vitest strictness settings (Q16).

## Design notes
- Server components by default. The only client component is `NavLinks` (needs `usePathname`).
- Styling uses CSS Modules and global custom properties only, with no new styling dependency.
- In `aria-current` matching, `/` matches only `/`. Other items match their exact path. That matters later for `/trips/new-orleans-example`.

## Acceptance criteria
1. `npm run build` succeeds, and `/` renders with the header, the `<main id="main">` landmark and the footer.
2. The first Tab press from page load focuses "Skip to main content", and it is visible when focused. Activating it moves focus into `main`.
3. The header nav has `aria-label="Main"`. The Home link has `aria-current="page"` on `/`.
4. The footer contains the exact data-behavior sentence and "© 2026 Khondi".
5. axe (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) reports **zero violations** on `/` in both projects.
6. At a 320×640 viewport, `document.documentElement.scrollWidth <= window.innerWidth` on `/`.
7. Every interactive element in the header and footer has a bounding box of at least 44×44 CSS px.
8. While loading `/`, the page makes no requests to origins other than `baseURL`.
9. After the upgrade, if one was needed, `npm audit --omit=dev` reports no critical or high advisories.
10. CI `frontend` and `e2e` jobs pass on the PR head commit, and existing T0003 Vitest tests still pass.

## Test plan
| AC | Type | What the test proves |
| --- | --- | --- |
| 1, 3, 4 | Playwright `e2e/shell.spec.ts` (both projects) | Landmarks, nav labelling, `aria-current`, footer text |
| 2 | Playwright keyboard test | Skip link is first, visible on focus, moves focus to `main` |
| 5 | Playwright + `@axe-core/playwright` (both projects) | No WCAG A/AA violations |
| 6 | Playwright with viewport 320×640 | No horizontal overflow |
| 7 | Playwright `boundingBox()` over header/footer links | Target size |
| 8 | Playwright `page.on("request")` collecting origins | No third-party requests |
| 9 | `npm audit --omit=dev` output in handoff | Dependency health |
| 10 | CI run link on the head commit | Pipeline green |

There are no Vitest tests for this task: it adds no pure logic. Q9 is covered by the Playwright tests, because each one fails without the change.

## Dependencies
- `@playwright/test`: Apache-2.0. Needed by the CI `e2e` job; it is the project's chosen E2E tool (ADR-001).
- `@axe-core/playwright`: MPL-2.0, unmodified test-only use. It automates WCAG checks that the QA skill requires. The alternative, manual audit only, isn't repeatable in CI.
- Possibly an upgrade of `next`, `eslint-config-next`, `react` and `react-dom` (see Precondition 2).

## Risks
- **Playwright on Windows.** The owner's machine needs `npx playwright install chromium` once. Document it in the handoff, not in new docs (Q1).
- **Overlap with T0008.** T0008 will extend this harness for Compose through `BASE_URL`. Don't add Compose logic here.

## Size
- About 250–350 changed lines, excluding `package-lock.json`.
- If a Next/React upgrade forces code changes in T0003 files, stop and report instead of growing the diff.

## Approval
- Signed off by Claude under the owner's website delegation (AGENTS.md, PR #61). The record is `../T0010-website-epic53/02-claude-delegated-signoff.md`.
- The owner has not reviewed this spec.
