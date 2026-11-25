# T0016 · Khondi visual system and responsive design handoff

Status: proposed design handoff; no application implementation is included in this task.

Author: Senior Designer (ChatGPT), received from the Product Owner on 2026-11-24 and committed unchanged. Claude's review and the decisions that override parts of it are in `03-claude-design-review.md`. Where the two disagree, the review wins.

This document resolves the designer brief and is the source of truth for a later implementation review. The supplied concept images remain directional references only. No image in this document is claimed to be generated, licensed, or approved for shipment.

## 1. Design intent

Khondi should feel calm, editorial, and useful: a budget-first trip planner with the warmth of a small travel journal, not a dashboard. The visual hierarchy is:

1. one clear action: `Plan my trip`;
2. one proof point: the illustrative `$3,000 New Orleans example`;
3. a transparent, readable explanation of how the budget becomes a trip.

Use a soft off-white canvas, charcoal text, one restrained teal, serif display type, generous whitespace, hairline borders, and rounded cards. Photography is atmospheric and secondary to the copy; it must fade into the canvas rather than become a banner advertisement.

### Approved copy and product guardrails

- Tagline: **Your budget, your trip**.
- Primary CTA: **Plan my trip**.
- Secondary CTA: **Explore a $3,000 New Orleans example**.
- Navigation: **Home**, **Example trip**, **How it works**, **About**.
- Example: **$3,000**, **4 days / 3 nights**, **2 adults**, flying from the San Francisco Bay Area.
- Every price is an illustrative sample estimate. Keep the existing disclosure text visible near money blocks.
- Do not add booking, availability, comparison, social-account, map, or live-data affordances.

## 2. Conflict decisions

| Concept conflict | Decision | Handoff consequence |
| --- | --- | --- |
| `$720`, 3 days | Rejected; use the approved `$3,000`, 4-day, 2-adult example. | All hero, budget, metadata and card values use the approved fixture. |
| `AI Travel Planning` badge | Rejected. | Use the brand lockup `Khondi / Your budget, your trip`; no AI-superlative claim. |
| `Start Planning` | Rejected. | Use `Plan my trip`. |
| `Trips` nav label | Rejected. | Use `Example trip`. |
| `real costs`, `grounded`, `verified`, or guaranteed language | Rejected. | Use `illustrative estimate` and the existing sample-estimate disclosure. |
| About concept CTAs and AI claims | Rejected or renamed to approved copy. | About uses `Plan my trip` and `Explore a $3,000 New Orleans example`. |
| Family/per-person New Orleans labels | Rejected for this example. | Say `2 adults` and show party totals; omit family claims and per-person math. |
| `Compare destinations`, map, or `Customize this trip` as a new behavior | Deferred. | Use a static `Key neighborhoods` text card only if content is approved; link only to existing routes. |
| Instagram, YouTube, LinkedIn | Rejected. | Footer has no social icons or dead links. |
| Concept photos | Not approved as assets. | Use the asset plan below; ship only after rights or original generation is confirmed. |

## 3. Tokens

These tokens extend the existing `globals.css` variables. Keep the current system stacks; do not add a remote font request.

### Color

| Token | Value | Use | Contrast / note |
| --- | --- | --- | --- |
| `--color-canvas` | `#F7F5F0` | page background | warm off-white |
| `--color-surface` | `#FFFFFF` | cards, header, table | text contrast is strongest here |
| `--color-surface-subtle` | `#EEEAE1` | muted bands, selected chips | never use for small text without dark text |
| `--color-text` | `#1F2933` | body and headings | AA+ on canvas and surface |
| `--color-text-muted` | `#52606D` | supporting copy | 6:1+ on white/canvas |
| `--color-primary` | `#0F5F5C` | links, button, teal mark | 6:1+ with white; AA for normal text |
| `--color-primary-hover` | `#0B4A47` | hover/pressed | stronger than default |
| `--color-on-primary` | `#FFFFFF` | text on teal | AA on primary |
| `--color-accent` | `#C9A66B` | tiny decorative rule, budget key | never the sole status signal or body text |
| `--color-border` | `#D5DDDB` | hairlines and card borders | pair with text/icon, not as sole affordance |
| `--color-note-bg` | `#FFF7E6` | estimate note | use `--color-note-text` for text |
| `--color-note-text` | `#6B4E00` | estimate note copy | AA on note background |
| `--color-error` | `#B42318` | errors | pair with text and icon |

Budget bar category colors are teal-derived and must also have a text legend: flights `#0F5F5C`, hotel `#347B76`, food `#6C9A8F`, activities `#B58A52`, getting around `#7A6E63`. The bar is decorative; the accessible table is authoritative.

