# T0014 · Budget-first trip starter · Claude review and QA · round 1

| Field | Value |
| --- | --- |
| Task | T0014-budget-starter |
| Step | 04 · Code review and QA, round 1 |
| Author | Claude (independent code reviewer and senior QA; not the PR author) |
| For | Codex (optional polish), then the merge decision under the website delegation |
| Date (UTC) | 2026-11-25 00:58 |
| PR | [#85](https://github.com/phuc-minu/Khondi/pull/85) |
| Commit reviewed | `ddbd8d4cefaf9276c544dbf8ba4df7588d9870da` (implementation `97a250d` + handoff) |
| Base | `main` @ `4aa8552` (merge-base equals current `origin/main`) |
| Responds to | `03-codex-handoff.md` |
| Verdict | `APPROVE_FOR_MERGE` (no blocking findings) |

## Summary
The PR builds T0014 v1 and the T0010 "Budget starter" steps 1–2 faithfully: exact copy and error texts, Zod parsing at the edge, focused `role="alert"` summary, `aria-invalid`/`aria-describedby`, focus to each step's h2, a persistent "Step 2 of 3" status region, kept values on "Change my answers", the privacy line, the `<noscript>` fallback, metadata and all three CTAs. I verified independently that nothing typed leaves the tab: no request of any kind during the flow (including the `?from=` and error paths), no storage or cookies, and the server-rendered controls carry no `name`, so even a pre-hydration native submit can't transmit answers. Local lint, types, 77 unit tests, build, 50/50 Playwright (desktop + mobile), axe and my own probes all pass, and CI is green on the head. The findings below are polish only.

## Findings
None is blocking. Each may be fixed in a later task or answered with a reason.

| ID | Severity | Rule | File:line | Problem | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| NB1 | non-blocking (product nuance) | spec step 2 | `frontend/src/lib/plan-input.ts:52-55` | `differsFromSample` treats a blank origin as different, so 3000 / 2 / 4 with "Leaving from" left empty shows "Your answers are different from the sample…". The field is optional, so a visitor who skipped it is told they gave a different answer. Defensible (flights depend on origin) and pinned by a unit test, but T0010 doesn't say which reading is intended. | Leave as is, or treat `""` as "not answered" in a follow-up. If anyone disagrees, route it to the PM rather than changing it silently. |
| NB2 | non-blocking (visual) | a11y/design | `frontend/src/components/BudgetStarter.module.css:52` | `.summary a { display: inline-block; min-height: 44px }` puts the list bullet beside the *last* line of a wrapped link, so at 320 px the budget error's bullet sits next to "$50,000." instead of the first line (screenshot evidence below). | Use `display: block` (or `inline-flex` on the `li`) so the marker aligns with the first line; keep the 44 px target. |
| NB3 | non-blocking (copy) | spec step 2 | `frontend/src/components/BudgetStarter.tsx:63` | "You picked: …" lists interests in click order (`Museums, Food`), not the form's order. | Optional: echo `planInterests.filter((i) => result.interests.includes(i))` for a stable order. |
| NB4 | non-blocking (pre-existing, out of scope) | T0010 AC 3 | `frontend/src/app/about/page.tsx:35` | A site-wide text scan for the forbidden phrases still hits "live price" on `/about` ("nothing here is a live price, a booking or a guarantee…"). The usage is a negation, it predates this PR (T0012, already merged) and this diff adds no forbidden phrase. Codex flagged it in the handoff. | Follow-up task: reword that sentence (for example "current fare") so the literal AC 3 scan passes site-wide. Not for this PR (Q1). |
| NB5 | non-blocking (design) | Q11 | `frontend/src/app/plan/page.tsx:3`, `BudgetStarter.module.css:1-5` | The page-level `.page` rule lives in the component's CSS module and the page imports it, whereas other routes keep their own `page.module.css`. On mobile the header CTA also lands on a third header row (brand / nav / button), which is fine against T0010 but costs ~60 px above the fold. | Optional: move `.page` into `app/plan/page.module.css`; leave the header layout to the Designer's fidelity pass. |

Accepted deviations (with reasons that hold):
- **Q2 size.** 661 added lines, of which ~270 are tests and ~100 are handoff docs; source is under 300. The spec allowed this if called out, and the handoff does.
- **Q3 `prefetch={false}` on header, nav, footer and `LinkButton`.** Site-wide, but needed: Next's viewport prefetch issues `fetch` RSC requests on `/plan`, which AC 6 forbids. It's explained in the handoff and tested by the request listener. The only cost is slightly slower client navigation on a four-page static site.

## Code review checklist
- [x] Matches T0014 v1 and T0010 steps 1–2; nothing missing, nothing extra (Q1). No API calls, no persistence, no extra destinations, no price adjustment.
- [x] Diff is focused (Q2, Q3); see the accepted deviations above. `SiteHeader` was reformatted only because it gained the CTA.
- [x] No TODOs, stubs, placeholders or commented-out code (Q4). The one JSX comment explains why controls are unnamed.
- [x] No dead or speculative code (Q5). The root-level-issue branch in `parsePlanForm` handles a non-object input and is tested.
- [x] Errors (Q6): validation failures become field messages; nothing is swallowed.
- [x] Validated at the edge with Zod (Q7): form values and the `?from=` search param (`z.literal` on the fixture slug; arrays ignored).
- [x] Typed (Q8). No `any`, casts, `!` or suppressions; `tsc --noEmit` clean.
- [x] Tests (Q9). Vitest covers every rule and text, comma stripping, 499/500/50,000/50,001, decimals, exponent/hex/`$`/huge inputs, prefill for the slug, `other`, `""`, `null`, and both note functions. Playwright covers AC 2–9 in both projects plus a no-JS test.
- [x] Evidence (Q10). The handoff pastes real output, including the first failing run and why it failed.
- [x] Follows existing patterns (Q11): `LinkButton`, CSS-module tokens, axe tags and request-listener style match earlier specs. See NB5.
- [x] Dependencies (Q12): none added; `zod` 4.6.7 was already pinned exactly in `package.json` and the lockfile.
- [x] Comments explain why (Q13).
- [x] No logging added (Q14). No secrets or personal data (Q15); the e2e origin string is a dummy.
- [x] No CI, lint, type or coverage settings changed (Q16).

## Spec line-by-line
| Requirement | Where | Result |
| --- | --- | --- |
| Budget: required, whole dollars 500–50,000, commas stripped, exact error text | `plan-input.ts:10-14` | pass (`"3,000"`, `" 3,000 "`, `"50,000"` accepted; `"499"`, `"50,001"`, `"3000.00"`, `"12.5"`, `"3e3"` rejected) |
| Travelers 1–4 default 2; Trip length 1–5 days default 4; exact texts | `plan-input.ts:15-16`, `BudgetStarter.tsx:13-14,92-99` | pass |
| Leaving from: optional, trimmed, ≤ 60, "Use 60 characters or fewer." | `plan-input.ts:17`, `maxLength={60}` | pass |
| Interests: Food, Music, History, Outdoors, Museums; echo only | `plan-input.ts:8,18`, `BudgetStarter.tsx:63` | pass (NB3) |
| `prefillFrom` → 3000/2/4/"San Francisco Bay Area" for the slug, `null` otherwise, never throws | `plan-input.ts:48-50` | pass |
| `differsFromSample` / `belowSampleBudget` | `plan-input.ts:52-59` | pass (NB1) |
| `<form noValidate>` + `<fieldset>`, required fields first, "See what fits" | `BudgetStarter.tsx:86-118` | pass |
| Error summary: `role="alert"`, h2 "Please fix the following", links to fields, receives focus | `BudgetStarter.tsx:70-79`, effect at :23 | pass |
| `aria-invalid` + `aria-describedby` on invalid fields | `BudgetStarter.tsx:43-50` | pass |
| Step h2s with `tabIndex={-1}`, focus moves on every step change (including back to step 1) | `BudgetStarter.tsx:27-29,57,83` | pass |
| Visually hidden live region "Step 2 of 3", present before it changes, re-announces on resubmit | `BudgetStarter.tsx:54` | pass |
| Step 2 card text, both conditional notes, "More destinations aren't available yet.", "Open the sample plan" link, "Change my answers" button keeps values | `BudgetStarter.tsx:56-69` | pass |
| Privacy line under the form | `BudgetStarter.tsx:119` | pass |
| Prefill note "Pre-filled from the New Orleans sample."; unknown `from` ignored without error | `BudgetStarter.tsx:84`, `plan/page.tsx:15-16` | pass |
| `<noscript>` text + link; form hidden under `scripting: none` | `plan/page.tsx:20-23`, CSS :7-9 | pass |
| Metadata: "Start planning — Khondi" and the exact description | `plan/page.tsx:6-9` | pass (curl of SSR HTML) |
| CTAs: header primary after nav; `/about` primary before "See example trip"; example page "Customize this trip" before "About Khondi" → `?from=new-orleans-example` | `SiteHeader.tsx:11`, `about/page.tsx:40`, `new-orleans-example/page.tsx:34` | pass |
| Nothing leaves the browser; no storage | whole diff | pass (see QA) |

## QA results
All run locally on Windows against commit `ddbd8d4` unless marked CI.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Install | `npm ci` | PASS | `found 0 vulnerabilities` |
| Lint | `npm run lint -- --max-warnings=0` | PASS | `✔ No ESLint warnings or errors` |
| Types | `npm run typecheck` | PASS | `tsc --noEmit` exit 0, no output |
| Unit | `npm test` | PASS | `Test Files 7 passed (7)` / `Tests 77 passed (77)` |
| Audit | `npm audit --omit=dev` | PASS | `found 0 vulnerabilities` |
| Diff hygiene | `python scripts/check_diff_hygiene.py origin/main` | PASS | `Diff hygiene: no violations.` |
| Build + Playwright, desktop and mobile | `CI=1 npx playwright test --retries=0` (webServer runs `npm run build && npm run start`) | PASS | `50 passed (36.4s)`; all 12 `plan.spec.ts` cases pass in both projects, including the no-JS case |
| Independent probes | ad-hoc Playwright script against `next start -p 3100` at 1280×800, 375×812 and 320×640 | PASS | see below |
| CI on the PR | [run 45521216441](https://github.com/phuc-minu/Khondi/actions/runs/45521216441) on `ddbd8d4` | PASS (stack pending at writing) | `frontend`, `e2e`, `backend`, `images`, `detect`, `diff-hygiene`, `repo-tooling`, `secret-scan` all success; `stack` in progress |

Independent probe results (identical in all three viewports unless noted):
- **Network.** Starting after `networkidle` on `/plan?from=new-orleans-example`, through an invalid submit, a summary-link click, a valid submit, "Change my answers" and a resubmit: `requests during flow: []`.
- **Storage.** `localStorage.length 0`, `sessionStorage.length 0`, `document.cookie ""`, `indexedDB.databases() 0`, context cookies 0.
- **URL.** Answers never appear in the URL. After a summary-link click the hash is `#plan-budgetUsd` (a field id only).
- **SSR HTML** (`curl /plan?from=new-orleans-example`): no `name=` attribute on any control; title, description and `<noscript>` exact.
- **Focus.** Invalid submit → focus on `role=alert` summary; summary link → `#plan-budgetUsd` focused; valid submit → `H2 "Step 2 of 3 — Destinations that fit"`; "Change my answers" → step 1 h2, values `["3,000","2","4",""]` kept, errors cleared.
- **Live region.** `"Step 2 of 3"` → `""` on return → `"Step 2 of 3"` again on resubmit, so it re-announces.
- **axe.** Zero violations with WCAG A/AA tags in the error state, and zero with *all* rules (best-practice included) on step 1 and step 2.
- **Layout.** Horizontal overflow 0 on `/`, `/about`, the example page and `/plan` (both steps) at 1280, 375 and 320 px, and on `/plan` with root font size doubled at 640 px (200% text). Header "Start planning" measures 159×46 everywhere.
- **Keyboard.** Covered by `plan.spec.ts:107` in both projects (skip link → every field in order → Space on a checkbox → Enter submits → step 2 → Change my answers → resubmit → open the sample plan), and I repeated the error-summary path in the probe.
- **Forbidden phrases.** No hits on `/`, the example page or `/plan`; `/about` hits "live price" (pre-existing, NB4). The diff's added lines contain none of the four phrases.
- **Screenshots** (review evidence for the Designer, not committed): step 1 prefilled, step 1 with errors, step 2 and the header at each width. They show NB2 at 320 px.

## Acceptance criteria coverage
| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1 | Vitest rules, texts, commas, boundaries, prefill, both notes | `tests/plan-input.test.ts`, 77/77 | pass |
| 2 | Invalid submit: texts, summary focus, links focus fields, `aria-invalid` | `plan.spec.ts:15`, probe | pass |
| 3 | Valid submit: h2 focus, "Step 2 of 3", notes exactly when conditions hold | `plan.spec.ts:52,86`, probe | pass |
| 4 | Change my answers keeps every value | `plan.spec.ts:52`, probe | pass |
| 5 | Prefill and unknown `from` | `plan.spec.ts:86`, Vitest | pass |
| 6 | No requests beyond same-origin page assets | `plan.spec.ts:107` (rejects any fetch/XHR, non-GET or cross-origin), probe | pass |
| 7 | Keyboard only, both projects | `plan.spec.ts:107` desktop + mobile | pass |
| 8 | axe zero in 3 states; no overflow at 320×640; header CTA ≥ 44×44 on every page | `plan.spec.ts:15,52,156`, probe | pass |
| 9 | Header and `/about` "Start planning" and "Customize this trip" reach `/plan`, the last pre-filled | `plan.spec.ts:156` | pass |
| 10 | CI `frontend` and `e2e` pass on the head | run 45521216441 | pass |

## Next step
`APPROVE_FOR_MERGE`. Codex authored this PR, so no Codex cross-check is needed. I have not marked the PR ready or merged it: that decision stays with the orchestrator/owner. Before any merge, confirm that every required check (including `stack`) is green on the final head, which will be the commit that adds this file. NB1–NB5 can go to a follow-up; NB4 belongs with the landing/copy work, not this PR.
