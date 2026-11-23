# T0007 · Observability (PR 3 of 3) · Claude (DevOps) → Codex handoff

| Field | Value |
| --- | --- |
| Task | T0007-observability |
| Step | 9 · Implementation handoff (PR 3: web tracing and the web → api → worker trace; spec items 13–20) |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (independent code review and QA) |
| Date (UTC) | 2026-11-22 16:35 |
| Branch | `claude/T0007-web`, stacked on `claude/T0007-collector` at `98f32d6` (PR #72) |
| Commit reviewed | `d2c2bbf` (implementation; this file is added in the next commit) |
| PR | Draft, opened with this file; base is the PR 2 branch until #72 merges |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

**Numbering.** This file is `09` because the re-review of #69 that Codex was asked to write is `08-codex-review-pr1-r2.md`, on `claude/T0006-diagnostics`. Taking `09` avoids two files with the same number once the branches meet.

## What changed
- The Next.js server is traced as `khondi-web`. A `POST /api/diagnostics/echo` to the web app continues the caller's `traceparent`. One trace then runs from the web's request, through its `fetch` to the api, the api's request, `enqueue echo`, and the worker's `job echo` (T0002 AC 7).
- Spans are exported only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, and trace headers go only to `API_BASE_URL`.
- The web writes JSON log lines to stdout with the backend's fields and the active `trace_id`.
- The CI `stack` step now starts at the web route on port 3000. It requires the api's server span to descend from a `khondi-web` span, and the web's request line to carry the trace ID.

| File | Why |
| --- | --- |
| `frontend/package.json`, `package-lock.json` | Spec item 13: `@vercel/otel` 2.3.0 and its seven required peers (see Dependencies and Deviations 1). |
| `frontend/src/settings.ts` | Spec item 14: `OTEL_EXPORTER_OTLP_ENDPOINT` (optional URL) and `DIAGNOSTICS_ENABLED` (`"true"`/`"false"`, default false). An empty string counts as unset, for the reason PR 2 fixed on the backend. `z.coerce.boolean()` was not used because it reads `"false"` as true. |
| `frontend/src/telemetry.ts` (new) | Spec item 15's configuration, plus two things it needed (Deviations 2 and 3). <ul><li>`telemetryConfig(settings)` is the `registerOTel` configuration. Service `khondi-web`, `deployment.environment`. **Explicit `spanProcessors`**: none without an endpoint; with one, `BatchSpanProcessor(RedactingSpanExporter(OTLPHttpProtoTraceExporter(<endpoint>/v1/traces)))`. Fetch propagation: `propagateContextUrls: [API_BASE_URL + "/"]` and `dontPropagateContextUrls` for everything else.</li><li>`RedactingSpanExporter` / `redactSpan`, matching the backend's: query strings stripped from span names and `http.target`, `http.url`, `url.full`; header, client-address and user-agent attributes dropped; status message dropped; URL credentials masked.</li><li>`SkipHealthChecks`, the sampler: parent-based always-on, except a SERVER span whose `http.target` is `/api/healthz` is not recorded (AC 7).</li></ul> |
| `frontend/src/instrumentation.ts` | After the existing settings check, `registerOTel(telemetryConfig(settings))`, in the Node.js runtime only. |
| `frontend/src/log.ts` (new) | Spec item 16: `log(level, logger, message, fields)` writes one JSON line with `process.stdout.write`. It takes `trace_id`/`span_id` from the active span and masks URL credentials in the message. |
| `frontend/src/app/api/diagnostics/echo/route.ts` (new) | Spec item 17. <ul><li>404 unless `DIAGNOSTICS_ENABLED`.</li><li>Body parsed with a strict zod schema (`message` 1–200, `delay_seconds` 0–30), and the `Idempotency-Key` checked against the api's pattern. Anything invalid, including non-JSON, gets 422 `{"detail": "invalid request"}`, so a client mistake doesn't look like an api failure.</li><li>Forwards the body and key to `${API_BASE_URL}/v1/diagnostics/echo` with a 5 s timeout, and parses the 202 answer with zod.</li><li>Unreachable api (network error or timeout), any other status, or an unexpected answer gives 502 `{"detail": "api unavailable"}`. It logs one `WARNING` with the error type or the api's status, never the URL or body.</li><li>One `khondi_web.request` line per request: method, route, status, duration.</li></ul> |
| `frontend/tests/helpers.ts` (new) | A real `node:http` server standing in for the api or a third party, and a stdout capture that parses JSON lines with zod. |
| `frontend/tests/diagnostics-echo.test.ts` (new) | Spec item 18, route part. <ul><li>404 when disabled.</li><li>422 for six invalid bodies and a bad key, with nothing sent to the api.</li><li>Body and `Idempotency-Key` forwarded, and the api's job returned.</li><li>502 when the api refuses, is unreachable, or answers something else. The logs then contain neither the canary nor the api's address.</li><li>The request line's fields, with no content.</li></ul> |
| `frontend/tests/telemetry.test.ts` (new) | Spec item 18, the rest, using the **production `telemetryConfig`** with an in-memory exporter behind the production `RedactingSpanExporter`. <ul><li>`traceparent` reaches the api server and not a server on `localhost`. That test fails if the `dontPropagateContextUrls` rule is removed (output below).</li><li>Log lines carry the active span's IDs, are empty outside a span, and mask a URL password.</li><li>Exported spans lose query strings, headers, client data and status text.</li><li>The sampler drops `/api/healthz` SERVER spans and keeps others.</li><li>No exporter without an endpoint.</li></ul> |
| `frontend/tests/settings.test.ts` | The two new settings: empty means unset or false, `"true"`/`"false"` are read correctly, and other values are rejected by name. |
| `compose.yaml`, `.env.example` | Spec item 19: the web gets `DIAGNOSTICS_ENABLED` and `OTEL_EXPORTER_OTLP_ENDPOINT`. Comments now name the web too. |
| `.github/workflows/quality.yml` | Spec item 19, the PR 2 step only. <ul><li>The `POST` goes to `http://127.0.0.1:3000/api/diagnostics/echo`.</li><li>The Tempo poll also waits for a `khondi-web` SERVER span, and checks that the api's server span has a `khondi-web` ancestor.</li><li>`docker compose logs web` must hold a `khondi_web.request` line with the trace ID, and no canary.</li></ul> |
| `docs/infra/local-setup.md`, `azure-parity.md` | Spec item 20. <ul><li>The `curl` example goes through the web route.</li><li>The web added to "Traces and logs", with the `jq` filter now covering `web`. A note that trace headers stay inside Khondi.</li><li>Web RAM figure added.</li><li>Parity rows: the web row, `OTEL_EXPORTER_OTLP_ENDPOINT` (api, worker, web), `DIAGNOSTICS_ENABLED` (api, web).</li></ul> |

## Dependencies (Q12)
All pinned exactly in `package.json` and `package-lock.json`. `npm install` added 16 packages in total.

| Package | Version | License | Why | Alternatives considered |
| --- | --- | --- | --- | --- |
| `@vercel/otel` | 2.3.0 (2026-11-05) | MIT | The setup Next.js documents for `instrumentation.ts`. Includes the OTLP/HTTP exporter and fetch instrumentation with URL-scoped propagation. | `@opentelemetry/sdk-node` set up by hand: more code to own (spec Risks 5). |
| `@opentelemetry/api` | 1.9.1 | Apache-2.0 | Required peer; also used directly (`trace`, `SpanKind`). | 1.10.0 (the spec's figure) conflicts with the SDK packages (Deviations 1). |
| `@opentelemetry/sdk-trace-base` | 2.12.1 | Apache-2.0 | Required peer; also used directly (`BatchSpanProcessor`, samplers, `InMemorySpanExporter` in tests). | — |
| `@opentelemetry/resources` | 2.12.1 | Apache-2.0 | Required peer | — |
| `@opentelemetry/sdk-metrics` | 2.12.1 | Apache-2.0 | Required peer (no metrics are exported) | — |
| `@opentelemetry/api-logs`, `@opentelemetry/sdk-logs` | 0.223.2 | Apache-2.0 | Required peers (no logs are exported over OTLP from the web) | — |
| `@opentelemetry/instrumentation` | 0.223.2 | Apache-2.0 | Required peer. It brings `import-in-the-middle` 3.6.0 (Apache-2.0) and `require-in-the-middle` 8.0.1 (MIT). | — |

`npm view @vercel/otel@2.3.0 peerDependenciesMeta` is empty, so all seven are required, not optional.

## Acceptance criteria (PR 3 covers the web half of AC 2–5 and 7, and AC 10)
| # | Criterion (spec v1) | Done? | Where |
| --- | --- | --- | --- |
| 2 | One trace web → api → worker in Grafana, in parent-child order | yes | CI step (now from the web route); local run below |
| 3 | Web log line carries the trace ID on stdout | yes | CI step; `log lines` tests; local run below |
| 4 | No body, query, header value, client IP or credential in web spans or lines | yes | `exported spans` and route tests; local query-string probe below |
| 5 | Works with the endpoint unset; trace IDs still in log lines | yes | `export` and `settings` tests (empty endpoint means no processor); log lines use the active span whether or not anything is exported |
| 7 | `/api/healthz` makes no spans or lines | yes | `sampling` tests; Tempo search on the real stack below. The healthz route writes no log line. |
| 10 | Frontend CI, the extended `stack` job and hygiene pass on the head | **not yet** (all pass locally) | CI on the PR head |

## Commands run and real output
`frontend/`, Node 24.19.0 locally. The web image's own `npm ci` and `next build` on `node:22.13.1-alpine` also succeeded in the stack run.
```text
$ npx tsc --noEmit
tsc=0
$ npx next lint --max-warnings=0
✔ No ESLint warnings or errors
$ npx vitest run
 Test Files  4 passed (4)
      Tests  28 passed (28)
```
**The header-scope test needs the rule.** With `dontPropagateContextUrls: []`, run once and then restored:
```text
 FAIL  tests/telemetry.test.ts > trace context > is sent to the api and to no one else
AssertionError: expected '00-57cbc63ee46b57f247c7b1e8b7f0b47b-c…' to be undefined
      Tests  1 failed | 5 passed (6)
```
**The real stack** (`.env` from `.env.example` plus `KHONDI_PG_PORT=5433` and `KHONDI_WEB_PORT=3010`, because a Windows PostgreSQL holds 5432 and a dev server holds 3000). `docker compose up --wait --build` brought all seven services up healthy in 176 s. Then the two T0007 CI steps, extracted from `quality.yml` with PyYAML, with `127.0.0.1:3000/` swapped for `3010/`:
```text
== One trace from web to worker reaches Tempo and Loki without content or credentials (T0007)
{"status":"Server available",...}true
2f65d4f56dae6652 khondi-web executing api route (app) /src/app/api/diagnostics/echo/route SPAN_KIND_INTERNAL b88c4f6b44b29dfb
3e5125846b8a1e22 khondi-web resolve page components SPAN_KIND_INTERNAL b88c4f6b44b29dfb
4e5c22196c65069f khondi-web fetch POST http://<api>/v1/diagnostics/echo SPAN_KIND_CLIENT 2f65d4f56dae6652
7291b37eba21a27a khondi-worker job echo SPAN_KIND_CONSUMER 9f71a162eb6058fa
9f71a162eb6058fa khondi-api enqueue echo SPAN_KIND_PRODUCER f02ee063be560161
b88c4f6b44b29dfb khondi-web POST /src/app/api/diagnostics/echo/route SPAN_KIND_SERVER 00f067aa0ba902b7
c46417cc99b42e63 khondi-web start response SPAN_KIND_INTERNAL b88c4f6b44b29dfb
f02ee063be560161 khondi-api POST /v1/diagnostics/echo SPAN_KIND_SERVER 4e5c22196c65069f
log streams from ['khondi-api', 'khondi-worker']
{"timestamp":"2026-11-22T16:17:29.404Z","level":"INFO","logger":"khondi_web.request","message":"request","service":"khondi-web","environment":"local","trace_id":"5bf92f3577b34da6a3ce929d0e0e4736","span_id":"2f65d4f56dae6652","method":"POST","route":"/api/diagnostics/echo","status":202,"duration_ms":28.7}
== Requests and jobs still succeed with the collector stopped (T0007)
 Container khondi-otel-collector-1 Stopped
true
 Container khondi-otel-collector-1 Started
exit=0
```
The web's server span continues the caller's span (`00f067aa0ba902b7`), and the api's server span is the child of the web's `fetch` span.

In the `fetch` line, `<api>` stands for `api:8000`. Gitleaks' `generic-api-key` rule reads `api:` followed by the hex span ID as a key, so the host is shortened here.

**Query strings, user agent, health checks** on the same stack:
```text
$ curl -X POST "http://127.0.0.1:3010/api/diagnostics/echo?token=QSECRET" -H "User-Agent: probe-agent/9" ...
post with query: 202
QSECRET in trace: 0  probe-agent: 0
# web server span attributes, as stored in Tempo
{'next.span_type': 'BaseServer.handleRequest', 'http.method': 'POST', 'http.target': '/api/diagnostics/echo', 'http.status_code': '202', 'next.route': '/src/app/api/diagnostics/echo/route', ...}
# Tempo, last 10 minutes, after more than a minute of Compose health checks every 5 s
$ TraceQL {resource.service.name="khondi-web" && span.http.target=~"/api/healthz.*"}
{"traces":[],...}
```
**`jq` filter from `local-setup.md`,** on the real logs:
```text
["khondi-web","khondi_web.request","request"]
["khondi-api","khondi_api.request","request"]
["khondi-worker","khondi_api.jobs","job started"]
["khondi-worker","khondi_api.jobs","job finished"]
jq exit=0
```
`docker stats`: `khondi-web-1 43.63MiB` idle with telemetry (41 MiB before T0007). The QA stack was taken down with `docker compose down --volumes`; its `khondi-pgdata` and `khondi-lgtm` volumes did not exist before the run.

**Diff hygiene:**
```text
$ python scripts/check_diff_hygiene.py origin/claude/T0007-collector
Diff hygiene: no violations.
```

## Quality rules self-check
- **Q1, Q3:** spec items 13–20, plus the two additions in Deviations 2 and 3, which R2 and AC 7 require. No unrelated changes.
- **Q2: over the guideline.** +698 / −24 excluding `package-lock.json`: code 280 (`telemetry.ts` 153), tests 369, config and docs 49. The spec estimated ~260. What it missed:
  - the web's span redaction and health sampler (Deviations 2, 3), about 100 lines of code and 60 of tests;
  - tests against real HTTP servers instead of a stubbed `fetch`. A stub would bypass the instrumented `fetch`, so the header-scope test would prove nothing.

  Splitting would ship web tracing that exports query strings and health-check spans, so I kept it together.
- **Q4, Q5:** nothing unfinished. Every export is used: `HEALTH_PATH` by the sampler; `redactSpan` by the exporter and indirectly by tests.
- **Q6:** the route catches only `SyntaxError` (bad JSON), `TypeError` (network) and `DOMException` `TimeoutError`; anything else is re-thrown. Each caught case is answered, not hidden.
- **Q7:** request body, `Idempotency-Key` and the api's answer are parsed with zod; settings too.
- **Q8:** `strict` TypeScript; no `any`, `as` casts, non-null `!` or ignores. The test helper narrows `server.address()` instead of casting.
- **Q9:** every behavior has a test; the propagation test was shown to fail without its rule.
- **Q10:** output above is real; CI not run yet.
- **Q11:** `log.ts` mirrors the backend's line format, and `telemetry.ts` mirrors `RedactingSpanExporter` in `backend/khondi_api/telemetry.py`.
- **Q12:** see Dependencies.
- **Q13:** comments say why (explicit processors, the "don't" rule, the empty-string rule, the sampler).
- **Q14:** no `console.*`; the logger writes JSON lines.
- **Q15:** only canaries and `.env.example` values.
- **Q16:** no lint, type-check or test setting changed.

## Deviations from the spec
1. **`@opentelemetry/api` is 1.9.1, not 1.10.0, and there are seven peers, not four.**
   - `@vercel/otel` 2.3.0 requires seven OpenTelemetry peers (`peerDependenciesMeta` empty), and the spec's table named four.
   - The SDK 2.12.1 packages it needs (`resources`, `sdk-trace-base`, `sdk-logs`, `sdk-metrics`, `core`) all declare `@opentelemetry/api` `<1.10.0`, so npm refused 1.10.0 (`ERESOLVE … peer @opentelemetry/api@">=1.3.0 <1.10.0" from @opentelemetry/resources@2.12.1`). 1.9.1 is the newest version every peer range accepts.
2. **Web spans are cleaned at export** (`RedactingSpanExporter`), like the backend in PR 1.
   - Next.js names its server span `<METHOD> <url>` and sets `http.target` to the URL, query string included.
   - The fetch instrumentation puts the full URL in `http.url` and in the span name.
   - Without cleaning, R2 would fail for any request with a query string. The collector's backstop deletes only `url.query` and headers.
3. **A sampler skips `/api/healthz` server spans.** AC 7 requires no health-check spans, and Next.js traces every request, so Compose's 5-second health check would otherwise make a trace every 5 s. Children of a skipped span are skipped too (parent-based).
4. **`spanProcessors` is explicit rather than using `traceExporter`.** `@vercel/otel`'s default `"auto"` reads `OTEL_EXPORTER_OTLP_ENDPOINT` from the environment itself, bypassing the typed settings (P2). It also falls back to `localhost:4318` when the variable is unset. Explicit processors make "no exporter when unset" true.
5. **Trace-header scope needs two rules.** Besides `propagateContextUrls`, the instrumentation always adds headers to plain-http `localhost` URLs, so `dontPropagateContextUrls` matches every URL not starting with `API_BASE_URL/`.

## Risks and known limits
- **Spans named after file paths.** Next.js 15.5 names the route's spans after its file path (`POST /src/app/api/diagnostics/echo/route`), not the URL path. `http.target` and the log line carry `/api/diagnostics/echo`. This is cosmetic, and changing it would mean renaming Next.js's spans.
- **Resource attributes from `@vercel/otel`:** `cloud.provider` and `vercel.runtime` (values for a non-Vercel host), plus `node.env` and `process.runtime.name`. Harmless, but they show in Grafana.
- **Web logs are not exported over OTLP,** only stdout, as the spec says (AC 3). Grafana's *Logs for this span* shows api and worker lines only.
- **`@vercel/otel` tracks OpenTelemetry JS 2.x** (spec Risks 5). The api 1.10 mismatch above is that risk showing up; a later `@vercel/otel` will need the same peer check.
- **Frontend overlap with T0011** (spec Risks 7): this PR touches `settings.ts`, `instrumentation.ts`, `package.json` and the lockfile. Whichever merges second rebases, and the lockfile is regenerated.

## Follow-ups (not in this PR)
1. If Grafana should show web log lines beside the api's, add an OTLP log exporter for the web. The spec doesn't ask for it.
2. `next lint` is deprecated in Next.js 16 (it prints a warning). Moving to the ESLint CLI is a CI change, so it needs its own approved task (Q16).