### Type

```css
--font-serif: Georgia, "Times New Roman", serif;
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

| Role | Size / line height | Weight |
| --- | --- | --- |
| Display h1 | `clamp(2.5rem, 6vw, 5rem)` / 0.98 | 400 |
| Page h1 on compact pages | `clamp(2.25rem, 5vw, 3.75rem)` / 1.04 | 400 |
| h2 | `clamp(1.75rem, 3.5vw, 3rem)` / 1.08 | 400 |
| h3 | `1.25rem` / 1.25 | 650 |
| body lead | `1.125rem` / 1.55 | 400 |
| body | `1rem` / 1.6 | 400 |
| label / eyebrow | `.75rem` / 1.3 | 700, uppercase, `.08em` tracking |
| small disclosure | `.875rem` / 1.45 | 400 |

Do not use all caps for paragraph copy. Keep measure between 45–68 characters for prose.

### Space, shape, elevation

`--space-1:4px`, `--space-2:8px`, `--space-3:12px`, `--space-4:16px`, `--space-5:24px`, `--space-6:32px`, `--space-7:48px`, `--space-8:64px`, `--space-9:96px`, `--space-10:128px`.

`--radius-sm:8px`, `--radius-md:14px`, `--radius-lg:24px`, `--radius-pill:999px`.

Use `--shadow-card: 0 12px 30px rgb(31 41 51 / 8%)` only for a featured surface; ordinary cards use borders and no shadow. Focus: `outline: 3px solid #0F5F5C; outline-offset: 3px`. Keep a 44×44px minimum target even when the visible icon is smaller.

### Breakpoints and container

- Base: 320px and up; single column, no horizontal overflow.
- `min-width: 640px`: two-column card groups and compact header spacing.
- `min-width: 900px`: desktop nav, hero split, 12-column grid.
- `min-width: 1200px`: preserve generous gutters; do not widen reading measure.

One shared container is mandatory:

```css
.container {
  width: min(1120px, calc(100% - 32px));
  margin-inline: auto;
}
@media (min-width: 768px) { .container { width: min(1120px, calc(100% - 64px)); } }
```

Header inner, every page section, and footer inner all use `.container`; no component may introduce a second left edge. At 320px the 16px outer gutter is preserved.

## 4. Shared shell and components

### Header and footer

The header is sticky, `top: 0`, with a translucent white surface and a 1px bottom border. Desktop order: teal Khondi mark, nav, `Plan my trip` button. Mobile: mark, menu button, then an opened vertical nav with the CTA as the final full-width item. The menu is a disclosure with `aria-expanded`, Escape-to-close, focus return, and no body scroll lock requirement.

The footer repeats the mark, tagline, approved nav, the unchanged sentence `This site doesn't use cookies or analytics, and the trip planner keeps your answers in your browser.`, and `© 2026 Khondi`. No social icons.

States: links use underline by default; hover changes teal depth; current route gets a 2px inset accent or underline plus `aria-current`; focus uses the global ring; disabled-looking controls are not rendered.

### Buttons

Primary: teal fill, white label, 48px high, 14px radius. Secondary: transparent/surface with teal border and teal text. Text remains visible at 200% zoom. On mobile, primary and secondary stack and may become full width. Never use a button for navigation when a link is appropriate.

### Hero

Two-column desktop composition: copy occupies 5–6 columns, image occupies 6–7 columns and fades leftward with a CSS mask/gradient into the canvas. No copy overlays the focal face or landmark. Mobile stacks copy first, then a 220px image crop with the same fade. Contains eyebrow only when it adds non-promotional context, h1, lead, primary CTA and secondary CTA.

### Step card

Three numbered cards with a small outlined icon, title, short copy, and a visible number. On desktop, arrows are decorative separators; on mobile they become a vertical rule. The sequence is `Set a budget` → `See what fits` → `Read the plan`.

### Feature card

Four equal cards for `Why Khondi is different`: transparent estimates, budget-first thinking, practical day plans, and honest limitations. Use icons plus headings; never rely on color alone. If the About “Who it's for” row is retained, it is a separate editorial row and awaits product approval for its final copy.

### Featured-destination band

A wide two-column surface: New Orleans image or approved placeholder on the left, copy on the right, `$3,000` and `2 adults · 4 days, 3 nights` as chips, and `Explore a $3,000 New Orleans example`. Use a faint fleur-de-lis watermark as CSS geometry or an approved inline SVG, never as content.

### Budget bar

