# Khondi — System Architecture & ADR-001 (proposed)
**Status: PROPOSED / Gate 1 — NOT APPROVED FOR IMPLEMENTATION**  
**Version:** 0.1 · **Date:** 2026-11-17  
**Related:** [Product PRD](../product/khondi-prd.md) · [AI workflow](../ai-workflow.md)

## Architecture summary
Build a **modular monolith** with Next.js web frontend, Python/FastAPI API and explicit, testable agent state machine, PostgreSQL data store, Redis/Arq worker queue, replaceable data providers and deterministic feasibility verification. Launch the technical MVP with New Orleans. This ADR is an initial recommendation requiring Claude Architect review **and Product Owner Gate 1 approval**.

## Architecture decisions and rationale
| Layer | Proposed choice | Rationale |
|---|---|---|
| Web | Next.js + React + TypeScript; Tailwind optional | Accessible responsive flows, typed UI, maintainable components |
| API | Python + FastAPI + Pydantic | Typed, async provider-facing endpoints and shared validation |
| Runtime LLM | **Model-agnostic adapter**; vendor not selected | Benchmark candidates on tool use, grounding, latency and cost; Claude engineering role is separate |
| Agent loop | Plain Python async state machine | Explicit intake → gather → draft → optimize → verify → targeted repair → present, bounded to three repairs |
| Constraint optimizer | Deterministic Python scheduling and route-order service | Stops/time windows/routes/cost constraints handled by code; OR-Tools optional later |
| Verifier | Independent deterministic checks | No self-grading by LLM; exact feasibility and claim-source checks |
| Storage | PostgreSQL + JSONB, SQLAlchemy/Alembic; PostGIS optional | Immutable itineraries, relational integrity, provenance/eval queries, geospatial extension if needed |
| Jobs/cache | Redis and Arq | Move long agent runs out of HTTP path; cache provider results where permitted |
| Places | OSM-based / Overpass provider with interface | Free-first baseline; replacement with Google Places possible |
| Routing | OpenRouteService provider | Walking/driving road routes; **do not pretend it returns reliable streetcar transit** |
| Weather | Open-Meteo provider | Forecast capability with explicitly sourced timestamps |
| Observability | OpenTelemetry + structured logs + optional Grafana | Trace run, provider errors, token spend, constraint failures |
| Quality | pytest, integration tests, Playwright, replay agent evals | Per-PR regression evidence with independent quality review |
| Deployment | Docker Compose local; managed container host TBD | Minimal moving parts; avoid premature platform commitment |

## Logical flow
```text
Next.js UI
  -> FastAPI (trip/search/evidence/action APIs; SSE progress)
     -> agent job (Redis/Arq)
        -> Intake -> Gather via typed Tool Layer -> Draft
        -> Deterministic Constraint Optimizer -> Verifier
        -> [if violations] targeted Repair (<=3) -> Verify
        -> Immutable ItineraryVersion with citations and status
     -> PostgreSQL (TripSpec, versions, citations, runs, tool calls, violations, evals)
     -> User-facing evidence and warnings; mock PendingAction only
Tool Layer -> PlacesProvider (OSM), RoutingProvider (ORS),
              WeatherProvider (Open-Meteo), Flight/Hotel fixtures
              [future: YouTube, Google, real travel offers]
OpenTelemetry -> trace/log backend (no secrets or sensitive prompts by default)
```

## Core interfaces and contracts
- `TripSpec`: destination, date window, origin, budget, travelers, pace, must-sees and explicit hard constraints.
- `ToolResult[T]`: data or typed error; call ID, provider/source URL, fetched timestamp, TTL, provider version/ID, status (`confirmed/estimated/unknown/stale/conflicting`), units, attribution and field-level evidence.
- `Itinerary`: days, stops, sourced opening windows, transport legs, cost lines, time constraints, evidence IDs, confidence/unknown markers and lifecycle state.
- `VerificationResult`: violations with code, severity, location, evidence and remediation targets; status `Verified` only if mandatory checks pass on sufficiently supported claims.
- `AgentRun`: state, attempt count, cost, latency, token usage and trace links. `PendingAction`: *mock* human approval record, not a booking.
- Provider ports: `PlacesProvider`, `RoutingProvider`, `WeatherProvider`, `TravelOfferProvider`, `VideoProvider`, `LLMProvider`; no vendor logic in domain services.

## Verification and fail-safe rules
1. Budget: sum itemized costs in one currency plus explicit contingency; label fixture/estimated prices and never claim confirmed affordability without verified offers.
2. Travel: route duration and realistic buffers must fit between stops; unavailable transit estimates cannot be passed off as confirmed.
3. Place hours: visit within sourced valid opening windows; missing hours ⇒ unknown/needs review, not “open.”
4. Provenance: a source must support the **exact** claimed value; an ID alone does not prove factual accuracy.
5. Critical uncorrected hard violations forbid `Verified`; after max three repairs, output `Partial/Unverified` or `Infeasible` with explanations.
6. Cross-border visa claims deferred until validated with official current sources; curated static data is not authoritative approval to travel.
7. External calls, LLM calls and jobs have budget, rate, timeout and retry limits; provider failure returns typed errors.
8. A proposed booking creates a mock `PendingAction`; no payment side effects in MVP.

