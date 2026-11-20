# T0010 · Public website: three pages and budget-first flow · Spec

| Field | Value |
| --- | --- |
| Task | T0010-website-epic53 |
| Step | 1 · Spec (delegated Gate 1, see `02-claude-delegated-signoff.md`) |
| Author | Claude (architect), using Product Manager and Designer requirements from the issues |
| For | Codex (implementation, task by task), Senior Designer (fidelity review), Claude QA |
| Date (UTC) | 2026-11-20 15:30 |
| Spec version | v1 |
| Related | Epic #53; #54 copy, #55 visual system, #56 budget flow, #57 landing, #58 $3,000 example, #59 About, #60 plan and QA; PM brief [#54 comment](https://github.com/phuc-minu/Khondi/issues/54#issuecomment-7043160144); delegation [PR #61](https://github.com/phuc-minu/Khondi/pull/61); foundation T0003 / PR #52; related UI epic #16 (#18, #19, #20, #22, #24, #25) |

## Goal
Add a calm, budget-first public website to the existing Next.js app:
- a **Landing** page;
- a **budget starter** flow;
- an **illustrative $3,000 New Orleans trip**;
- an **About** page.

A visitor should understand the journey in seconds: **set a budget → see what fits → read a practical day-by-day plan with transparent estimated costs**. Nothing on the site may suggest live prices, bookings or verified availability.