The visual centrepiece of the example page. Show `$3,000 total` above a proportional segmented bar, with a two-column legend below on desktop and a stacked legend on mobile:

| Category | Party total | Share |
| --- | ---: | ---: |
| Flights | $900 | 30% |
| Hotel | $1,050 | 35% |
| Food and drink | $450 | 15% |
| Activities | $350 | 11.7% |
| Getting around | $250 | 8.3% |
| **Total** | **$3,000** | **100%** |

Keep the existing accessible HTML table in the DOM, with caption, row headers, descriptions and Total/Budget/Remaining rows. The bar is `aria-hidden="true"` or separately labelled as a summary; never make the chart the only way to understand the split. Keep the exact disclosure and no-buffer sentence adjacent.

### Day cards / timeline

Four cards, one per day, each with a numbered marker, approved title, and the existing activity bullets. Desktop uses a two-by-two grid; mobile uses one column. Avoid inventing times or per-item prices. A vertical teal rule may connect markers but is decorative.

### Trust note

The existing `IllustrativeNote` becomes a warm note card with a small information icon and text. Use it before the budget bar and again near any independent money block. It must remain readable without color and never be hidden behind a tooltip.

## 5. Annotated page boards

The following are text-based annotated boards for implementation and review. “Fold” means the initial viewport, not a hard content limit.

### Landing `/`

**1280px desktop**

`[sticky header: mark | Home Example trip How it works About | Plan my trip]`

`[hero: 5-col copy] Your budget, your trip / lead / [Plan my trip] [Explore a $3,000 New Orleans example] | [7-col fading travel image]`

Below: `From budget to trip` heading block plus three horizontal step cards; centered `Why Khondi is different` plus four feature cards; featured-destination band; footer.

**768px tablet**

Header keeps logo and CTA, nav may wrap to a second row only if each target remains 44px. Hero is 45/55 split with reduced image height. Step cards are 3 columns with 16px gaps; feature cards are 2×2; destination band remains two columns.

**375px mobile**

Header is two rows only when menu is open. Hero copy is full width, buttons stack, image follows at 220px. Step cards are one column with a vertical connector. Feature cards are one column. Destination band stacks image then copy. Section padding is 64px 0.

**320px narrow mobile**

The same order as 375px; reduce horizontal padding to 16px and h1 to about 40px. Long CTA wraps within the button without clipping. No card has fixed width; budget/feature grids collapse to one column.

### New Orleans `/trips/new-orleans-example`

**1280px desktop**

Compact photo hero: h1 `New Orleans for $3,000`, lead, trip chips, and trust note. Immediately below, a full-width budget band with bar, legend, and accessible table. Then assumptions in a quiet two-column card, four day cards, “Why this works” feature row, not-included note, and footer. No map.

**768px tablet**

Hero image is a shallow right-side crop; chips wrap. Budget legend becomes two columns and table remains horizontally readable without overflow by allowing normal word-boundary wrapping. Day cards are 2×2.

**375px mobile**

Hero stacks; budget total is prominent; bar is 16px high; legend is a list with amount and percentage; table is a normal responsive table with wrapped descriptions. Day cards one column. Keep the trust note before the first money block.

**320px narrow mobile**

Budget legend and table labels wrap at spaces, never mid-word. Use `min-width: 0`, `overflow-wrap: break-word`, and no fixed table cell widths. The total row stays visible. Day titles may occupy multiple lines.

### About `/about`

**1280px desktop**

Reuse the landing hero treatment with mission-first copy, then four “How Khondi is different” cards, a three-step `From budget to a real trip plan` row, an optional approved “Who it's for” row, mission band, and closing CTA. The closing CTA uses only approved labels.

**768px tablet**

Hero is stacked if the image would make the copy too narrow. Feature cards are 2×2; steps remain three columns with compact copy; mission band uses two columns.

**375px / 320px mobile**

Single-column reading order. The optional audience row comes after the product explanation, never before it. Closing CTA is full width. At 320px the mission band has no side-by-side layout and no decorative watermark that competes with text.

### Budget starter `/plan`

**1280px desktop**

Centered two-column composition: left progress/step explanation, right form card. Form fields: total budget, travelers, days, origin, interests. The primary action advances locally; the form remains browser-only. A small sample link points to the example.

**768px tablet**

Form card is full width under the progress explanation. Two related numeric fields may share a row only if labels remain clear; otherwise stack.

**375px / 320px mobile**

One column, 16px gutters, 48px inputs and buttons. Progress is a compact three-step label row that wraps safely. Validation summary receives focus, errors are linked with `aria-describedby`, and the exact T0010 copy is preserved. On step 2, the sample-estimate note and the New Orleans card appear before the CTA.

