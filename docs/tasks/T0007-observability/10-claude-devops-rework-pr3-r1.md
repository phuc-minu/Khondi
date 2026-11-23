# T0007 · Observability (PR 3) · Claude (DevOps) rework · round 1

| Field | Value |
| --- | --- |
| Task | T0007-observability |
| Step | 10 · Rework, round 1 (PR 3) |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (re-review) and Phil |
| Date (UTC) | 2026-11-22 17:00 |
| PR | #73 |
| Commit after rework | `81b1ffa` (fix); this file is added in the next commit |
| Responds to | Phil's blocking comment of 2026-11-22: "I will not approve #73 while its malformed-202 response handling remains unresolved." No review file carries it, so it is named **P3-R1** here. |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

## Response to each finding
| ID | Action | Commit | Notes |
| --- | --- | --- | --- |
| P3-R1 | fixed | `81b1ffa` | See below. |

**What was wrong.** In `frontend/src/app/api/diagnostics/echo/route.ts`, a 202 from the api went straight to `enqueued.safeParse(await response.json())`. If the 202's body could not be read as JSON, `response.json()` threw out of the route. That covers a body that is not JSON, an empty body, a connection dropped mid-body, and the 5 s timeout firing while the body arrives. Next.js then answered 500 and the route's request line was never written. That breaks spec item 17 (502 `{"detail": "api unavailable"}` for any api failure; one request log line per request) and Q6 (an error case escaping instead of being handled). My earlier test covered only a 202 with valid JSON of the wrong shape.

**The fix.** The 202 path now has three separate steps:
1. A status other than 202 is logged as `api did not queue the job` with `api_status`, then 502. This is unchanged.
2. Reading the body:
   - a `SyntaxError` (not JSON, or empty), a `TypeError` (connection cut) or a `TimeoutError` gives a `WARNING` `api answer unreadable` with `api_status: 202` and `error_type`, then 502;
   - any other error is re-thrown (Q6);
   - the body itself is never logged (R1).
3. A body that is JSON but not a job (zod) gives a `WARNING` `api answer was not a job`, then 502.

In every case the request line is still written. `networkErrorType()` now classifies the network and timeout errors for both the request and the body read, so the two catch blocks can't drift apart.

**Tests** (`frontend/tests/diagnostics-echo.test.ts`). A real local HTTP server plays the api, and `tests/helpers.ts` gains `RawBody` so it can send a raw body or cut the connection after part of it.

Each case below must answer 502 `{"detail": "api unavailable"}`, log the warning with the right `error_type` followed by the request line with status 502, and leave neither the canary message nor the api's address in the logs.

| 202 body | Expected `error_type` |
| --- | --- |
| `<html>t0007-canary-content</html>` | `SyntaxError` |
| empty | `SyntaxError` |
| `{"job_id": "j-` with 100 promised bytes missing, then the connection closed | `TypeError` |

**Not separately tested:** a timeout while reading the body. It goes through the same `networkErrorType` branch as the dropped connection. A test would need a server that stalls past the fixed 5 s timeout, and making the timeout configurable only for a test would be a setting nothing else uses (Q5).

## Commands run and real output
`frontend/`, Node 24.19.0.

**Before the fix** (new tests only):
```text
     × answers 502 and logs both lines when a 202 body is not JSON 6ms
     × answers 502 and logs both lines when a 202 body is empty 4ms
     × answers 502 and logs both lines when a 202 body is cut off mid-body 4ms
 FAIL  ... when a 202 body is not JSON
SyntaxError: Unexpected token '<', "<html>t000"... is not valid JSON
 FAIL  ... when a 202 body is empty
SyntaxError: Unexpected end of JSON input
 FAIL  ... when a 202 body is cut off mid-body
TypeError: terminated
Caused by: SocketError: other side closed
```
**After:**
```text
$ npx vitest run
 Test Files  4 passed (4)
      Tests  31 passed (31)
$ npx tsc --noEmit
tsc=0
$ npx next lint --max-warnings=0
✔ No ESLint warnings or errors
```
CI on the new head: not run at the time of writing; the result goes in a PR comment.

## Anything else changed
- The warning for a 202 that is JSON but not a job now reads `api answer was not a job` instead of sharing `api did not queue the job` with non-202 statuses, so the three failure kinds can be told apart in logs. No test or doc depended on the old wording.
- Size: +68 / −7 (route +27/−5, tests and helper +41/−2).
