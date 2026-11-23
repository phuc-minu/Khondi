# T0014 · Budget-first trip starter (#56) · Spec

| Field | Value |
| --- | --- |
| Task | T0014-budget-starter |
| Step | 1 · Spec (delegated Gate 1, see `../T0010-website-epic53/02-claude-delegated-signoff.md`) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-23 04:00 |
| Spec version | v1 |
| Related | Issue #56; parent spec [T0010 v1](../T0010-website-epic53/01-spec.md); New Orleans example (#58) |

## Goal
Add `/plan`: a two-step, browser-only budget starter that leads to the sample New Orleans plan. Nothing the visitor types leaves the browser tab. This narrows the parent spec to this PR.

## Precondition
The New Orleans example (#58) is **merged** into `main`. If it isn't, stop and set `state:blocked`. Branch from `main` after that merge (no stacked PRs).

## Scope
**In scope**
- `frontend/src/lib/plan-input.ts`: zod schemas and parsers (Q7).
  - `parsePlanForm(raw)` returns either the typed values or a field-to-message map, with the exact rules and error texts from T0010 "Budget starter" step 1. The budget accepts commas, which are stripped before parsing; it must be whole dollars from 500 to 50,000.
  - `prefillFrom(from: string | null)` returns the sample values for `new-orleans-example` and `null` for anything else, without throwing.
  - `differsFromSample(values)` and `belowSampleBudget(values)` drive step 2's conditional notes.
- `frontend/src/components/BudgetStarter.tsx` + `.module.css`: the only client component on the page. It implements T0010 steps 1 and 2 exactly:
  - the error summary with `role="alert"`, which receives focus;
  - `aria-invalid` and `aria-describedby` on invalid fields;
  - focus moves to the new step's h2 (`tabIndex={-1}`);
  - a visually hidden live region announcing "Step 2 of 3";
  - "Change my answers" keeps the values;
  - "You picked: …" for interests;
  - the privacy line.
- `frontend/src/app/plan/page.tsx`: a server wrapper with the h1 "Start planning".
  - It reads `searchParams.from` and passes `prefillFrom(...)` to `BudgetStarter`.
  - It includes the `<noscript>` fallback from T0010.
  - Metadata title "Start planning", which renders as "Start planning — Khondi", and the description "Set a budget and see what fits. Your answers stay in your browser."
  - Reading `searchParams` makes `/plan` dynamic. That's acceptable: there's still no data fetch.
- **Start planning CTAs:**
  - in the `SiteHeader`, as a primary `LinkButton` after the nav, per T0010;
  - on `/about`, as a primary `LinkButton` placed before "See example trip".
- **Customize this trip:** on the example page, a primary `LinkButton` → `/plan?from=new-orleans-example`, placed before "About Khondi".
- Tests: Vitest `tests/plan-input.test.ts`; Playwright `e2e/plan.spec.ts`.

**Out of scope:**
- any request to the api or anywhere else;
- saving or persisting answers, including `localStorage`;
- more destinations, or a Compare control;
- adjusting sample prices to the visitor's answers.

## Acceptance criteria
1. Vitest covers every rule and error text, the comma stripping, the boundaries (499, 500, 50,000, 50,001, decimals), prefill for `new-orleans-example`, unknown and empty `from` values, and both conditional-note functions.
2. **Invalid submit.** Playwright: the exact error texts appear, the summary gets focus, its links move focus to the fields, and `aria-invalid="true"` is set.
3. **Valid submit.** Step 2 appears with focus on its h2, the live region says "Step 2 of 3", and each conditional note appears exactly when its condition holds:
   - answers that differ from the sample;
   - a budget under $3,000;
   - answers that match the sample.
4. **Change my answers** returns to step 1 with every value kept.
5. **Prefill.**
   - `/plan?from=new-orleans-example` pre-fills the form and shows "Pre-filled from the New Orleans sample."
   - `/plan?from=other` shows an empty form with no error.
6. **No requests.** During the whole flow, Playwright records no request except same-origin page assets: no `fetch` or XHR, and nothing to another origin.
7. **Keyboard only.** The flow can be completed with the keyboard alone in both projects.
8. **Quality checks.**
   - axe reports zero violations on `/plan`: in step 1, step 1 with errors, and step 2.
   - There is no overflow at 320×640.
   - The header's "Start planning" is at least 44×44 on every page.
9. "Start planning" on the header and on `/about`, and "Customize this trip" on the example page, all reach `/plan`, and the last one arrives pre-filled.
10. CI `frontend` and `e2e` jobs pass on the PR head commit.

## Size
About 400 changed lines. If it goes over, say so in the handoff, or split `plan-input.ts` and its tests into a first PR (both off `main`, merged in order).

## Approval
Signed off by Claude under the owner's website delegation (AGENTS.md, PR #61). The owner has not reviewed this spec.