## Persistence model
`User` (or isolated demo identity), `Trip`, `TripSpec`, `Preference`, `ItineraryVersion` (immutable body JSONB and parent ID), `Citation` (field path and evidence), `AgentRun`, `ToolCall`, `Violation`, `PendingAction`, `EvalCase`, `EvalRun`, `EvalResult`. Enforce trip ownership at the API and query layers. Store only necessary user details; protect traces and define retention policy.

## API boundaries (illustrative, not implemented)
- `POST /api/v1/trips` create draft with typed input and validation.
- `POST /api/v1/trips/{id}/generate` create async run; SSE stream status.
- `GET /api/v1/agent-runs/{id}` status and trace summary.
- `GET /api/v1/trips/{id}/itineraries` list immutable versions.
- `GET /api/v1/trips/{id}/evidence/{citation_id}` source details.
- `POST /api/v1/trips/{id}/versions/{version_id}/edits` create version from user edits.
- `POST /api/v1/trips/{id}/mock-booking-requests` request approval; never charge.

## Evaluation and CI architecture
- New Orleans 30-case fixture suite (closures, geography traps, budgets, weather, impossible asks, missing fields, missing/stale providers).
- **Deterministic CI:** recorded provider + LLM cassettes, verified expected outputs, pytest and Playwright browser acceptance.
- **Model comparisons:** rerun cases across customer-facing LLM providers with fixed prompts, tool schemas and independent verifier; compare violations, grounding, tokens, latency and quality. Never hardcode Claude as runtime model.
- OpenTelemetry correlation spans for HTTP request, agent run, state steps, LLM, provider call and verifier check. Redact sensitive information by default.
- Stop regression after failed lint/unit/integration/eval/Playwright critical suites. Claude Senior QA must publish exact test results and artifacts.

## Security, platform and design constraints
- Never commit credentials; `KHONDI_GITHUB_TOKEN` remains in environment/authorized secret manager only.
- Intended private repository must be verified independently; current repository privacy settings are outside this ADR's implementation approval.
- Throttle/rate-limit external services and comply with OSM and ORS attribution/usage terms.
- No autonomous financial transactions. No implicit approval or automatic merges.
- Senior Designer supplies approved responsive mockups and visual assets, using **actual** OpenAI image generation for requested static imagery when available; art assets are not editable frontend source.
- Preserve future video discovery, total-trip deals and affiliate providers without implementing them prematurely.

## Alternatives and tradeoffs
- **Microservices:** reject for MVP; operational complexity without proven scaling need.
- **Multi-agent autonomous swarm:** reject for MVP; explicit state machine supports auditability and evals.
- **Single LLM prompt without verifier:** reject for trust/safety reasons.
- **Exclusive Claude customer-facing runtime:** reject until comparable benchmark; Claude is assigned architecture, code review and QA engineering roles.
- **Paid Google maps/routes from day one:** defer; build provider-swappable OSM/ORS abstractions first.
- **Full Azure infrastructure before demo:** defer hosting choice until costs, security and operating needs are known.

## Implementation plan — proposed small PR sequence
All steps below are **BLOCKED until Product Owner Gate 1 approval** of this ADR and implementation plan.
1. Scaffold Next.js, FastAPI, PostgreSQL and Docker Compose, lint/build/pytest/Playwright smoke, basic OpenTelemetry.
2. Define typed contracts and evidence envelope, local New Orleans fixtures and cassette replay.
3. Build OSM/ORS/Open-Meteo adapters with attribution, timeouts, quota limits, fallback errors and cache.
4. Implement TripSpec intake, Postgres models/migrations, agent job and SSE status.
5. Implement plan/draft/optimizer/verifier/repair state machine, explicitly bounded.
6. Build New Orleans itinerary UI, citation/trace view, warnings and save/edit flow; apply Senior Designer approved designs.
7. Integrate risk-based QA, 30-case evaluations, Playwright E2E and the independent verifier scoreboard.
8. Security/privacy/operational review, stable demo and documented release checklist.

## Human approval gates
**Gate 1:** ChatGPT requirements + Senior Designer concepts + Claude Architect's ADR and implementation plan → Product Owner explicit approval. No Codex implementation before approval. **Gate 2:** Codex draft PR → Claude independent code review → Claude Senior QA real Playwright/pytest/eval evidence and designer visual checks → Claude merge gate (no owner code review; [D0001](../decisions/D0001-claude-merges-code.md), [merge policy](../merge-policy.md)). Hard-boundary items and every deployment require the Product Owner's separate explicit approval.
