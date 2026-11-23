# T0013 · Illustrative $3,000 New Orleans trip (#58) · Spec

| Field | Value |
| --- | --- |
| Task | T0013-new-orleans-example |
| Step | 1 · Spec (delegated Gate 1, see `../T0010-website-epic53/02-claude-delegated-signoff.md`) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-23 04:00 |
| Spec version | v1 |
| Related | Issue #58; parent spec [T0010 v1](../T0010-website-epic53/01-spec.md); site shell (#55, #60); About page (#59) |

## Goal
Add `/trips/new-orleans-example`: a sample 4-day trip for two that shows how $3,000 breaks down, with every cost's assumptions and a plain day-by-day plan. Every amount is labeled as an illustrative estimate. This narrows the parent spec to this PR.

## Precondition
The About page (#59) is **merged** into `main`, because this PR adds About's "See example trip" CTA. If it isn't, stop and set `state:blocked`. Branch from `main` after that merge (no stacked PRs).

## Scope
**In scope**
- `frontend/src/fixtures/new-orleans-example.ts`: the `IllustrativeTrip` type contract and the values from T0010 "New Orleans fixture contract", exactly as written: costs, not-included items, days and assumptions.
- `frontend/src/lib/money.ts`:
  - `formatUsd(amount: number): string` for whole dollars, using `Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })`;
  - `sumUsd(amounts: readonly number[]): number`.
- Components, each a server component with a `.module.css`, behaving as T0010 "Shared components" describes:
  - `IllustrativeNote`: `role="note"`, with a `variant: "full" | "short"` prop. Both texts are in T0010.
  - `TripAssumptions`: a `<dl>`, plus the "Not included" list.
  - `CostBreakdown`: a `<table>` with the caption, the three columns, and footer rows for Total, Budget and Remaining. Amounts are right-aligned with tabular figures.
  - `DayPlan`: one `<section>` per day with an h3 "Day N — Title".
  - `LinkButton`: moved here from #59 (see the #59 spec). An `<a>` through Next `Link`, with a `variant: "primary" | "secondary"` prop, at least 44px high.
- `frontend/src/app/trips/new-orleans-example/page.tsx`: the copy from T0010 "Content → Example", including the no-buffer sentence and the "These are suggestions, not reservations…" line. Its metadata title renders as "Sample trip: New Orleans for $3,000 — Khondi", with the description "A sample 4-day New Orleans trip for two, showing how a $3,000 budget breaks down."
  - CTA in this PR: **About Khondi** (secondary) → `/about`. "Customize this trip" comes with #56.
- `navigation.ts`: insert `{ href: "/trips/new-orleans-example", label: "Example trip" }` after Home, which gives the final order Home, Example trip, About.
- `/about`: add a **See example trip** `LinkButton` (secondary) at the end of the page.
- Tests: Vitest `tests/new-orleans-example.test.ts` and `tests/money.test.ts`; Playwright `e2e/example-trip.spec.ts`.

**Out of scope:** `/plan` and every "Start planning" or "Customize this trip" CTA (#56), the landing page (#57), images, maps, and per-item prices or times.

## Acceptance criteria
1. The page returns 200, with the title above and exactly one h1, "New Orleans for $3,000".
2. The page shows:
   - the full IllustrativeNote above the first h2;
   - every assumption and every not-included item;
   - all five cost lines with their "covers" text and amounts;
   - Total $3,000, Budget $3,000 and Remaining $0;
   - the no-buffer sentence;
   - four day sections with their items.
3. Vitest checks every fixture invariant listed in T0010, plus `formatUsd(3000) === "$3,000"`, `formatUsd(0) === "$0"`, and `sumUsd` over the fixture equalling 3000. Each test fails if its value is changed.
4. No text on the page contains "verified", "live price", "book now" or "guaranteed" (case-insensitive).
5. The cost table has a `<caption>` and `<th scope="col">` headers, and the total rows use `<th scope="row">`.
6. In both the header and the footer, "Example trip" is second. It has `aria-current="page"` on this page.
7. `/about` has a "See example trip" link that reaches this page.
8. axe reports zero violations on this page and on `/about` in both projects. There is no overflow at 320×640, and no request goes to another origin.
9. CI `frontend` and `e2e` jobs pass on the PR head commit.

## Test plan
| AC | Test |
| --- | --- |
| 3 | Vitest `tests/new-orleans-example.test.ts`, `tests/money.test.ts` |
| 1, 2, 4–8 | Playwright `e2e/example-trip.spec.ts` (both projects); extend `e2e/about.spec.ts` for AC 7 |
| 9 | CI run link |

## Size
About 350–400 changed lines. If it goes over 400, say so in the handoff (Q2); don't cut tests to fit.

## Approval
Signed off by Claude under the owner's website delegation (AGENTS.md, PR #61). The owner has not reviewed this spec.