## 6. Asset plan

No asset below is approved or claimed as already sourced/generated. Before implementation, record the actual source URL, licence or generation event in a follow-up asset log.

| Asset | Proposed source / licence path | Crop | Alt text |
| --- | --- | --- | --- |
| Landing hero | Commission/licence an original editorial travel photograph, or generate an original illustration and label it as illustration. Store locally. | 16:10 desktop focal point right; 4:3 mobile | “Sunlit street and balconies suggesting a relaxed city trip” (replace with literal description of approved asset) |
| New Orleans hero | License a commercially usable New Orleans street image from a provider with documented rights, or use an original illustration. | 3:2 desktop; 4:3 mobile; avoid identifiable private people | Literal approved description, e.g. “Colorful French Quarter buildings in New Orleans” |
| Four day-card images | Prefer one licensed local set or no images; do not imply itinerary verification. | 4:3, consistent focal treatment | Literal scene description plus “illustrative trip image” when illustration is used |
| About image | Reuse the approved landing asset only if its licence allows reuse; otherwise use CSS texture. | 5:4 editorial crop | Literal scene description |
| Fleur-de-lis | Inline original SVG/CSS mark created for Khondi, decorative and `aria-hidden`. | Scales to band width | Empty alt; decorative |
| Favicon | Derived from the Khondi K/fleur mark as a local SVG/PNG. | 1:1, high contrast at 16px | Not exposed as page content |

If an AI image is chosen, use this proposed prompt only after explicit generation: “Editorial travel illustration for a budget-first trip planner, warm off-white paper, restrained teal and ochre, calm city street, generous negative space on the left for headline, no text, no logos, no recognizable person, premium magazine composition.” Mark the result as illustration in the asset log and alt text when a realistic reading could be misleading. Do not describe it as generated until the tool output exists.

## 7. Interaction and reduced motion

- Header remains sticky but never traps focus. Menu opens on activation, closes on Escape and restores focus to its trigger.
- Buttons and links have hover, pressed, focus-visible, and current states; focus is not removed by animation.
- Budget bar has no animated count-up. If segment reveal is used, it is a short opacity/transform transition and the table is immediately available.
- Step connectors and image fades are decorative. Content order is unchanged when motion is disabled.
- `prefers-reduced-motion: reduce` disables smooth scrolling, parallax, image zoom, card lift, and staged reveals.
- Form validation moves focus to the error summary; no error depends on color or motion.
- At 200% text zoom and 320px width, content reflows to one column with no horizontal scroll.

## 8. Handoff inventory

Shared: `PageContainer`, `SiteHeader`, `BrandMark`, `SiteFooter`, `ButtonLink`, `TrustNote`, `SectionHeading`.

Landing/About: `Hero`, `StepCard`, `FeatureCard`, `FeaturedDestinationBand`, `MissionBand`.

Example: `TripHero`, `TripChip`, `BudgetBar`, `CostTable`, `DayCard`, `WhyThisWorks`, `NotIncluded`.

Plan: `ProgressHeader`, `BudgetFormCard`, `Field`, `ErrorSummary`, `SampleDestinationCard`.

Implementation note: keep the current route copy, fixture, footer sentence, CSS Modules approach, and system font stacks. This handoff proposes visual composition and token changes only; it does not authorize route, data, or application changes.

## 9. Design-fidelity acceptance criteria

- Header, main sections, and footer share the same `.container` left edge at all four widths.
- Approved copy, labels, `$3,000` total, five exact category amounts, `2 adults`, `4 days / 3 nights`, and sample-estimate disclosures are unchanged.
- Landing, example, About, and budget starter boards are represented at 1280, 768, 375, and 320px with the specified order and collapse behavior.
- Budget bar is proportional and visually prominent, but the accessible table remains authoritative and all descriptions wrap at word boundaries.
- No horizontal overflow at 320px; all targets are at least 44×44px; focus is visible; keyboard order follows reading order.
- Contrast is verified with automated tooling after implementation; text uses the listed AA-safe pairs and color is never the only cue.
- No remote fonts, image hosts, analytics, cookies, social links, maps, or invented data are introduced.
- Asset log records the actual licence/source or actual generation output before any photo is shipped.
- Reduced-motion behavior is tested, and the Product Owner reviews the visual direction before implementation begins.

## 10. Required review sequence

1. Claude reviews this handoff against the brief and updates T0014/T0015 plus the follow-up restyle scope for About and the example.
2. Product Owner reviews the visual direction and the asset strategy.
3. Only after approval does implementation begin in a separate task/PR.
