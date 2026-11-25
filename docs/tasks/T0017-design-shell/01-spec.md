# T0017 · Design tokens and site shell · Spec

| Field | Value |
| --- | --- |
| Task | T0017-design-shell |
| Step | 1 · Spec (delegated Gate 1, see `../T0010-website-epic53/02-claude-delegated-signoff.md`; direction per `../T0016-visual-design/03-claude-design-review.md`) |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-24 |
| Spec version | v1 |
| Related | #55; T0016 handoff `02-designer-handoff.md` sections 3, 4, 7, 9; T0011 (site shell) |

## Goal
Give the existing pages the visual foundation from the designer handoff: tokens, one shared page container, a sticky header with a primary CTA and mobile menu, a restyled footer, and a brand mark. No new page content.

## Precondition
PR #83 (T0016) is merged. Branch from `main`. Do not stack PRs.

## Scope
**In scope**
- `globals.css`: add the tokens in handoff section 3 (canvas, surface, subtle surface, accent, spacing 9–10, radii, shadow, breakpoints note). Keep existing variable names; change `body` to the canvas background. Keep the system font stacks; no remote fonts.
- `PageContainer` (or a `.container` utility) per handoff section 3. Header inner, every page's content wrapper and footer inner use it, so they share one left edge. Remove the per-page `max-width` wrappers that conflict (`about`, `trips/new-orleans-example`).
- `SiteHeader`: sticky, translucent white surface, 1px bottom border; `BrandMark` (original inline SVG, decorative, `aria-hidden`) plus "Khondi"; the nav; a primary **Start planning** button. Until `/plan` exists (T0014) the button must not link to a missing route: render it only when `/plan` exists, or point it at `/trips/new-orleans-example` with the label **See example trip**, and say which in the handoff.
- Mobile menu (below 900px): disclosure button with `aria-expanded` and `aria-controls`, closes on Escape and on navigation, returns focus to the button. With JavaScript unavailable the nav stays visible.
- `SiteFooter`: brand mark, "Your budget, your trip", nav, the exact T0010 footer sentence, "© 2026 Khondi". No social icons.
- `LinkButton` and `IllustrativeNote` restyled to the handoff (48px high, 14px radius; note card with a small decorative info icon). Keep their props.
- `scroll-margin-top` on in-page anchor targets equal to the header height.
- Favicon: a local SVG derived from the brand mark, wired through the Next metadata.

**Out of scope:** photos, new copy, the budget bar, day cards, hero, step and feature cards, `/plan`, landing and About changes beyond the container. Those are T0018, T0014, T0015, T0019.

## Acceptance criteria
1. At 1280, 768, 375 and 320px the left edge of the header content, the page `main` content and the footer content is the same x position (Playwright measures it on all existing pages).
2. No horizontal overflow at 320px on every page. The existing cost-table word-boundary test still passes.
3. The header stays at the top while scrolling. Its CTA is at least 44px high, and every nav item and button is at least 44×44px.
4. Mobile menu: opens and closes by click and keyboard, Escape closes it and returns focus to the button, `aria-expanded` is correct, and every link is reachable. With it closed at 320px nothing is clipped.
5. Existing tests stay green: footer sentence on every page, one h1 per page, unique titles, banned words, link crawl, axe with no violations, and `aria-current="page"` on the active link.
6. Text and interactive colors meet WCAG AA; Playwright axe covers color contrast on every page. No remote font, image or script request is made.
7. `prefers-reduced-motion: reduce` disables smooth scroll and transitions (a test checks computed styles).
8. Typecheck, lint, unit tests, build and Playwright pass, with real output pasted in the handoff (Q10).

## Test plan
Playwright `e2e/shell.spec.ts` (extend): container alignment, overflow, sticky behavior, menu keyboard behavior, reduced motion, no external requests. Update `about.spec.ts` and `example-trip.spec.ts` only where selectors change.

## Notes for Codex
- Size is likely above 400 changed lines. Say so in the handoff and keep CSS in the existing CSS Modules style.
- Raise anything that needs copy not in T0010 as a follow-up; do not invent text.
