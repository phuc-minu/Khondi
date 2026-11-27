# Khondi — Product Requirements Document (PRD)
**Status:** Proposed for Product Owner review (Gate 1). **Version:** 0.1 · **Date:** 2026-11-17

## Product vision
Khondi makes vacation planning trustworthy, practical and affordable by using grounded provider evidence, deterministic feasibility verification and user-controlled trip editing. The wider product roadmap expands from a reliable trip planner to budget-first destination discovery, video inspiration, live travel-deal comparisons, affiliate commerce and event-driven replanning.

## Target audience and representative scenario
- Primary persona: budget-conscious family traveler wanting a practical, family-friendly itinerary, transparent cost assumptions, and fewer planning mistakes.
- First demo and evaluation location: **New Orleans, Louisiana, USA** (replaces Tokyo as canonical evaluation city).
- Reference traveler: family of 3 departing Bay Area airports (SFO/SJC/OAK), budget around **$4,000**; budget and origin are **illustrative**, not live pricing commitments.
- Initial technical MVP scope: one city, **1–5 days**, 1–4 travelers. No real bookings, payments, multi-city trips or mobile apps.

## Core user journeys (P0)
1. **Trip intake:** Set destination, dates/date flexibility, departure/origin, number of travelers, budget/currency, pace, interests, and must-sees. Request missing *hard* fields rather than guessing.
2. **Grounded discovery:** Find New Orleans attractions and operating hours through OSM-based data, routes via OpenRouteService and weather via Open-Meteo. Make sources, timestamps, uncertainty and limitations visible.
3. **Itinerary planning:** Produce a structured, editable day-by-day schedule with cost lines, time windows, transport legs and evidence citations.
4. **Constraint checking:** Deterministic Python verification evaluates budget, opening-hours coverage, route feasibility, pacing and evidence validity. Unknown/stale data is not silently treated as confirmed.
5. **Repair:** Bounded plan–verify–repair loop (up to 3 targeted repair attempts). Label results `Verified`, `Partial/Unverified` or `Infeasible`; do not label partial outputs verified.
6. **Review and save:** Show itemized estimated costs, why choices were made, warnings and evidence links; let users edit and save plans with immutable versions.
7. **Booking mock:** A simulated action may create a `PendingAction`; no real spending or booking functionality in the MVP.

## Functional requirements & acceptance criteria
| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-01 | Typed trip intake | Validates dates, 1–4 travelers, budget/currency and hard constraints; prompts for missing essentials. |
| FR-02 | Replaceable provider tools | Places, opening hours, routing and weather behind interfaces; typed errors, attribution, TTL and evidence states. |
| FR-03 | Structured planner | Returns valid itinerary schema; each actionable factual field includes supporting provenance or an explicit unverified marker. |
| FR-04 | Deterministic verifier | Calculates exact budget sums and buffer; checks routes/time windows/operating hours; flags missing evidence rather than passing it. |
| FR-05 | Bounded repair | Up to 3 attempts, targeted changes only; unresolved hard violations prevent a `Verified` status. |
| FR-06 | Evidence UI | Clicking a citation reveals provider, fetched time, tool call and limitations; stale/fixture data visibly labeled. |
| FR-07 | Versioned trip | Save, edit and compare itinerary revisions; user ownership enforced. |
| FR-08 | No autonomous purchases | Mock booking always stops at owner/user approval state and cannot initiate real payment. |
| FR-09 | End-to-end QA | Playwright New Orleans intake → planner → verification → evidence → save; pytest and agent regression suite required. |
| FR-10 | Explainability | Explain constraints, tradeoffs and why a plan is verified, partial or infeasible without presenting LLM opinion as proof. |

## Nonfunctional requirements
- **Trust:** Zero critical hard violations tolerated among plans labeled verified; 100% evidence coverage for factual claims shown as confirmed. Independent checker in evals.
- **Performance:** Record plan latency p50/p95, tool calls, retries and token cost. Initial evaluation goals (not guarantees): p50 under 60 seconds and average model cost under $0.30 per plan.
- **Reliability:** Explicit provider errors, bounded retries, caching subject to source rules, and deterministic recorded replay for CI.
- **Privacy & security:** Protect account/trip ownership and sensitive preferences; never log secrets; minimize personal data; avoid collecting passport numbers. Separate real services from fixtures.
- **Accessibility:** Responsive Next.js interface, keyboard and screen-reader navigation, visible focus, adequate contrast, reduced motion, clear error/uncertainty states.
- **Observability:** Correlate request → agent run → tool call → verifier → UI via trace IDs. Redact sensitive content.

## Evaluation plan
Start with 30 New Orleans-focused cases: closures/unknown hours, geography traps, tight budgets, rainy outdoor activities, impossible requests, missing fields and provider failures. Compare (A) one prompt/no tools, (B) tools/no verifier, (C) planner+verifier+repair. Track hard violations, evidence coverage/accuracy, repair attempts, model cost, latency and preference fit. Maintain **two modes**: full LLM+tool cassette replay for deterministic CI and model-in-loop repeated evaluations for behavior measurement.

## Priorities and staged releases
- **MVP / P0:** New Orleans intake, grounded providers, planner, deterministic verification, bounded repair, citations, save/versions, trace view, test harness.
- **P1:** Better constraint optimization, map interaction, YouTube destination Video Explorer, richer family preferences and user-owned trip drafts.
- **P2:** Total-trip multi-destination discovery, live flight/hotel offers, affiliate links with disclosures, what-if and event-driven replanning.
- **Later:** Cross-city collaboration, commercial integrations, optional premium features.

## Key metrics
Verified itinerary completion rate; critical violation rate; factual grounding accuracy; time-to-first-plan p50/p95; cost per plan; itinerary edit/save rate; user trust/clarity feedback. Future deal/commerce metrics: complete trip search completion, qualified referrals and conversion without influencing organic ranking.

## Decisions / constraints
Confirmed: Python backend, PostgreSQL, Next.js/React/TypeScript; OpenStreetMap/OpenRouteService first through provider interfaces; New Orleans demo; intended private GitHub repo. **Customer-facing runtime LLM remains provider-neutral** and must be selected by eval; Claude owns architecture/code review and Senior QA roles, Codex implements, ChatGPT acts as Product Manager, Senior Designer uses authorized OpenAI image generation for visual concepts when available.

## Open questions for Product Owner / Claude ADR
- Confirm minimum five-day reference trip and whether initial flow requires authentication or a demo user.
- Decide how unknown hours and pricing estimation impact final labels; propose strict `Verified` labeling.
- Confirm approved deployment host and API quotas; do not assume free hosted services are unlimited.
- Decide detailed visual direction and preferred first-screen interaction after Senior Designer produces options.

## Approval and handoff
**Gate 1:** Product Owner must approve this PRD, the architecture/ADR, implementation steps, and design artifacts before Codex development. **Gate 2 (since 2026-11-23):** After independent Claude code review, Claude Senior QA Playwright/test/eval evidence, and designer visual review, Claude merges under the [merge policy](../merge-policy.md); the Product Owner no longer reviews code ([D0001](../decisions/D0001-claude-merges-code.md)) but still approves hard-boundary items. No auto-merge or auto-deploy.
