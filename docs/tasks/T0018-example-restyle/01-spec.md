# T0018 · New Orleans example page restyle · Spec

| Field | Value |
| --- | --- |
| Task | T0018-example-restyle |
| Step | 1 · Spec (delegated Gate 1, see `../T0010-website-epic53/02-claude-delegated-signoff.md`; direction per `../T0016-visual-design/03-claude-design-review.md`) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-24 |
| Spec version | v1 |
| Related | #55, #58; T0013 (page and fixture), T0017 (tokens and shell, merged); concept `../T0016-visual-design/reference-new-orleans-concept.png` |

## Goal
Make `/trips/new-orleans-example` look like the approved concept using the T0017 tokens: a compact hero, a budget bar as the centrepiece, day cards and calmer sections. Content, numbers and routes do not change.

## Precondition
T0017 is merged into `main`. Branch from `main`; no stacked PRs.

## Scope
**In scope** (`frontend/src/app/trips/new-orleans-example/`, `frontend/src/components/`, tests)
- **Hero:** h1 "New Orleans for $3,000", the existing lead, trip chips (`2 adults`, `4 days, 3 nights`, `Flying from the San Francisco Bay Area`), then the full `IllustrativeNote`. Background is a soft CSS gradient from the tokens; **no photo** (Owner decision D3). Keep the "See the full example" style CTA out; the page's only buttons stay as today.
- **`BudgetBar` (new):** a `$3,000` total line, a proportional segmented bar and a legend (swatch, label, amount, percentage). Segment colors from the handoff (`#0F5F5C`, `#347B76`, `#6C9A8F`, `#B58A52`, `#7A6E63`), with a 2px canvas-colored gap between segments. Widths and percentages are computed from `newOrleansExample.costs` (one decimal place for non-integers: 11.7%, 8.3%). The bar is `aria-hidden="true"`; the legend is a list and the table below stays the authoritative version.
- **`CostBreakdown`:** keep the table, caption, row headers, Total, Budget and Remaining rows, and the no-buffer sentence. Restyle only. Place the `BudgetBar` above it, inside one surface card.
- **`TripAssumptions`:** quiet two-column card; keep "Not included" as a list in the same card.
- **`DayPlan`:** each day becomes a card with a numbered marker, title and the existing bullets. Two columns from 768px, one below. No invented times, prices or images.
- Sections use the T0017 `.container` and token spacing; headings stay h2 and h3 as today.

**Out of scope:** photos, "Why this works" and "Key neighborhoods" (held for the Product Manager, Owner decision D2), a map, "Customize this trip", per-person or family wording, changes to the fixture values, other pages.

## Acceptance criteria
1. The page keeps its title, one h1, every existing text and every number. The fixture is unchanged, and Vitest still proves the costs sum to $3,000.
2. Bar segment widths sum to 100%, each width equals `amount / budget`, and each legend amount and percentage matches the table row (Playwright reads both from the DOM).
3. The table is still present with caption and `scope` headers, and the page has no axe violations including color contrast.
4. At 320, 375, 768 and 1280px: no horizontal overflow, the left edge matches the header's, and the existing word-boundary wrapping test in `example-trip.spec.ts` still passes.
5. Day cards: four cards, in day order, one column below 768px and two columns at 768px and above.
6. The bar and legend have a visible separation between segments, and the legend carries all meaning (color is not the only cue).
7. `prefers-reduced-motion: reduce` shows the bar immediately with no animation. Do not add count-up or reveal animation.
8. No remote request is made. Banned-word and footer-sentence checks stay green.
9. Typecheck, lint, unit tests, build and Playwright pass, with real output in the handoff (Q10).

## Test plan
Vitest for the bar math (a pure function taking the cost lines, returning widths and labels). Playwright in `e2e/example-trip.spec.ts`: bar/table agreement, overflow and alignment at four widths, day-card columns, axe.

## Notes for Codex
Reuse existing components and patterns (Q11); size will exceed 400 lines, so say so (Q2). Anything needing new copy goes under Follow-ups.
