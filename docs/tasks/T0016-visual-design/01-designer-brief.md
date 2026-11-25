# T0016 · Visual design for the public website · Designer brief

| Field | Value |
| --- | --- |
| Task | T0016-visual-design |
| Step | 1 · Designer brief (delegated, see `../T0010-website-epic53/02-claude-delegated-signoff.md`) |
| Author | Claude (architect), from the Product Owner's feedback and reference image |
| For | Senior Designer (Astra) |
| Date (UTC) | 2026-11-24 |
| Related | Issue #55 (visual system and responsive prototypes), epic #53, T0013 (merged), T0014, T0015 |

## Why now
On 2026-11-24 the Product Owner opened the merged site on localhost and said it "looks horrible". The pages match the text specs but have no visual design: a narrow text column with header and footer on a different left edge, a grey cost table, no imagery, and no accent beyond teal links. #55 was never delivered before implementation started. T0014 (budget starter) and T0015 (landing) must not be built the same way.

## Reference
[`reference-landing-concept.png`](reference-landing-concept.png) is the Product Owner's target for the landing page. It is a **directional concept**, not an implementation asset or measured spec (see #55).

[`reference-about-concept.png`](reference-about-concept.png) is the matching About concept (added 2026-11-24). It reuses the landing hero and adds three bands: four "How Khondi is different" cards, a "From budget to a real trip plan" step row, a "Who it's for" row (flexible travelers, families, budget-conscious planners) and a mission band with a closing CTA. [`reference-new-orleans-concept.png`](reference-new-orleans-concept.png) is the New Orleans example concept: a photo hero, a one-row budget strip ($3,000 total plus Flights, Stay, Food, Activities, Local Transport), trip-overview chips, four photo day cards, a "Why this works" row and a Key Neighborhoods map card. The budget-flow mockup has not been supplied yet; until they are, use the SVG boards on branch `docs/khondi-ui-conversation-graphics` for structure and copy only.

What to keep from the landing concept:
- Teal brand mark and a sticky header: logo, nav, one filled primary CTA at the right.
- Hero: eyebrow badge, large serif h1, short lead, primary and secondary CTA, full-bleed photo on the right fading into the page background.
- "From budget to trip": a heading block plus three numbered step cards with icons and arrows between them.
- "Why Khondi is different": a centered heading and a row of four icon cards.
- Featured destination band: photo left, copy and a "See the example" button right, with a faint fleur-de-lis watermark.
- Footer: logo, one-line tagline, nav links, quiet social icons.
- Soft off-white background, generous spacing, rounded cards with hairline borders, one restrained teal accent.

## Conflicts to resolve (the concept disagrees with approved copy)
The Designer decides each one and records it; where product copy is affected, Claude and the Product Manager confirm.

| Concept shows | Approved source | Proposed resolution |
| --- | --- | --- |
| "From $720 (est. total)", 3 days | New Orleans example is **$3,000, 4 days, 2 travelers** (T0013, #58) | Use the approved example figures. |
| Badge "AI Travel Planning" | Positioning avoids "only AI planner" claims; tagline is **"Your budget, your trip"** | Use the approved tagline in the brand lockup. Drop or rephrase the badge. |
| CTA "Start Planning" | Approved CTAs: **Plan my trip** and **Explore a $3,000 New Orleans example** (#55) | Use the approved labels. |
| Nav: Home, Trips, How It Works, About | Nav: Home, Example trip, How it works, About | Keep the approved nav. |
| "Grounded itinerary logic ... AI builds realistic plans" and "real costs" | Prices are **sample estimates, not live fares or bookings**; no "verified" or "guaranteed" | Keep the sample-estimate labelling visible wherever a price appears. |
| About concept: "Start Planning Your Trip", "See How It Works", "AI builds realistic plans", "real costs" | Same approved labels and sample-estimate rule as above | Use approved labels. Keep the "Who it's for" row only if the Product Manager approves the copy. |
| New Orleans concept: flights "per person", "family hotel", "Family-friendly" chip, "~$55/day", "Compare destinations" and "Customize this trip" buttons, Key Neighborhoods map | The approved example is **2 adults**, costs are a **party total** for 2, and no map or route data exists; "Customize this trip" is deferred to #56 | Keep the approved party-total wording and traveler count; drop "family" claims and the per-person label. Show the budget strip as the hero's centrepiece. Use a static neighborhood list instead of a map unless the designer proposes a clearly illustrative one. Link the CTAs to existing pages only. |
| Instagram, YouTube and LinkedIn icons | No such accounts exist | Omit them. |
| Photos (Amalfi-style coast, Bourbon Street) | Assets must be licensed or original; AI imagery marked as illustration when confusion is likely | Propose an asset strategy. Do not ship the concept's images unless the rights are confirmed. |

## Deliverables
1. **Design tokens:** palette with AA contrast, type scale (serif display plus sans body, with a licensed web font or a justified system stack), spacing, radius, shadow, focus ring and breakpoints. Align with the existing CSS variables in `frontend/src/app/globals.css` and say what changes.
2. **Shared layout:** one page container used by header, content and footer, so they share a left edge. Include the sticky header with the CTA, the footer, and the active, hover and focus states.
3. **Components:** hero, step card, feature card, featured-destination band, **budget bar** (the $3,000 split by category with legend and a text equivalent, replacing the grey table as the visual centrepiece; keep an accessible table), day cards or timeline, trust note, buttons.
4. **Pages, desktop (1280), tablet (768) and mobile (375 and 320):** Landing, New Orleans example, About, and the budget starter (T0014) so its form matches.
5. **Assets:** image sources and licences or generation prompts, crops, alt text, favicon and logo mark. Do not claim an image was generated unless a generation tool was actually used.
6. **Handoff:** component inventory, interaction and reduced-motion notes, and acceptance criteria for design fidelity review.

## Constraints
- Sparse and premium, **not a dashboard**. Mobile first; no horizontal overflow at 320px; the existing e2e rule that cost-table words wrap only at word boundaries must still hold.
- WCAG AA for contrast, focus, keyboard and responsive behaviour.
- No cookies or analytics, no remote font or image hosts that add tracking, and keep the footer sentence from T0010 unchanged.
- Banned words stay banned site-wide: "verified", "live price", "book now", "guaranteed".
- Static and mock only. No live data, accounts, payments or deployment.

## Acceptance
- [ ] Annotated designs for all four pages at the five widths above, plus the token list and component inventory.
- [ ] Each conflict in the table above has a recorded decision.
- [ ] Claude reviews the designs and updates T0014 and T0015 (and a follow-up restyle task for About and the example) before any Codex implementation.
- [ ] Product Owner is shown the designs before implementation starts. The delegation covers merging, but this task changes the site's look, so the Owner approves the direction first.

**Design specs, not implementation permission.**
