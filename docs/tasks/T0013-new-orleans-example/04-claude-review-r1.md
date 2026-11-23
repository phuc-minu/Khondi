# T0013 · New Orleans example · Claude review and QA · round 1

| Field | Value |
| --- | --- |
| Task | T0013-new-orleans-example |
| Step | 04 · Code review and QA, round 1 |
| Author | Claude (independent code reviewer in a separate session; not the PR author session. The code was also Claude-authored; see `05-claude-authorship-correction.md`) |
| For | PR author (optional polish), the required Codex cross-check, then merge decision under the website delegation |
| Date (UTC) | 2026-11-23 15:31 (head-movement addendum 15:34) |
| PR | #81 |
| Commit reviewed | `001ff19796cac3852a811d77499cf9bafb2e34de` (application code). The verdict also applies to `aac5e64c0f3d1b249b13e36a72134122049de981` and `5914ca51c842fbe094b8f7e40049a1859007d4ba`, which change docs only (see "Head movement") |
| Base | `main` @ `0db35b5` (T0012 merge, PR #79); merge-base equals current `origin/main` |
| Responds to | `03-codex-handoff.md` |
| Verdict | `APPROVE_FOR_OWNER_REVIEW` (review verdict PASS; no blocking or major findings) |

## Summary
The PR builds `01-spec.md` v1 faithfully. The fixture matches the T0010 "New Orleans fixture contract" type and values exactly. The page copy, metadata, nav order and About CTA match the spec. All five components behave as T0010 "Shared components" describes. CI `frontend` and `e2e` pass on the head commit. I accept deviation 1 (forbidden phrases scoped to this page) for T0013. The real conflict sits in the T0015 spec and needs a follow-up before T0015 starts (see "Deviation rulings"). I accept deviations 2 and 3. The findings below are minor or nit. None blocks merge.

## Findings
None of these is blocking. Each may be fixed or answered with a reason.

| ID | Severity | Rule | File:line | Problem | Suggested fix |
| --- | --- | --- | --- | --- | --- |
| R1 | minor | Q9, AC 8 | `frontend/e2e/example-trip.spec.ts:80-85` | axe runs only after `setViewportSize(320×640)`, in both projects. So the example page is never axe-scanned at the desktop (1280×800) or mobile (375×812) project viewports. The `≥640px` grid layout of `TripAssumptions` is never scanned. `about.spec.ts` and `shell.spec.ts` run axe at the project viewport. | Split this test in two: axe at the project viewport (no `setViewportSize`), and a separate 320px overflow + cross-origin test, matching `shell.spec.ts`. |
| R2 | minor | Q9, AC 2 | `frontend/e2e/example-trip.spec.ts:26`, `:48-49` | AC 2 asks for "every assumption" and "four day sections with their items". The assumptions loop skips "New Orleans, Louisiana" (Destination) and the "Total budget" row. The day check asserts only the count of `Day N — …` h3s and one of the 11 items. A changed day title or a dropped item would still pass. | Assert the four h3s with `toHaveText([...])` using the exact T0010 titles. Assert every item, for example with each section's `getByRole("listitem")` `toHaveText([...])`. Add the Destination and Total budget rows to the assumptions loop. |
| R3 | minor | Q1, issue hygiene | PR #81 body ("Closes #58") | Issue #58's acceptance includes the **Customize this trip** CTA (prefilled starter). The spec rightly defers that CTA to T0014 (#56). Merging with `Closes #58` auto-closes the issue while that item is still open. It is then tracked only inside the T0014 spec. | Before merge, either change the PR body to `Refs #58`, or comment on #58 that the Customize CTA is tracked by #56 / T0014 and close it knowingly. |
| R4 | minor | Q10 | `docs/tasks/T0013-new-orleans-example/03-codex-handoff.md:25`, `:30-38` | (a) The "Validation evidence" block summarizes results (`-> passed`, `32 passed`) instead of pasting real output, the same as T0012 R2. (b) The size claim "about 600 added lines" doesn't match the diff, which is +501/−2 across 22 files, with `frontend/src` +297. CI on the head independently confirms `frontend` and `e2e`, so this doesn't block merge. | Correct the size figure. In future handoffs, paste the tail of the real output, such as the Vitest and Playwright summary lines. |
| R5 | nit | Q11 | `frontend/src/components/TripAssumptions.tsx:18` | Deviation 2. "Flying, economy, round trip" is a literal in a component that is otherwise data-driven, and nothing links it to `trip.travelMode`. | Optional: `const travelModeText: Record<IllustrativeTrip["travelMode"], string> = { flying: "Flying, economy, round trip" };` and render `travelModeText[trip.travelMode]`. Then adding a mode later forces a compile error instead of showing the wrong text. |
| R6 | nit | Q11 | `frontend/src/components/LinkButton.module.css:1` | `.secondary{background:#fff}` is the only raw color literal in the new CSS. Everything else uses shell tokens. | Optional: use a token, adding a `--color-bg` token in `globals.css` if needed, or `transparent`. |
| R7 | nit | Q4, AC 4 | `frontend/e2e/example-trip.spec.ts:62` | The forbidden-phrase scan reads only `main` text. AC 4 says "No text on the page". Header and footer are clean today, but scanning `body` costs nothing and also covers shell copy. | Use `page.locator("body").innerText()`. |
| R8 | nit | Q3 hygiene | `docs/tasks/INDEX.md:18` | The T0013 row says "draft PR" with no number, the same as T0012 R3. The T0011 row (line 16) still says "needs-claude-review / draft PR #78", but #78 is merged. That staleness predates this PR. | Change line 18 to "draft PR #81". Optionally mark T0011 as merged in the same edit. |

## Deviation rulings
**Deviation 1: forbidden phrases scoped to the example page.** Accepted for T0013. No change to this PR is required.
- **The T0013 spec is page-scoped.** T0013 v1 AC 4 says "No text on **the page** contains …". The handoff and the test match it, so this isn't a deviation from the approved T0013 spec.
- **The site-wide scan belongs to T0015.** The T0010 delivery table assigns the "cross-page link-crawl and banned-word scan" to **T0015**. T0015 v1 restates it as "No page's text contains 'verified', 'live price', 'book now' or 'guaranteed'" (`docs/tasks/T0015-landing/01-spec.md:31`, AC 4 at `:41`). Widening the scan in T0013 would add scope and fail CI against merged, approved copy.
- **The conflict is real, and wider than the handoff says.**
  - `/about` (T0012, protected word for word by T0012 AC 2) contains "Nothing here is a **live price**…".
  - The T0010 Landing copy that T0015 must ship contains "We don't show prices as live or places as **verified** unless they are."
  - So T0015 v1 can't pass its own AC 4 as written. In both cases the phrase is a disclaimer, which is the opposite of what the scan is meant to catch.
- **Reconcile before T0015 starts.** This doesn't block T0013. I recommend a follow-up issue under epic #53, "Reconcile banned-phrase scan with approved disclaimer copy (About, Landing)", resolved in a **T0015 spec v2** before Codex starts T0015. Recommended resolution:
  - Keep the approved About and Landing copy unchanged, since its meaning is protected.
  - Change the scan to fail on the banned phrases **except** inside an explicit allowlist of the exact approved disclaimer sentences (About "Where Khondi is today" paragraph; Landing "Honest about what's known" item). Ideally match on whole sentences, so any new use of the phrases still fails.
  - This keeps the intent (no affirmative "verified", "live price" or "guaranteed" claims). I consider it a non-material restatement that Claude can sign off under the delegation.
  - Rewording the approved copy instead would be a content change. Under the T0010 signoff, that goes back through the architect, and to the owner if it changes meaning.
- **Who acts.** The orchestrator or architect should file that issue. This review only recommends it and creates nothing.

**Deviation 2: the "Getting there" text is a constant.** Accepted. The T0010 type contract allows only `travelMode: "flying"`, and the "economy, round trip" wording exists only in the values table, so a literal is the smallest correct reading. See R5 for an optional type-linked form.

**Deviation 3: size.** Accepted. `frontend/src` adds 297 lines, which is inside the spec's 350–400 estimate and the Q2 target of 400. The rest is fixture, tests and handoff docs. The handoff figure is overstated (R4).

## Code review checklist
- [x] Matches the approved spec version (`01-spec.md` v1), with nothing extra and nothing missing (Q1). It has the fixture, `money.ts`, five components, the page, the nav item and the About CTA. "Customize this trip", `/plan`, landing, images and maps are all absent, as the spec requires. `LinkButton` is introduced here, as the T0012 spec deferred it.
- [x] Diff is small and focused (Q2, Q3). 22 files, +501/−2, with no shell edits beyond the one nav insert. `git diff --check` is clean. `package.json` and `package-lock.json` are unchanged.
- [x] No TODOs, stubs, placeholders or commented-out code (Q4). Sample data is labeled illustrative in the fixture's `status` field and on the page.
- [x] No dead or speculative code (Q5). `IllustrativeNote`'s `short` variant is specified now for Landing (T0015). `LinkButton`'s `primary` variant is specified for T0014/T0015 CTAs. Both are spec-mandated, not speculative.
- [x] Errors (Q6): not applicable, because this is static content.
- [x] Input validation (Q7): not applicable, because there is no input.
- [x] Typed (Q8). The contract types are copied verbatim, the fixture is typed as `IllustrativeTrip`, and the return types are explicit `React.ReactElement`. There's no `any`, no `!` and no casts. `as const` is used only on the note text.
- [x] Tests (Q9). The Vitest suite covers all 7 T0010 invariants, `formatUsd(3000)`, `formatUsd(0)` and `sumUsd` over the fixture (= 3000 via `budgetUsd`). The Playwright suite covers AC 1, 2 and 4–8 in both projects. See R1 and R2 for coverage gaps.
- [ ] Evidence (Q10). The handoff summarizes rather than pastes output, and the size figure is off (R4). CI makes up for it.
- [x] Follows existing patterns (Q11). It uses one-line CSS modules with shell tokens (every `var(--…)` used is defined), the same relative imports, and the same axe tags and cross-origin and 320px checks as `shell.spec.ts`. R5 and R6 are nits.
- [x] Dependencies (Q12). None were added. The lockfile is untouched, so the exact-version pinning convention isn't affected.
- [x] Comments (Q13). There are none, and none are needed.
- [x] Logging (Q14). There is no `console.*`.
- [x] Secrets/PII (Q15). There are none in the diff or the PR text.
- [x] Gates (Q16). No CI, lint, type or coverage config was touched. No test was weakened. `about.spec.ts` only gains a test.
- [x] Architecture. It fits the T0011 shell and T0012:
  - The nav comes from `src/content/navigation.ts`, so `NavLinks` and `SiteFooter` pick up "Example trip" second with no component changes.
  - The page is a server component, prerendered static, with no client JS added.
  - The layout title template produces "Sample trip: New Orleans for $3,000 — Khondi".
  - Money is computed in one place: `CostBreakdown` derives Total and Remaining from the fixture with `sumUsd` instead of hard-coding them.
  - The footer data-behavior sentence stays true.

## Content and spec fidelity
| Item | Spec (T0010 / T0013 v1) | Implementation | Result |
| --- | --- | --- | --- |
| Title / description | "Sample trip: New Orleans for $3,000 — Khondi"; given description | Identical | match |
| h1 + lead | "New Orleans for $3,000" + lead | Identical | match |
| IllustrativeNote full / short text, `role="note"` | T0010 text | Identical, `<p role="note">` | match |
| Note placement | Above first h2 (T0013 AC 2) | Directly after the lead | match. T0010's "next to every money block" is satisfied by the single top note on this page, because the cost table is under the same article. Revisit for Landing's sample card (T0015 uses the short form). |
| h2 order | Trip assumptions; Where the $3,000 goes; Day by day | Identical | match |
| Fixture type contract | T0010 TS block | Identical fields and literal types | match |
| Fixture values | budget, travelers, origin, length, timing, mode | Identical | match ("Getting there" per deviation 2) |
| Cost lines ×5 | Label, covers, amount | Identical; 900+1050+450+350+250 = 3000 | match |
| Total / Budget / Remaining | $3,000 / $3,000 / $0 | Derived; renders identical | match |
| No-buffer sentence | T0010 text | Identical | match |
| Not included ×4 | T0010 list | Identical, under h3 "Not included" | match |
| Days ×4 | Titles + items; no times or prices | Identical; h3 "Day N — Title" in `<section>` | match |
| Closing line | "These are suggestions, not reservations…" | Identical | match |
| CTAs | About Khondi (secondary) → `/about`; Customize deferred | As specified | match |
| Nav | Home, Example trip, About | As specified | match |
| About CTA | "See example trip" (secondary) at the end | As specified | match |
| Issue #58 "no bookings implied, no unverified assertions"; party-total labeling | — | Caption "party total"; every cost carries a "covers" string; the closing line disclaims reservations | pass |

## Accessibility
- One h1 and a strict h1→h2→h3 outline: "Not included" is h3 under "Trip assumptions", and the day h3s are under "Day by day". Content sits in `<article>` inside the shell's `<main id="main">`.
- Cost table:
  - `<caption>` and three `<th scope="col">`;
  - body rows use `<th scope="row">` for the category;
  - footer rows use `<th scope="row" colSpan={2}>`;
  - amounts are right-aligned with `tabular-nums` and `nowrap`;
  - the wrapper has `overflow-x:auto` and cells use `overflow-wrap:anywhere`, which together keep the 320px overflow check green.
- Assumptions use a real `<dl>` with `<div>` row wrappers, which HTML allows.
- `aria-current="page"` on "Example trip" in the main nav is verified by the test, and the footer order is verified.
- `LinkButton` is an `<a>` via Next `Link` with `min-height:44px`. The shell's focus ring applies, and the secondary variant has a visible 2px border, so the button isn't distinguished by color alone. The 44px size isn't asserted by a test, but the CSS is unambiguous.
- axe (wcag2a/2aa/21a/21aa/22aa) runs on both pages in both projects. On the example page it runs only at 320px (R1).

## QA results
Run on `001ff19796cac3852a811d77499cf9bafb2e34de`. As an independent reviewer, I didn't run project scripts locally. CI is the evidence.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend lint, format, types, tests | CI `backend` | PASS (not affected) | run 45205522840, job 137800142894 |
| Frontend lint, types, unit | CI `frontend` | PASS | job 137800143006 |
| Replay evals | — | NOT RUN (not applicable: static page, no agent path) | — |
| Playwright E2E + axe | CI `e2e` (desktop + mobile) | PASS (2m7s) | job 137800478915 |
| Diff hygiene / secret scan / repo tooling | CI `diff-hygiene`, `secret-scan`, `repo-tooling` | PASS | jobs 137800062909, 137800063729, 137800062142 |
| Image build | CI `images` | PENDING at time of review | job 137800955229 |
| CI on the PR | https://github.com/phuc-minu/Khondi/actions/runs/45205522840 | PASS for spec AC 9 (`frontend`, `e2e`); `images` still pending | run head SHA confirmed = reviewed SHA |

## Acceptance criteria coverage
| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1 | 200, title, exactly one h1 | `example-trip.spec.ts` test 1 against `next build && next start`; code read | pass |
| 2 | Note above first h2; assumptions; not-included; 5 cost lines; totals; no-buffer line; 4 days with items | tests 1–2; code read against T0010 word by word | pass (test coverage of days and two assumption rows is partial; see R2) |
| 3 | Fixture invariants, `formatUsd`, `sumUsd` = 3000 | `tests/new-orleans-example.test.ts`, `tests/money.test.ts`; CI `frontend` | pass |
| 4 | No forbidden phrases on this page | test 4 (main text); manual read of header and footer | pass (see R7; site-wide ruling under "Deviation rulings") |
| 5 | Caption, `th scope="col"`, total rows `th scope="row"` | test 3; code read | pass |
| 6 | "Example trip" second in header and footer, `aria-current` | test 5; `navigation.ts` | pass |
| 7 | `/about` "See example trip" reaches this page | `about.spec.ts` new test | pass |
| 8 | axe zero on this page and `/about` in both projects; no 320px overflow; no cross-origin requests | test 6; `about.spec.ts` axe test | pass (axe only at 320px here; see R1) |
| 9 | CI `frontend` and `e2e` pass on head | `gh pr checks 81` on `001ff19` | pass |

## Head movement
The full review was done on `001ff19796cac3852a811d77499cf9bafb2e34de`. Afterwards the head moved twice. I checked both deltas against `001ff19`, and both change docs only:

| Commit | Change | Files | Code, tests or config touched |
| --- | --- | --- | --- |
| `aac5e64c0f3d1b249b13e36a72134122049de981` | Records that Claude authored this PR's code and handoff docs (and T0012's); requires a Codex cross-check before merge | `docs/tasks/INDEX.md` (T0013 row), `docs/tasks/T0013-new-orleans-example/05-claude-authorship-correction.md` (new) | none |
| `5914ca51c842fbe094b8f7e40049a1859007d4ba` | Commits this review r1 (byte-identical to the reviewed text) and updates the INDEX row | `docs/tasks/INDEX.md` (T0013 row), `docs/tasks/T0013-new-orleans-example/04-claude-review-r1.md` (new) | none |

