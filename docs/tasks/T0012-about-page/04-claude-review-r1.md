# T0012 · About page · Claude review and QA · round 1

| Field | Value |
| --- | --- |
| Task | T0012-about-page |
| Step | 04 · Code review and QA, round 1 |
| Author | Claude (independent code reviewer; not the PR author) |
| For | Codex / PR author (optional polish), then merge decision under the website delegation |
| Date (UTC) | 2026-11-23 15:09 |
| PR | #79 |
| Commit reviewed | `d2f1dd60cb9c01445b3fe12634b68cdc25811fec` |
| Base | `main` @ `a455d36` (T0011 merge, PR #78); merge-base equals current `origin/main` |
| Responds to | `03-codex-handoff.md` |
| Verdict | `APPROVE_FOR_OWNER_REVIEW` (review verdict PASS; no blocking or major findings) |

## Summary
The PR builds `01-spec.md` v1 exactly, and nothing more. The About copy matches T0010 "Content → About `/about`" word for word, including the trust paragraph that AC 2 protects. `StepList` matches T0010 "How it works". The nav change is the single append the spec asks for, and it fits the T0011 shell with no shell edits. CI `frontend` and `e2e` pass on the head commit. The four findings below are minor or nit. None blocks merge.

## Findings
None of these is blocking. Each may be fixed or answered with a reason.

| ID | Severity | Rule | File:line | Problem | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| R1 | minor | Q9, AC 2 | `frontend/e2e/about.spec.ts:17` | `getByText("<trust paragraph>")` does a case-insensitive substring match. If text were added before or after the paragraph, or its case changed, the test would still pass. AC 2 says this paragraph must match T0010 exactly. | Pass `{ exact: true }`, or target the `<p>` that follows the "Where Khondi is today" h2 and assert it with `toHaveText("…")`. |
| R2 | minor | Q10 | `docs/tasks/T0012-about-page/03-codex-handoff.md:26-32` | The "Validation evidence" block summarizes results (`-> passed`, `-> 16 passed`) instead of pasting real command output. CI on the head commit independently confirms `frontend` and `e2e`, so this doesn't block merge. | In future handoffs, paste the tail of the real output, such as the Playwright summary line and the lint/typecheck output. |
| R3 | nit | Q3 hygiene | `docs/tasks/INDEX.md:17` | The PR column says "draft PR" with no number. | Change it to "draft PR #79". |
| R4 | nit | a11y | `frontend/src/components/StepList.tsx:14-15` | The step title (`<strong>`, block via CSS) and its description (`<span>`) have no punctuation between them, so a screen reader in browse mode can read "Set your budget Tell us your total budget…" as one run-on sentence. axe doesn't flag this, and it isn't a WCAG failure. | Optional: render the description as a `<p>`, or add visually hidden punctuation. Landing reuses this component, so it's cheap to fix now. |

## Code review checklist
- [x] Matches the approved spec version (`01-spec.md` v1), with nothing extra and nothing missing (Q1). `LinkButton` and the two CTAs are deferred, as the spec's non-material change requires. No images and no other pages.
- [x] Diff is small and focused (Q2, Q3). 9 files, +160/−2, which fits the spec's estimate of about 150 lines. There are no shell edits beyond the one nav append.
- [x] No TODOs, stubs, placeholders or commented-out code (Q4). The sample trip is described as sample/illustrative, not as real data.
- [x] No dead or speculative code (Q5). `StepList` is used here and is specified for reuse by Landing (T0015).
- [x] Errors (Q6): not applicable, because this is static content.
- [x] Input validation (Q7): not applicable, because there is no input.
- [x] Typed (Q8). There are explicit `React.ReactElement` return types, matching `layout.tsx` and the shell components, and `as const` on the step data. No `any`, casts or suppressions.
- [x] Tests (Q9). `about.spec.ts` covers AC 1–6 in both the `desktop` and `mobile` projects. Without the page or the nav change, it fails. See R1 for one assertion that should be tightened.
- [ ] Evidence (Q10). The handoff summarizes rather than pastes output (R2). CI makes up for it.
- [x] Follows existing patterns (Q11). It uses one-line CSS modules with shell tokens (`--space-*`, `--color-text-muted`), the same relative imports, and the same axe tags and cross-origin and 320px checks as `shell.spec.ts`. The step data sits in the component and not in `src/content/`. That's acceptable at this size, though moving it alongside `navigation.ts` would also be reasonable when Landing reuses it.
- [x] Dependencies (Q12). None were added. `package.json` and `package-lock.json` are unchanged, so the exact-version pinning convention isn't affected.
- [x] Comments (Q13). There are none, and none are needed.
- [x] Logging (Q14). There is no `console.*`.
- [x] Secrets/PII (Q15). There are none in the diff or the PR text.
- [x] Gates (Q16). No CI, lint, type or coverage config was touched.
- [x] Architecture. It fits the T0011 shell: the nav comes from `src/content/navigation.ts`, so both `NavLinks` (client, `usePathname` → `aria-current`) and `SiteFooter` pick up About with no component changes. `/about` is a server component and is statically prerendered, with no client JS added. The layout title template `%s — Khondi` produces "About — Khondi". No routes link to pages that don't exist yet. The footer line "doesn't use cookies or analytics" stays true.

## Content and spec fidelity
| Item | Spec (T0010 / T0012 v1) | Implementation | Result |
| --- | --- | --- | --- |
| Title / description | "About" → "About — Khondi"; given description | Identical | match |
| h1 + lead | "About Khondi" + lead | Identical | match |
| h2 order | Who it's for; What makes it different; How it works; Where Khondi is today | Identical | match |
| "What makes it different" bullets | 3 bullets as written | Identical | match |
| StepList titles/text | T0010 "How it works" ×3 | Identical, `<ol>` | match |
| Trust paragraph | Verbatim, meaning must not change | Identical | match |
| CTAs | Deferred to #56 / #58 | Absent | match (spec deviation from T0010 already approved in v1) |
| Issue #59 "no invented history, staff, social proof, guarantees" | — | None present; the page explicitly disclaims guarantees and booking | pass |

## Accessibility
- One h1 and a strict h1→h2 outline. Lists are real `<ul>`/`<ol>`. Content sits in `<article>` inside the shell's `<main id="main">`.
- `aria-current="page"` on About in the main nav and not on Home. This is verified by the test and by reading the code (`NavLinks.tsx`).
- Adding the second nav item stays within the shell's 44×44 target and 320px no-overflow checks. `shell.spec.ts` measures all `header a, footer a` on `/`, which now includes About, and `about.spec.ts` checks overflow on `/about`.
- axe (wcag2a/2aa/21a/21aa/22aa) runs on `/about` in both projects.
- R4 is the only issue, and it's minor.

## QA results
Run on `d2f1dd60cb9c01445b3fe12634b68cdc25811fec`. As an independent reviewer, I didn't run project scripts locally. CI is the evidence.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend lint, format, types, tests | CI `backend` | PASS (not affected) | run 45201545998, job 137786131824 |
| Frontend lint, types, unit | CI `frontend` (`npm run lint -- --max-warnings=0`, `typecheck`, `test`) | PASS | job 137786131683 |
| Replay evals | — | NOT RUN (not applicable: static page, no agent path) | — |
| Playwright E2E + axe | CI `e2e` (`npm run e2e`, desktop + mobile) | PASS | job 137786360098. Logs aren't downloadable until the run finishes |
| Diff hygiene / secret scan | CI `diff-hygiene`, `secret-scan` | PASS | jobs 137786070736, 137786070871 |
| Image build | CI `images` | PENDING at time of review | job 137786978900 |
| CI on the PR | https://github.com/phuc-minu/Khondi/actions/runs/45201545998 | PASS for spec AC 7 (`frontend`, `e2e`); `images` still pending | run head SHA confirmed = reviewed SHA |

## Acceptance criteria coverage
| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1 | `/about` 200, title "About — Khondi", one h1 "About Khondi" | `about.spec.ts` test 1, run against `next build && next start` (playwright `webServer`); code read | pass |
| 2 | h2 order; trust paragraph exact | test 1 (`toHaveText([...])`); diff compared word by word with T0010 | pass (see R1 to make the test strict) |
| 3 | About in header and footer; `aria-current` on About only | test 2; `NavLinks.tsx` read | pass |
| 4 | axe zero violations, both projects | test 3 | pass |
| 5 | No horizontal overflow at 320×640 | test 4 | pass |
| 6 | No cross-origin requests | test 5 | pass |
| 7 | CI `frontend` and `e2e` pass on head | `gh pr checks 79` on `d2f1dd6` | pass |

## Head movement
The PR head was `d2f1dd60cb9c01445b3fe12634b68cdc25811fec` at the start and at the end of this review. There is no delta to review.

## Next step
No blocking findings. R1–R4 are optional polish. If the author fixes any of them, a quick delta check is enough, with no full re-review. Before merge under the website delegation, the `images` job must finish green and Claude Senior QA must record its own result on the final head SHA. This review is not owner approval and doesn't authorize merging by itself.

VERDICT: PASS
Reviewed SHA: `d2f1dd60cb9c01445b3fe12634b68cdc25811fec`
Findings: R1 minor `frontend/e2e/about.spec.ts:17`; R2 minor `docs/tasks/T0012-about-page/03-codex-handoff.md:26-32`; R3 nit `docs/tasks/INDEX.md:17`; R4 nit `frontend/src/components/StepList.tsx:14-15`
