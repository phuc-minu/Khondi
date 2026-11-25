# T0014 · Budget starter · Design addendum

| Field | Value |
| --- | --- |
| Task | T0014-budget-starter |
| Step | 1b · Spec addendum (delegated Gate 1) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-25 |
| Related | [01-spec.md](01-spec.md), [T0016 handoff](../T0016-visual-design/02-designer-handoff.md) §4–5 "Budget starter", T0015 (merged, `56d6988`) |

This addendum amends `01-spec.md`. Where they conflict, this file wins.

## Context changes
- T0017 (shell), T0018 (example restyle) and T0015 (landing) are merged. The landing "Start planning" button already points at `/plan`, which currently 404s. This task makes it real.
- Copy, validation rules, error texts and step flow stay exactly as in T0010 "Budget starter"; the visual layer follows T0016 and the T0017 tokens.

## Additional scope
1. **Layout** (T0016 §5 `/plan`): from 768px, a two-column composition, left a progress/explanation column (h1 "Start planning", a short three-label progress list "Set a budget · See what fits · Read the plan" with the current step marked by text and `aria-current="step"`, not color alone), right a surface card holding the form. Below 768px one column; inputs and buttons at least 48px high; 16px gutters. The progress labels wrap safely at 320px.
2. **Step 2:** the conditional notes and the New Orleans sample card appear before the CTA to the example, as in T0016 §5. No invented prices; no adjustment of sample numbers to answers.
3. **Header CTA:** change `SiteHeader`'s button to primary "Start planning" → `/plan` (T0010 original). It stays at least 44x44. The landing hero keeps both buttons; the landing and About "See example trip" buttons are unchanged.
4. **Navigation test:** in `e2e/navigation.spec.ts` delete the `pendingStarter` skip and its comment, add `/plan` (h1 "Start planning") to the checked pages, and make the landing "Start planning" assertion also reach `/plan`. Banned-words, unique-title, footer and crawl checks must pass for `/plan` too.
5. **`/about` CTA and example "Customize this trip"** as in `01-spec.md`. "Customize this trip" links to `/plan?from=new-orleans-example` and the form arrives pre-filled.
6. Existing nav order is unchanged: `/plan` is reached by buttons, not a nav item.

## Fixed for Codex
- No photos, no persistence (no `localStorage`/`sessionStorage`/cookies), no network requests from the page, no new dependencies beyond what the repo already has (zod is present).
- Respect `prefers-reduced-motion`; no animation is needed.
- CI fonts differ from Windows: leave slack so there is no overflow at 320px, and axe passes in all three states (step 1, step 1 with errors, step 2).

## Size
About 500 lines, over the Q2 guide. Say so in the handoff. If it grows past about 650, split `plan-input.ts` and its tests into a first PR off `main`.

## Approval
Signed off by Claude under the owner's website delegation (AGENTS.md). Owner order decision (2026-11-25): landing first, then the starter.