- `git diff --name-only 001ff19..5914ca5` lists only those three files under `docs/`. The merge-base is still `0db35b5` = `origin/main`.
- Every application-code, test and config finding above stands unchanged, and so does the verdict. It applies to `aac5e64c` and to `5914ca5`.
- R8 is still open. The T0013 INDEX row still says "draft PR" with no number.
- **The authorship correction affects how much weight this review carries, not its findings.** As `05-claude-authorship-correction.md` says, this is a separate Claude session checking Claude-authored code. It is not independent by model family or role. The "Codex" labels in `03-codex-handoff.md` don't describe who actually wrote the code, and that file's R4 notes stand regardless.
- At the time of the addendum, GitHub reported no checks yet for the new head. The CI evidence above is from `001ff19`. Because the delta is docs-only, that evidence carries over to the application code, but merge still needs CI green on the final head.

## Next step
No blocking findings. R1–R4 are worth fixing: R1 and R2 are test tightening, R3 must be handled before merge in either of the two ways given, and R4 is a doc correction. R5–R8 are optional. If the author changes only tests and docs, a quick delta check is enough, with no full re-review. Before merge under the website delegation:
- CI, including `images`, must finish green on the final head SHA;
- Claude Senior QA must record its own result on the final head SHA;
- the **Codex cross-check** required by `05-claude-authorship-correction.md` (and by the owner) must be done and recorded in the next numbered file. This Claude verdict is necessary but no longer sufficient;
- the deviation-1 follow-up issue should be filed so T0015 isn't started against a self-contradictory spec.

This review is not owner approval and doesn't authorize merging by itself.

VERDICT: PASS
Reviewed SHA: `001ff19796cac3852a811d77499cf9bafb2e34de` (application code). The verdict also applies to `aac5e64c0f3d1b249b13e36a72134122049de981` and `5914ca51c842fbe094b8f7e40049a1859007d4ba`, which change docs only. A Codex cross-check is still required before merge.
Findings: R1 minor `frontend/e2e/example-trip.spec.ts:80-85`; R2 minor `frontend/e2e/example-trip.spec.ts:26,48-49`; R3 minor PR #81 body ("Closes #58"); R4 minor `docs/tasks/T0013-new-orleans-example/03-codex-handoff.md:25,30-38`; R5 nit `frontend/src/components/TripAssumptions.tsx:18`; R6 nit `frontend/src/components/LinkButton.module.css:1`; R7 nit `frontend/e2e/example-trip.spec.ts:62`; R8 nit `docs/tasks/INDEX.md:18`
