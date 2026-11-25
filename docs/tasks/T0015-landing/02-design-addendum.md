# T0015 · Landing page · Design addendum

| Field | Value |
| --- | --- |
| Task | T0015-landing |
| Step | 1b · Spec addendum (delegated Gate 1) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-25 |
| Related | [01-spec.md](01-spec.md), [T0016 handoff](../T0016-visual-design/02-designer-handoff.md) §4–5, [design review](../T0016-visual-design/03-claude-design-review.md), concept `../T0016-visual-design/reference-landing-concept.png` |

This addendum amends `01-spec.md`. Where they conflict, this file wins.

## Owner decisions (2026-11-25)
- **Order changed:** the landing page is built **before** the budget starter (T0014). The old precondition ("#56 merged") is dropped. Branch from `main`; T0017 and T0018 are merged.
- **"Start planning" links to `/plan`** even though `/plan` does not exist until T0014 merges. Nothing is deployed, so a short-lived 404 on `main` is accepted. T0014 follows immediately.

## Changes to scope
1. **Hero** (T0016 §4 Hero, §5 Landing): two columns from 768px, copy first on mobile. CTAs use `LinkButton`: **Start planning** (primary) → `/plan`, **See example trip** (secondary) → `/trips/new-orleans-example`. Copy stays as T0010 (h1, lead). No photo (decision D3): the right column is a CSS-only decorative panel (token gradient plus a simple inline-SVG motif), `aria-hidden`, hidden below 768px or reduced to a short band. No eyebrow.
2. **How it works** (`id="how-it-works"`, h2): three step cards from `StepList` with a visible number each. Restyle `StepList` as cards (outlined number badge, title, text); a decorative connector between cards from 768px, a vertical rule on mobile. Copy unchanged. No icons are required; add none that need new assets.
3. **Why Khondi is different:** the **three** T0010 items as feature cards (the designer's fourth card and extra copy are held, decision D2). h2 unchanged.
4. **Sample trip band:** a wide surface card: left, h2 "Sample trip: New Orleans for $3,000", the trip line, `$3,000` and `2 adults · 4 days, 3 nights` chips, the short `IllustrativeNote`, and the link "See the full example" as a secondary `LinkButton`. A faint fleur-de-lis is allowed only as CSS or inline SVG, `aria-hidden`, never competing with text.
5. Sections use `.container`, token spacing (about 64px vertical on mobile, 96px on desktop) and the `scroll-margin-top` already in `globals.css` for `#how-it-works`.
6. **Header CTA stays** "See example trip" until T0014 (T0014 repoints it). Do not change `SiteHeader` except adding the nav item below.
7. **Nav item** "How it works" `/#how-it-works`, as in `01-spec.md`. The no-`aria-current` rule still applies.

## Changes to the tests
- The **link crawl** covers the pages that exist. Because `/plan` is a known-missing target, the crawl **skips exactly `/plan`** through one named constant with a comment that says T0014 removes it, and adds a separate assertion that the landing page's "Start planning" `href` is `/plan`. Do not skip any other link.
- All other `01-spec.md` checks stay: banned words, unique titles and h1s, footer sentence, axe (both projects), 320px overflow, no third-party requests, "How it works" focus and `aria-current`.
- Add a 768px and 1280px layout check: hero is two columns at 768px and up; feature cards and step cards have no horizontal overflow at 320, 375, 768 and 1280.
- Existing `shell.spec.ts` assertions that expected the scaffold h1 only keep passing.

## Out of scope (unchanged and added)
Photos, held extra copy (decisions D2, D3), the About restyle (T0019), `/plan` itself, and any new copy beyond T0010. If the concept shows copy that T0010 lacks, leave it out and list it under Follow-ups.

## Size
About 350 lines. Say so in the handoff if more (Q2).

## Approval
Signed off by Claude under the owner's website delegation (AGENTS.md); the owner's order decision is recorded above.
