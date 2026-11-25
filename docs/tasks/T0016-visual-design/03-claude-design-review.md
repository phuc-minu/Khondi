# T0016 · Claude review of the designer handoff

| Field | Value |
| --- | --- |
| Task | T0016-visual-design |
| Step | 3 · Claude review of `02-designer-handoff.md` against `01-designer-brief.md` |
| Author | Claude (architect) |
| Date (UTC) | 2026-11-24 |
| Verdict | **APPROVE WITH CHANGES.** Direction, tokens, shell and components are accepted. Items D1–D3 need the Product Owner. The rest are changes to apply during implementation. |

## What is accepted
Tokens, the single `.container`, sticky header with a menu disclosure, buttons, hero, step and feature cards, the featured-destination band, the budget bar with the table kept as the authoritative version, day cards, the trust note, the reduced-motion rules, and the component inventory. All brief conflicts are resolved sensibly: no `$720`, no AI badge, no per-person or family claims, no social icons, no map, no unlicensed photos.

## Decisions needed from the Product Owner
- **D1 · CTA labels and landing h1.** Three sources disagree, and the designer picked one without noting that.
  - Positioning in #55 (20 Nov): **Plan my trip** / **Explore a $3,000 New Orleans example**.
  - Approved spec T0010 and T0015 (and the built About page): **Start planning** / **See example trip**.
  - Your ChatGPT mockups: **Start Planning** / **See Example Trip**.
  - The designer also made the tagline the hero heading. T0015 requires the h1 to be "Plan the right trip for your budget" (as in your landing mockup), and the page title to match. **Proposal:** keep the T0010 h1 and title, put "Your budget, your trip" in the brand lockup and footer, and use "Plan my trip" and "Explore a $3,000 New Orleans example" as the CTA labels, since they are the later positioning. Tell me if you prefer "Start planning" and "See example trip".
- **D2 · New copy.** The designer added copy that is not in T0010: step titles "Set a budget / See what fits / Read the plan", four feature cards where T0010 has three, "Why this works", "Key neighborhoods", and the About "Who it's for" row. **Proposal:** implement only the T0010 copy now. The extras wait for Product Manager sign-off.
- **D3 · Images.** No image is sourced or licensed. **Proposal:** build everything with CSS gradients and a simple original SVG mark first, so the layout is judged on its own. Photos come in a separate asset PR once you have supplied or licensed them.

## Changes to apply during implementation
1. **Budget bar.** Add a 2px canvas-colored gap between segments. Several neighbors are under 3:1 against each other, and the legend and table cover meaning but not the visual boundary. Compute widths from the fixture, not hardcoded percentages, and test that they sum to 100 and match the table.
2. **Sticky header and anchors.** `#how-it-works` needs `scroll-margin-top` equal to the header height, and focus must still move to the heading (T0015 AC 2).
3. **Mobile menu.** The disclosure is a new client component. It needs Playwright tests for open, Escape, focus return and `aria-expanded`, and every link must stay reachable with it closed at 320px.
4. **Type.** The system serif is Georgia, which will look plainer than your mockups. Accept it for now. A self-hosted font can come later with its licence recorded.
5. **Size.** The restyle is far over the 400-line guideline (Q2), so it is split into the tasks below.
6. **Existing tests stay green.** Word-boundary wrapping, the banned-word scan, the footer sentence, the link crawl and the one-h1 rule all still apply.

## Plan
| Task | Scope | Depends on |
| --- | --- | --- |
| T0017 | Tokens, `.container`, header, footer, buttons, trust note, brand mark; restyle existing pages with no new content | D1 |
| T0018 | Example page: budget bar, day cards, compact hero (no photo), existing copy only | T0017 |
| T0014 | Budget starter built on the new shell, per the `/plan` board | T0017 |
| T0015 | Landing: hero, steps, differentiators and sample band, with T0010 copy | T0014 |
| T0019 | About restyle | T0017 |
| later | Asset PR (photos, favicon, fleur mark) and the extra copy from D2 | D2, D3 |

T0014 and T0015 get a short design addendum once D1 is decided. I will not edit those specs before then.

## Gate
The brief requires the Product Owner to approve the visual direction before implementation. The delegation covers merging the website PRs; it does not replace that look-and-feel approval. Implementation starts after D1–D3 are answered.

## Owner decisions
- **D1 (2026-11-24): follow the ChatGPT mockups.** Landing h1 stays "Plan the right trip for your budget" and CTA labels are **Start planning** and **See example trip**, exactly as in T0010 and T0015. "Plan my trip" and the tagline-as-h1 from `02-designer-handoff.md` are dropped. "Your budget, your trip" stays in the brand lockup and footer only. Nav labels are unchanged (Home, Example trip, How it works, About), since D1 did not cover them. Because T0010 already approves the About "Who it's for" section, that row is not new copy.
- **D2, D3:** not yet answered. Defaults apply (T0010 copy only; no photos in the first PRs). T0017 does not depend on either.
