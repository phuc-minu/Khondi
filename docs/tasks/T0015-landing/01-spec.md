# T0015 · Landing page (#57, #54) · Spec

| Field | Value |
| --- | --- |
| Task | T0015-landing |
| Step | 1 · Spec (delegated Gate 1, see `../T0010-website-epic53/02-claude-delegated-signoff.md`) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-23 04:00 |
| Spec version | v1 |
| Related | Issues #57, #54; parent spec [T0010 v1](../T0010-website-epic53/01-spec.md); About (#59), New Orleans example (#58), budget starter (#56) |

## Goal
Replace the scaffold home page with the Landing page, which explains what Khondi is and how budget-first planning works. Add the site-wide checks that only make sense once all four pages exist. This narrows the parent spec to this PR.

## Precondition
The budget starter (#56) is **merged** into `main`, and with it About (#59) and the example (#58). If not, stop and set `state:blocked`. Branch from `main` after that merge (no stacked PRs).

## Scope
**In scope**
- `frontend/src/app/page.tsx`: replace the scaffold with the copy from T0010 "Content → Landing", in four sections:
  - Hero, with the h1, the lead, and **Start planning** (primary) and **See example trip** (secondary);
  - How it works, with `id="how-it-works"`, an h2 and `StepList`;
  - Why Khondi is different, with an h2 and three items;
  - Sample trip, with an h2, the trip line, a short `IllustrativeNote` and "See the full example".

  Metadata: the title is exactly "Khondi — Plan the right trip for your budget". Use `title: { absolute: … }` so the layout template doesn't add a suffix. The description is "Plan the right trip for your budget, with a day-by-day plan and every estimated cost laid out."
- `navigation.ts`: insert `{ href: "/#how-it-works", label: "How it works" }` before About, for the final order Home, Example trip, How it works, About. It must not get `aria-current` on `/`, because Home has it there.
- Playwright `e2e/landing.spec.ts`, plus the site-wide `e2e/navigation.spec.ts`:
  - **Link crawl.** From each of the four pages, follow every same-origin link and anchor in the header, the footer and `main`. Each must give 200 and the expected h1; an anchor's `id` must exist.
  - **Banned words.** No page's text contains "verified", "live price", "book now" or "guaranteed" (case-insensitive).
  - **Unique titles.** Each of the four pages has a different `<title>` and exactly one h1.
  - **Footer sentence.** It is still exactly the T0010 sentence on every page.

**Out of scope:** new copy beyond T0010, images, analytics, and changes to the other pages beyond what the link crawl turns up as broken. If it finds a broken link, fix it in this PR and name it in the handoff.

## Acceptance criteria
1. `/` returns 200, with the exact title above, exactly one h1 "Plan the right trip for your budget", and the four sections in order.
2. "How it works" in the nav scrolls to `#how-it-works` and moves focus there. On `/`, only Home has `aria-current="page"`.
3. Both hero CTAs and "See the full example" reach their pages.
4. The link crawl, the banned-words scan, the unique-titles check and the footer-sentence check pass on all four pages, in both projects.
5. axe reports zero violations on all four pages, in both projects. There is no overflow at 320×640 on any page, and no page requests another origin.
6. CI `frontend` and `e2e` jobs pass on the PR head commit, and `npm audit --omit=dev` reports no critical or high advisories.

## After merge
This completes epic #53's v1. Claude QA captures full-page screenshots of all four pages at 1280×800 and 375×812 as evidence for Designer review (#55). They are not committed.

## Size
About 250 changed lines.

## Approval
Signed off by Claude under the owner's website delegation (AGENTS.md, PR #61). The owner has not reviewed this spec.
