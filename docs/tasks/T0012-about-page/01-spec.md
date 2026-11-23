# T0012 · About page (#59) · Spec

| Field | Value |
| --- | --- |
| Task | T0012-about-page |
| Step | 1 · Spec (delegated Gate 1, see `../T0010-website-epic53/02-claude-delegated-signoff.md`) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-23 04:00 |
| Spec version | v1 |
| Related | Issue #59; parent spec [T0010 v1](../T0010-website-epic53/01-spec.md); site shell T0011 (#55, #60) |

## Goal
Add `/about`: Khondi's mission, who it's for, what's different, and an honest statement of what is real today. This restates the parent spec's About content and narrows it to this PR. It changes nothing material.

## Precondition
The site shell (T0011, #55/#60) is **merged** into `main`: `globals.css` tokens, the layout with `SiteHeader`/`SiteFooter`, `src/content/navigation.ts`, and the Playwright + axe harness. If it isn't merged, stop and set `state:blocked`. Branch from `main` after that merge, not from the shell branch (no stacked PRs).

## Scope
**In scope**
- `frontend/src/app/about/page.tsx`: the copy from T0010 "Content → About `/about`", word for word. Copy edits that keep the meaning are non-material.
  - `metadata`: title "About", which the layout template renders as "About — Khondi", and the description "Why Khondi plans around your budget, who it's for, and what's real today."
  - One h1, then h2 sections in this order: Who it's for; What makes it different; How it works; Where Khondi is today.
- `frontend/src/components/StepList.tsx` + `.module.css`: an ordered list of the three steps. Titles and text come from T0010 "How it works"; the Landing page reuses it later.
- `frontend/src/content/navigation.ts`: append `{ href: "/about", label: "About" }`.
- Playwright `frontend/e2e/about.spec.ts`.

**Change from the parent spec (non-material).** T0010 put `LinkButton` in this PR. But About's two CTAs, "Start planning" (#56) and "See example trip" (#58), are added only by the PRs that create their target pages, so nothing here would use `LinkButton` (Q5). It moves to #58, where the example page first uses it.

**Out of scope:** other pages, CTAs to pages that don't exist yet, images, and anything listed as out of scope in T0010.

## Acceptance criteria
1. `/about` returns 200 from `next build && next start`, with the title "About — Khondi" and exactly one h1, "About Khondi".
2. The h2s appear in the order listed, and the "Where Khondi is today" paragraph matches T0010 exactly. That paragraph is the trust statement, so its meaning must not change.
3. The header and footer both show "About". On `/about`, the About link has `aria-current="page"` and Home doesn't.
4. axe (same tags as the shell) reports zero violations on `/about` in both projects.
5. At 320×640, there is no horizontal overflow on `/about`.
6. Loading `/about` makes no request to another origin.
7. CI `frontend` and `e2e` jobs pass on the PR head commit.

## Test plan
`e2e/about.spec.ts` covers AC 1–6 in both projects. There are no Vitest tests, because this PR adds no pure logic.

## Size
About 150 changed lines.

## Approval
Signed off by Claude under the owner's website delegation (AGENTS.md, PR #61). The owner has not reviewed this spec.