## Context
- **Product brief.** The PM brief (#54) sets the pages, routes, copy direction and sample budget.
- **Visual direction.** #55 records the owner's preference for a minimal, airy, restrained-teal look, not a dashboard.
- **Foundation.** The Next.js app comes from **T0003 (PR #52)**, which is not merged yet. PR #52 adds `frontend/` with:
  - the App Router;
  - TypeScript strict mode;
  - ESLint (`next/core-web-vitals`, `next/typescript`);
  - Vitest (node environment) and zod;
  - npm with `package-lock.json`;
  - `output: "standalone"`.

  Nothing in this spec may start until PR #52 is on `main` (see Dependencies).
- **CI.** `.github/workflows/quality.yml` already runs:
  - the `frontend` job (`npm run lint`, `typecheck`, `test`) once `frontend/package.json` exists;
  - the `e2e` job (`npm run e2e`, Chromium) once `frontend/playwright.config.ts` exists.

  The website can therefore add Playwright **without editing CI** (Q16).
- **Owner delegation.** The owner delegated Gate 1 and Gate 2 for this website scope only (AGENTS.md, PR #61). The signoff record is `02-claude-delegated-signoff.md`.

## Scope
**In scope (whole epic, delivered as tasks T0011–T0015)**
- Static, server-rendered pages: `/`, `/plan`, `/trips/new-orleans-example`, `/about`. Shared layout, header, footer and design tokens.
- A client-side budget starter on `/plan` with typed validation. Nothing leaves the browser.
- A typed, in-repo fixture for the New Orleans example, with exact cost reconciliation tests.
- Playwright end-to-end tests (desktop and mobile viewports, keyboard, automated accessibility scan), plus Vitest unit tests for pure logic.

**Out of scope (needs the owner's normal approvals)**
- Any backend/API change.
- Calls to the T0003 api.
- Databases, auth, accounts or saved trips.
- Analytics, cookies or tracking.
- External providers or credentials.
- Live prices or availability.
- Bookings or payments.
- Maps.
- Deployment, hosting, Azure, DNS.
- Changes to CI or lint/type/test settings (Q16).
- Changes to T0003 files except where a website task must add to them, such as adding a route or editing the scaffold `page.tsx`.

**Explicitly not in v1 (product decisions, recorded here)**
- **Photography and illustrations.** The owner's three generated concept images are direction only, not assets (#55). v1 ships with typography, color and simple CSS shapes only. Imagery is a follow-up once there are licensed or original assets with alt text (Designer).
- **"Compare destinations" and multi-destination results.** No data exists. The flow offers the single New Orleans sample, says so plainly, and has no dead or disabled Compare control.
- **Editing a plan.** "Customize this trip" pre-fills the starter flow. It does not edit the itinerary.
- **Contact link and privacy page.** We have no contact channel or policy to link to (Q4: no placeholders). The footer states the site's actual data behavior instead.

## Design

### Routes and page goals
| Route | Issue | Audience goal | Primary CTA | Secondary |
| --- | --- | --- | --- | --- |
| `/` | #57 | Understand what Khondi is and how budget-first planning works | Start planning → `/plan` | See example trip → `/trips/new-orleans-example` |
| `/plan` | #56 | Try the budget → destination → plan flow | Open the sample plan → `/trips/new-orleans-example` | Back / edit answers |
| `/trips/new-orleans-example` | #58 | See a realistic budget broken down and a 4-day plan | Customize this trip → `/plan?from=new-orleans-example` | About |
| `/about` | #59 | Mission, who it's for, what's real today | Start planning → `/plan` | See example trip |

All four are statically rendered. The only interactive page is `/plan`, which is a single client component. No route fetches data at request time.

### File layout (inside `frontend/`, following T0003 conventions)
```text
src/app/layout.tsx                 root layout: <html lang="en">, skip link, SiteHeader, <main id="main">, SiteFooter, metadata
src/app/globals.css                tokens + base styles (plain CSS; no CSS framework)
src/app/page.tsx                   Landing (T0015 replaces the T0003 scaffold page)
src/app/about/page.tsx
src/app/plan/page.tsx              server wrapper + <BudgetStarter/> client component
src/app/trips/new-orleans-example/page.tsx
src/components/*.tsx + *.module.css   SiteHeader, SiteFooter, LinkButton, StepList, IllustrativeNote,
                                   CostBreakdown, TripAssumptions, DayPlan, BudgetStarter
src/content/navigation.ts          nav items (typed)
src/fixtures/new-orleans-example.ts   the illustrative trip (typed, see contract below)
src/lib/money.ts                   formatUsd(), sumUsd()
src/lib/plan-input.ts              zod schema + parse for starter inputs and ?from= prefill
tests/*.test.ts                    Vitest (pure logic only)
e2e/*.spec.ts                      Playwright
playwright.config.ts
```
- **Styling.** Use CSS Modules plus global custom properties: no Tailwind, no UI kit, no new styling dependency (Q12).
- **Fonts.** System font stacks only, so the build makes no network font fetch.

### Design tokens (`globals.css`, `:root`)
Contrast ratios below are computed on `#FFFFFF` (and on `--color-surface` where noted) with the WCAG 2.x relative-luminance formula. QA re-checks them with axe.

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--color-text` | `#1F2933` | Body and headings | 14.8:1 (13.7:1 on surface) |
| `--color-text-muted` | `#52606D` | Secondary text | 6.5:1 (6.0:1 on surface) |
| `--color-primary` | `#0F5F5C` | Deep teal: links, primary buttons, focus | 7.5:1 (6.9:1 on surface) |
| `--color-primary-hover` | `#0B4A47` | Hover/active | 10.1:1 |
| `--color-on-primary` | `#FFFFFF` | Text on primary | 7.5:1 |
| `--color-surface` | `#F4F7F6` | Section bands, cards | — |
| `--color-border` | `#D5DDDB` | Hairlines (decorative only) | — |
| `--color-accent` | `#E9E2D5` | Sand: decorative shapes only, never text | — |
| `--color-note-bg` / `--color-note-text` | `#FFF7E6` / `#6B4E00` | Illustrative-estimate notes | 7.3:1 |
| `--color-error` | `#B42318` | Field errors | 6.6:1 |
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Body | |
| `--font-serif` | `Georgia, "Times New Roman", serif` | h1–h2 (editorial feel) | |
| Type scale | 16px body / 1.6 line height; h1 `clamp(2rem, 5vw, 3.25rem)`; h2 `clamp(1.5rem, 3vw, 2rem)`; h3 1.25rem | | |
| Spacing | `--space-1..8` = 4, 8, 12, 16, 24, 32, 48, 64 px; sections use 64px (desktop) / 48px (mobile) vertical padding | | |
| Radius | `--radius-sm` 8px (buttons, inputs), `--radius-md` 12px (cards) | | |
| Layout | Content max width 1120px; reading width 68ch; side gutter 16px (<640px) / 24px | | |
| Breakpoints | 640px and 1024px (mobile-first `min-width` queries) | | |
| Focus | `outline: 3px solid var(--color-primary); outline-offset: 2px` on every focusable element; never removed | | |
| Motion | No animation in v1 beyond 150ms color transitions, disabled under `prefers-reduced-motion: reduce` | | |

### Shared components (behavior)
- **Skip link.** "Skip to main content", shown when focused. Target is `#main`.
- **SiteHeader.**
  - Contents: brand "Khondi" (text, links to `/`), then a `<nav aria-label="Main">` with the items from `src/content/navigation.ts`, then the "Start planning" button.
  - Nav items in final order: Home `/`, Example trip `/trips/new-orleans-example`, How it works `/#how-it-works`, About `/about`. Each item is added in the task that creates its target (no dead links).
  - The current route's link gets `aria-current="page"` and an underline.
  - Mobile (<640px): the nav wraps to a second row under the brand. There is no hamburger, so no client JS in the header.
  - All targets are at least 44×44px.
- **SiteFooter.**
  - Contents: the same nav links (as a list); the line "This site doesn't use cookies or analytics, and the trip planner keeps your answers in your browser."; and "© 2026 Khondi".
  - Keep the data-behavior line true. Any task that would make it false must change it and must be outside this delegation.
- **LinkButton.** An `<a>` styled as primary or secondary. Never use a `<button>` for navigation.
- **IllustrativeNote.**
  - A note box with `role="note"`. Text: "Illustrative estimate — not a quote. Prices are sample values for planning, not live fares or rates, and nothing here can be booked."
  - Placement: next to every displayed money amount block and at the top of the example page.
- **StepList.** An ordered list of the 3 steps: Set your budget / See what fits / Get a grounded plan.
- **CostBreakdown.**
  - A `<table>` with caption "Estimated costs for 2 travelers (party total)".
  - Columns: Category, What it covers, Amount. Rows come from the fixture.
  - Footer rows: Total, Budget, Remaining.
  - Amounts are right-aligned with tabular numbers.
- **TripAssumptions.** A definition list (`<dl>`) of the fixture assumptions, plus "Not included" as a list.
- **DayPlan.**
  - One `<section>` per day, with an h3 like "Day 1 — Arrive and the French Quarter" and a list of items.
  - No times, opening hours, prices per item or "verified" badges.

### Content (v1 copy, ready to build)
Codex uses this text as written. Copy edits that keep the meaning are non-material.

**Landing `/`** (`<title>`: "Khondi — Plan the right trip for your budget")
- **Hero.**
  - h1: "Plan the right trip for your budget"
  - Lead: "Start with what you want to spend, then see a practical day-by-day plan with every estimated cost laid out. Right now you can try the planner with one sample trip to New Orleans."
  - CTAs: **Start planning**; **See example trip**.
- **How it works.** Section `id="how-it-works"`, h2 "How it works". StepList:
  1. **Set your budget**: "Tell us your total budget, how many people are going and for how long."
  2. **See what fits**: "Find destinations that fit. In this early version, New Orleans is the only sample destination."
  3. **Get a grounded plan**: "Read a day-by-day plan with estimated costs and the assumptions behind each one."
- **Why Khondi is different.** h2 "Why Khondi is different". Three short items:
  - **Budget first**: "You start from your total budget, not from a flight or hotel search."
  - **Costs with their assumptions**: "Every estimate says what it covers and what it leaves out."
  - **Honest about what's known**: "When something is a sample or an estimate, we label it. We don't show prices as live or places as verified unless they are."
- **Sample trip.** h2 "Sample trip: New Orleans for $3,000". Line: "2 adults · 4 days, 3 nights · flying from the San Francisco Bay Area". Then IllustrativeNote (short form: "Illustrative estimate — not a quote."). Then a link "See the full example".

**About `/about`** (`<title>`: "About — Khondi")
- h1 "About Khondi". Lead: "Khondi helps people plan trips that fit a real budget. We focus on practical day-by-day plans and clear cost estimates, and we're upfront about what we don't know."
- h2 "Who it's for": "Families, flexible travelers and anyone who plans around a budget and wants to see where the money goes before they commit."
- h2 "What makes it different": the three points from Landing, phrased for depth:
  - "You set the total first; plans are shaped to fit it."
  - "Each cost shows what it includes and excludes."
  - "Samples and estimates are always labeled as such."
- h2 "How it works": StepList (shared).
- h2 "Where Khondi is today": "Khondi is in early development. This site shows one sample New Orleans trip with illustrative costs. Nothing here is a live price, a booking or a guarantee that a place is open or available. Khondi doesn't sell or book travel. As live data sources are added, plans will show where their information came from and how current it is."
- CTAs: **Start planning**; **See example trip**. These are added in the tasks that create their targets.

**Example `/trips/new-orleans-example`** (`<title>`: "Sample trip: New Orleans for $3,000 — Khondi")
- h1 "New Orleans for $3,000". Lead: "A sample 4-day trip for two, built to show how a total budget breaks down." Then IllustrativeNote (full form).
- h2 "Trip assumptions": TripAssumptions.
- h2 "Where the $3,000 goes": CostBreakdown.
- h2 "Day by day": DayPlan × 4. After it: "These are suggestions, not reservations. Check opening hours, prices and availability before you go."
- CTAs: **Customize this trip** (added in T0014); **About Khondi**.

**Budget starter `/plan`** (`<title>`: "Start planning — Khondi"). h1 "Start planning". The flow has three steps in one page, and only the current step is shown:
1. **Step 1 of 3 — Your budget** (`<form noValidate>` with a `<fieldset>`; required fields first).

   | Field | Control | Rule | Error text |
   | --- | --- | --- | --- |
   | Total budget (USD) | `<input inputmode="numeric">` | Required; whole dollars, 500–50,000. Commas are allowed in input and stripped before parsing. | "Enter your total budget in whole dollars, from $500 to $50,000." |
   | Travelers | `<select>` with options 1–4 | Required; default 2 | "Choose 1 to 4 travelers." |
   | Trip length | `<select>` with options 1–5 days | Required; default 4 | "Choose a trip length from 1 to 5 days." |
   | Leaving from (optional) | Text input, max 60 characters | Optional; trimmed | "Use 60 characters or fewer." |
   | Interests (optional) | Checkboxes: Food, Music, History, Outdoors, Museums | Optional | — |

   - Privacy line under the form: "Your answers stay in this browser tab. They aren't sent anywhere or saved."
   - Submit button: **See what fits**.
   - On invalid submit:
     - show an error summary at the top (`role="alert"`, h2 "Please fix the following", with links to each field);
     - set `aria-invalid` on each invalid field and link its message with `aria-describedby`;
     - move focus to the summary.
2. **Step 2 of 3 — Destinations that fit.**
   - Show one card, "New Orleans (sample)", with the text "Our only sample destination today. The sample is built for 2 travelers, 4 days and $3,000."
   - If the visitor's answers differ from the sample, add: "Your answers are different from the sample, so its costs won't match your trip. We don't adjust sample prices to your answers."
   - If the visitor's budget is under $3,000, also add: "Your budget is below this sample's $3,000 total."
   - Then the line: "More destinations aren't available yet."
   - Buttons: **Open the sample plan** (a link to the example page) and **Change my answers** (returns to step 1 with the values kept).
   - Interests are echoed back only as "You picked: …". They don't change results.
3. **Step 3** is the example page itself, so there is no third in-page step. Step headings are h2s.
   - When the step changes, move focus to the new step's h2 (`tabIndex={-1}`).
   - Update a visually hidden live region: "Step 2 of 3".
4. **Prefill.**
   - `/plan?from=new-orleans-example` pre-fills 3000 / 2 / 4 / "San Francisco Bay Area" and shows the note "Pre-filled from the New Orleans sample."
   - Any other or unknown `from` value is ignored, with no error shown.
   - Parse it with zod in `src/lib/plan-input.ts` (Q7).
5. **No-JS fallback.** A `<noscript>` message: "The planner needs JavaScript. You can still read the sample trip." plus the link.
6. **States that don't exist.** No loading, empty or network-failure states, because the page makes no requests. QA proves this with a network assertion.

### New Orleans fixture contract (`src/fixtures/new-orleans-example.ts`)
```ts
export type CostCategory = "flights" | "lodging" | "food" | "activities" | "local-transport";
export interface CostLine { category: CostCategory; label: string; covers: string; amountUsd: number } // whole USD, party total
export interface DayPlanEntry { day: 1 | 2 | 3 | 4 | 5; title: string; items: readonly string[] }
export interface IllustrativeTrip {
  slug: "new-orleans-example";
  destination: "New Orleans, Louisiana";
  status: "illustrative";              // the only allowed value in v1; never "verified" or "live"
  budgetUsd: number;
  travelers: { adults: number; children: number };
  origin: string;
  lengthDays: number; nights: number;
  timing: string;
  travelMode: "flying";
  costs: readonly CostLine[];
  notIncluded: readonly string[];
  days: readonly DayPlanEntry[];
}
```

**Values (v1).** These resolve the PM's open questions. The amounts are sample values, not quotes.

| Field | Value |
| --- | --- |
| budgetUsd | 3000 |
| travelers | 2 adults, 0 children |
| origin | "San Francisco Bay Area (SFO, OAK or SJC)" |
| lengthDays / nights | 4 / 3 |
| timing | "An off-peak week in autumn; no specific dates" |
| travelMode | flying, economy, round trip |

**Costs (party totals for 2 people).**

| Category | Label | Covers | Amount |
| --- | --- | --- | --- |
| flights | Flights | "Round-trip economy for 2, including taxes and one carry-on each" | $900 |
| lodging | Hotel | "3 nights in one room, including taxes and fees" | $1,050 |
| food | Food and drink | "Meals and tips for 2 people over 4 days" | $450 |
| activities | Activities | "Tours, music venues and museum entry" | $350 |
| local-transport | Getting around | "Airport transfers, streetcar passes and occasional rideshares" | $250 |

- **Total** $3,000. **Remaining** $0.
- **Contingency:** none. The page says: "This sample uses the full budget and has no buffer. For a real trip, keep some money aside for surprises."

**Not included:** "Travel insurance", "Checked bag fees", "Shopping and souvenirs", "Travel to and from your home airport".

**Days (no times, hours or per-item prices):**
1. "Arrive and the French Quarter": "Check in and walk the French Quarter", "Jackson Square and the riverfront", "Dinner and live music on Frenchmen Street".
2. "Garden District": "Ride the St. Charles streetcar uptown", "Walk the Garden District's historic homes", "Lunch on Magazine Street".
3. "Museums and City Park": "A morning at a museum of your choice", "Afternoon in City Park", "Evening food tour or cooking class".
4. "Last morning and departure": "Breakfast and a short riverfront walk", "Head to the airport".

**Invariants, enforced by unit tests:**
- the sum of `costs[].amountUsd` equals `budgetUsd`;
- every amount is a positive integer;
- remaining = budget − sum = 0;
- `days.length === lengthDays`;
- `nights === lengthDays - 1`;
- `status === "illustrative"`;
- category values are unique.

### Accessibility and quality bar (all tasks)
- **WCAG 2.2 AA.**
  - One h1 per page and no skipped heading levels.
  - Landmarks: header/nav/main/footer.
  - Visible focus on everything; all functionality works from the keyboard.
  - 44px minimum targets.
  - No horizontal scroll at 320px width.
  - Text can be resized to 200% without loss.
  - Errors are announced (`role="alert"`) and linked to their fields.
  - Color is never the only signal.
- **No network.** No client network requests from any page (no analytics, fonts or images from other origins).
- **Metadata.** Each page has a unique `<title>` and `meta description` through the Next `metadata` export.
- **Code quality.** All AGENTS.md rules Q1–Q16 apply. Use no `any` and no non-null `!`. Don't use `console.log`.

## Acceptance criteria (epic level; each task's spec selects its subset)
1. Each of the four routes renders with a 200 status, a unique title and exactly one h1, from `next build && next start`.
2. Every nav item and CTA leads to an existing route or anchor. Playwright follows every link on every page and checks status 200 and a matching h1.
3. The example page shows the assumptions table, every cost line, Total $3,000, Remaining $0, the not-included list and the IllustrativeNote. No text on the site contains "verified", "live price", "book now" or "guaranteed" (Playwright text scan).
4. The fixture invariants hold (Vitest). `formatUsd(3000) === "$3,000"`.
5. On `/plan`:
   - invalid inputs produce the exact error texts above, an error summary that receives focus, and `aria-invalid`;
   - valid inputs show step 2 with the correct conditional notes;
   - "Change my answers" keeps the values;
   - `?from=new-orleans-example` pre-fills;
   - unknown `from` values are ignored.
6. No network request is made from `/plan` during the whole flow, other than the page's own same-origin assets (Playwright request listener).
7. axe-core reports no violations of WCAG A/AA rules on every page at 1280×800 and 375×812. Keyboard-only users can reach and use every control in a logical order, and the skip link works.
8. At 320px width there is no horizontal overflow on any page (`document.documentElement.scrollWidth <= innerWidth`).
9. CI `frontend` and `e2e` jobs pass on the PR head commit. `npm audit --omit=dev` reports no critical or high advisories.

## Test plan (proposed; QA records actual results per task)
| AC | Type | What it proves |
| --- | --- | --- |
| 1, 2 | Playwright `e2e/navigation.spec.ts` | Routes, titles, h1s, and no dead links or CTAs |
| 3 | Playwright `e2e/example-trip.spec.ts` + text scan | Budget display, disclosures, banned words absent |
| 4 | Vitest `tests/new-orleans-example.test.ts`, `tests/money.test.ts` | Exact reconciliation, formatting |
| 5 | Vitest `tests/plan-input.test.ts` + Playwright `e2e/plan.spec.ts` | Validation rules, prefill parsing, step behavior, focus management |
| 6 | Playwright request listener in `e2e/plan.spec.ts` | Answers never leave the browser |
| 7 | Playwright + `@axe-core/playwright`, desktop and mobile projects; keyboard walkthrough | Accessibility |
| 8 | Playwright at 320px | Responsive overflow |
| 9 | CI + `npm audit` | Pipeline and dependency health |

Playwright config:
- `webServer` runs `npm run build && npm run start` on port 3000.
- `baseURL` comes from `BASE_URL` when it is set, so T0008 can point it at Compose later.
- Two projects: Desktop Chrome and a 375×812 mobile viewport (Chromium only, which matches CI).
- Retain trace and screenshot on failure in `playwright-report/`, which the CI job already uploads.

QA also captures full-page screenshots of every page at both sizes as review evidence for the Designer. They are evidence, not committed baselines.

## Delivery: small PRs, in order
Each task gets its own short `01-spec.md` that points back to this spec. Each is one draft PR under 400 changed lines, excluding lockfiles (Q2). Pages are added in an order that never leaves a dead link.

| Task | PR content | Depends on | Issues |
| --- | --- | --- | --- |
| **T0011** Site shell | Tokens, `globals.css`, root layout with skip link, SiteHeader, SiteFooter, navigation content (Home only), Playwright + axe harness and `e2e` script, Next/React patched if still needed | PR #52 merged | #55, #60 |
| **T0012** About page | `/about`, StepList, LinkButton (first use), nav item "About" | T0011 | #59 |
| **T0013** New Orleans example | Fixture, `money.ts`, IllustrativeNote, TripAssumptions, CostBreakdown, DayPlan, the page, nav item "Example trip", About's "See example trip" CTA | T0011 | #58 |
| **T0014** Budget starter | `/plan`, `plan-input.ts`, BudgetStarter, "Customize this trip" on the example, "Start planning" in header and About | T0013 | #56 |
| **T0015** Landing | Replace scaffold `/` with Landing, `#how-it-works`, nav item "How it works", cross-page link-crawl and banned-word scan | T0012–T0014 | #57, #54 |

Each later task's `01-spec.md` is written and signed off by Claude when the task before it merges. It may only narrow or restate this spec. Any material change goes back to the owner (see the signoff record).

## Dependencies
- **PR #52 / T0003 merged to `main`.** It provides `frontend/`, the `frontend` CI job, ESLint, Vitest and zod. Blocking.
- **Next.js and React must be on patched versions.**
  - The PR #52 head (`905bde2`) pins `next 15.1.6` / `react 19.0.0`.
  - `npm audit --omit=dev` on that lockfile (run by Claude on 2026-11-20) reports **1 critical, 3 high**. The findings include GHSA-9qr9-h5gf-34mp (RCE in the React flight protocol) and GHSA-f82v-jwr5-mffw (middleware authorization bypass), with a fix in `next 15.5.29`.
  - This should be fixed in PR #52. If PR #52 merges unfixed, T0011 must upgrade `next`, `eslint-config-next`, `react` and `react-dom` to patched versions within the 15.x line, and record the change under Q12.
- **New dev dependencies in T0011:**
  - `@playwright/test`: Apache-2.0. The e2e runner the existing CI job expects.
  - `@axe-core/playwright`: MPL-2.0, used unmodified as a test tool. Gives automated WCAG checks.

  No runtime dependencies are added by any task in this epic.

## Risks and open questions
- **Imagery deferred.** Pages ship text-first. The Designer may later propose licensed or original imagery as a separate in-scope task.
- **Sample values are judgment calls.** They come from the PM brief and are labeled illustrative everywhere. They are not researched prices, so the copy never cites a source or date for them.
- **Playwright overlaps with T0008.** T0011 creates the minimal harness and T0008 extends it to Compose (`BASE_URL`). Whichever lands second adapts, without weakening tests (Q16).
- **Persona difference from the PRD.** The PRD's reference persona is a family of 3 with a $4,000 budget. This site uses the PM's $3,000 / 2-adult sample. The PRD is unchanged.

## Size
- Five PRs of roughly 200–400 changed lines each, excluding lockfiles.
- T0011 adds lockfile churn for Playwright and axe.

## Approval
- Delegated Gate 1. The owner delegated approval of this bounded website spec to Claude (AGENTS.md, PR #61).
- Claude's signoff, with its scope and limits, is recorded in `02-claude-delegated-signoff.md`.
- The owner has not reviewed this spec, and nothing here should be read as saying they did.
