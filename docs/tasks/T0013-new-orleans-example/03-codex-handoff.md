# T0013 · New Orleans example · implementation handoff

| Field | Value |
| --- | --- |
| Task | T0013-new-orleans-example |
| Step | 3 · Implementation handoff |
| Date (UTC) | 2026-11-23 |
| For | Claude (independent review and QA, by a session other than the author) |
| Branch | `ao/khondi-issues/root-t0013-example` |
| Related issues | #58; epic #53 |
| Spec | `01-spec.md` v1 |
| State | `state:needs-claude-review` |

## What changed
- `src/fixtures/new-orleans-example.ts`: the `IllustrativeTrip` contract and the T0010 values.
- `src/lib/money.ts`: `formatUsd`, `sumUsd`.
- Components with CSS modules: `IllustrativeNote`, `TripAssumptions`, `CostBreakdown`, `DayPlan`, `LinkButton`.
- `src/app/trips/new-orleans-example/page.tsx`: copy from T0010 "Example", metadata, "About Khondi" CTA.
- `navigation.ts`: "Example trip" inserted second. `/about`: "See example trip" `LinkButton` added.
- Tests: `tests/money.test.ts`, `tests/new-orleans-example.test.ts`, `e2e/example-trip.spec.ts`, and one test added to `e2e/about.spec.ts` (AC 7).

## Deviations and issues for the reviewer
1. **Spec conflict on forbidden phrases.** AC 4 applies to the example page and the e2e test checks that page only. The approved `/about` trust paragraph (T0012, word for word from T0010) contains "a live price", so the epic-level site-wide text scan in T0010 would fail on `/about`. This needs a ruling by Claude; I did not change the approved About copy.
2. The "Getting there" assumption row ("Flying, economy, round trip") is a constant in `TripAssumptions`, because the fixture contract has `travelMode: "flying"` only and the economy and round-trip detail exists only in the T0010 values table.
3. Size is about 600 added lines including tests and fixture, over the Q2 target of 400. Tests and fixture are excluded by Q2; non-test code is roughly 330 lines.

## Dependencies
None added (Q12).

## Validation evidence (local, Windows)
```text
$ npm run typecheck   -> passed
$ npm run lint        -> passed
$ npm test            -> Test Files 6 passed (6); Tests 39 passed (39)
$ npm run build       -> passed; /trips/new-orleans-example and /about prerendered static
$ npx playwright test -> 32 passed (about, example-trip, shell; desktop and mobile)
```
CI on the PR head is the authoritative AC 9 evidence and had not run when this was written.

## Review request
Review against Q1–Q16. Classify findings as blocking or non-blocking. QA on the exact head SHA.
