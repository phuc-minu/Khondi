# T0007 · Observability · Spec

| Field | Value |
| --- | --- |
| Task | T0007-observability |
| Step | 1 · Spec (Gate 1 proposal; design in T0002 v1, three additions flagged below) |
| Author | Claude (architect) |
| For | Phil (approval by merging), then Claude as DevOps (implementation), with Codex as independent reviewer |
| Date (UTC) | 2026-11-21 22:25 |
| Spec version | v1 |
| Related | [T0002 v1](../T0002-local-infra-azure-parity/01-spec.md) row T0007, P2, P3, P9, P10, P12, AC 7; issue #36; T0004 (#64), T0005 (#66), T0006 (#68, #69), all in review; T0011 (website shell, Codex) |

## Goal
Make one request visible end to end on Phil's computer:
- the web app, api and worker each send traces to an OpenTelemetry collector, which forwards them to a local Grafana (`grafana/otel-lgtm`);
- a request through web → api → worker shows up in Grafana as **one trace**;
- the api and worker write JSON log lines that carry the same trace ID, and those lines can be found in Grafana from the trace;
- no secret, credential or user content appears in any span or log line, and a test proves it.

In Azure, only the collector's exporter changes (P9). No application code changes.

## Context
- **Approved in T0002 v1.**
  - The T0007 row covers OpenTelemetry in the api, worker and web, JSON logs with the trace ID, collector config, `grafana/otel-lgtm` and a redaction test.
  - P9 says apps export OTLP to `OTEL_EXPORTER_OTLP_ENDPOINT` and write JSON logs to stdout, and that application code never imports an Azure telemetry SDK.
  - The default `docker compose up` starts the telemetry pair, with Grafana on port 3001.
  - AC 7: a request through web → api → worker appears in local Grafana as one trace, its JSON log lines share the trace ID, and neither contains secrets.
- **Issue #36** asks for:
  - structured logs, a collector and a lightweight local dashboard;
  - correlation across Next.js, api, worker and tool calls;
  - redaction verified;
  - startup and resource overhead documented;
  - logs and traces that are easy to find.
- **From T0006 (#68, #69):**
  - every job takes a W3C `traceparent` argument;
  - `POST /v1/diagnostics/echo` queues `echo` and passes the caller's `traceparent` on as received;
  - `new_traceparent()` fills in a missing one.

  T0006 Risks 2 said T0007 would only change where the value comes from. This spec does that.
- **No logger exists yet.** Q14 requires "the shared JSON logger with the trace ID", so this task creates it.
- **The web app makes no call to the api yet.** A web → api → worker trace needs one, so this spec adds a small diagnostics route to the web app (Risks 1).
- **T0007 starts only after T0006's two PRs merge**, unless Phil asks for it to be stacked on #69. Claude implements, Codex reviews, Phil merges.

## Design

### What goes where
```text
web (Next.js, @vercel/otel) ──fetch + traceparent──▶ api (FastAPI) ──Arq job + traceparent──▶ worker
     │ spans                                             │ spans, JSON logs                       │ spans, JSON logs
     └──────────────── OTLP/HTTP ──────────────▶ otel-collector ──OTLP──▶ lgtm (Tempo, Loki, Grafana :3001)
stdout: JSON log lines from web, api and worker (docker compose logs), each with trace_id and span_id
```

- **Service names:** `khondi-web`, `khondi-api` and `khondi-worker`. Each also sends `deployment.environment` = `ENVIRONMENT`.
- **One setting.** `OTEL_EXPORTER_OTLP_ENDPOINT` is optional in all three typed settings modules (P2, P3).
  - When it is unset, tracing still runs, so log lines still carry trace IDs, but nothing is exported. Native runs, unit tests and CI's backend job need no collector.
  - When it is set, spans (and api and worker logs) go there over OTLP/HTTP.
- **Telemetry never breaks the app.** Export runs in the background with the SDK's batch processors. A collector that is down or slow loses telemetry, never a request or a job. Nothing waits for the collector to be healthy.
- **Sampling:** every trace locally (the SDK default, parent-based always-on). Azure sampling is decided in T0009.
- **Health endpoints are not traced or logged** (`/healthz`, `/readyz`, `/api/healthz`). Compose polls them every 5 s, and they would bury real traces.

### Redaction rules
These rules apply to every span and log line, now and in later tasks. Cite them as `R1` to `R4` in reviews.

- **R1 No content.** Spans and logs never carry request or response bodies, job arguments or results, prompts, or LLM output. They carry IDs, route templates, status codes, durations, job names and try counts.
- **R2 No credentials.** No header values, no cookies, no URL query strings, and no connection URLs.
  - The JSON log formatter also masks any `scheme://user:password@` it finds in a message or exception text, as a backstop.
  - The collector deletes `http.request.header.*`, `http.response.header.*` and `url.query` attributes, as a second backstop that also holds in Azure.
- **R3 No personal data.** No client IP addresses. Uvicorn's access log is turned off because it prints them; the api writes its own request line instead (method, route template, status, duration, trace ID).
- **R4 Library logs follow the same rules.** Arq's worker log prints job arguments, so the `arq` loggers are raised to `WARNING` and `log_results=False` is set. The traced job wrapper writes the start and end lines instead.

### PR 1: Backend tracing and JSON logs
1. **Dependencies** (`backend/pyproject.toml`, `uv.lock`): `opentelemetry-api`, `opentelemetry-sdk` and `opentelemetry-exporter-otlp-proto-http` at 1.45.2, and `opentelemetry-instrumentation-fastapi` at 0.66b2 (see Dependencies).
2. **Settings:** `OTEL_EXPORTER_OTLP_ENDPOINT: AnyHttpUrl | None = None` in `Settings` and `WorkerSettings`.
3. **`backend/khondi_api/telemetry.py`:**
   - `setup_telemetry(service_name, environment, endpoint) -> None` installs a tracer provider and the W3C propagator. If `endpoint` is set, it adds batch exporters for traces and logs.
   - It installs the JSON log handler on the root logger, the `uvicorn` loggers and the OTLP log bridge, and raises the `arq` loggers to `WARNING` (R4).
   - It runs once per process and is called from the api's startup and the worker's `main`.
4. **JSON log formatter** (in the same module): one JSON object per line with `timestamp` (UTC ISO 8601), `level`, `logger`, `message`, `service`, `environment`, `trace_id` and `span_id` (from the current span, empty outside one), and any `extra` fields. It applies the R2 URL mask to `message` and to exception text.
5. **api** (`main.py`, `Dockerfile`):
   - `FastAPIInstrumentor` instruments the app, excluding `/healthz` and `/readyz`, with no header capture.
   - One `INFO` request line per non-health request, as R3 describes.
   - Uvicorn runs with `--no-access-log`.
6. **Trace context to the worker** (`diagnostics.py`, `tracecontext.py`):
   - `POST /v1/diagnostics/echo` now writes the **current span's** context into the job's `traceparent` with OpenTelemetry's propagator. The incoming header is handled by the instrumentation, so a valid header continues the caller's trace and a missing or invalid one starts a new trace, as in T0006.
   - The queueing step gets its own `PRODUCER` span, `enqueue echo`, with the job ID.
   - `new_traceparent()` and its test are removed, because nothing uses them any more (Q5). `parse_traceparent()` stays for the job's input validation.
7. **Traced jobs** (`jobs.py`, `worker.py`):
   - A `traced_job` decorator that every job in `JOBS` uses. It:
     - reads the job's `traceparent` argument and starts a `CONSUMER` span `job <name>` as its child, with the job ID and try number;
     - records an exception and an error status on the span when the job raises, then re-raises (Q6);
     - writes `job started` and `job finished` log lines with the job name, ID, try and duration, never the arguments (R1, R4);
     - keeps the function's `__qualname__`, because Arq registers jobs by that name.
   - The worker sets `log_results=False`.
8. **Tests** (`backend/tests/test_telemetry.py`, plus updates to the T0006 tests):
   - **Unit**, with the SDK's in-memory span exporter and a captured log stream:
     - a log line is valid JSON with all the fields above, and inside a span it carries that span's trace and span IDs;
     - `redis://:SUPERSECRET@host` and `postgresql://u:SUPERSECRET@host` in a message or exception come out masked;
     - a request to `/healthz` makes no span and no log line;
     - a request with a `traceparent` header gives a server span in that trace, and the request log line carries the same trace ID;
     - `setup_telemetry` with no endpoint exports nothing and still sets trace IDs.
   - **Integration** (CI backend job Redis, burst worker):
     - the worker's `job echo` span has the api's `enqueue echo` span as its parent, so all spans share one trace ID;
     - a job that raises gives a span with error status and the exception;
     - **the redaction test:** a request with the message `t0007-canary-content` and a `REDIS_URL` holding the password `SUPERSECRET` leaves neither string in any captured span attribute, event or log line, including Arq's own loggers.

### PR 2: Collector, Grafana and the stack check
9. **`infra/otel/collector.yaml`:**
   - receiver `otlp` (HTTP 4318 only);
   - processors `memory_limiter`, `attributes/redact` (the R2 deletions) and `batch`;
   - exporter `otlphttp` to `http://lgtm:4318`;
   - the `health_check` extension.
10. **Compose:**
    - **`otel-collector`:** `otel/opentelemetry-collector-contrib:0.165.0`, the config mounted read-only, host port `127.0.0.1:${KHONDI_OTLP_HTTP_PORT:-4318}:4318` for native runs.
    - **`lgtm`:** `grafana/otel-lgtm:0.41.1`, Grafana at `127.0.0.1:${KHONDI_GRAFANA_PORT:-3001}:3000`, named volume `khondi-lgtm` for its data (T0002: "named volumes for PostgreSQL data and Grafana"). `scripts/dev-reset.py` already lists every volume in the project, so it needs no change.
    - **api, worker, web:** `OTEL_EXPORTER_OTLP_ENDPOINT: ${OTEL_EXPORTER_OTLP_ENDPOINT:-}`. `.env.example` sets `http://otel-collector:4318`.
    - Neither the apps nor the collector use `depends_on` with a health condition on the telemetry services; see "Telemetry never breaks the app".
11. **CI `stack` job** (no other job changes, Q16). After the T0006 steps:
    1. `POST /v1/diagnostics/echo` on the api with a fixed `traceparent` and the message `t0007-canary-content`, and wait for `complete`.
    2. Poll Tempo's trace API, through Grafana's data-source proxy on `127.0.0.1:3001`, for that trace ID for up to 60 s. Check it has spans from `khondi-api` and `khondi-worker`, and that `job echo` is a descendant of the api's server span.
    3. Query Loki the same way for log lines with that `trace_id`. Check there is at least one from each service.
    4. Check that neither the trace JSON nor the log lines contain `t0007-canary-content` or any password from `.env.example`.
    5. Stop `otel-collector`, send another request, and check it still returns 202 and completes. Then start it again.
12. **Docs:**
    - **`docs/infra/local-setup.md`:**
      - how to find a trace in Grafana by trace ID, and jump from a trace to its logs;
      - `docker compose logs api worker` with a `jq` filter on `trace_id`;
      - R1 to R4 in short;
      - measured overhead: RAM of `otel-collector` and `lgtm` after 5 minutes idle, and api start time with and without an endpoint (issue #36);
      - troubleshooting: no traces in Grafana; Grafana port in use.
    - **`docs/infra/azure-parity.md` (P12):**
      - `otel-collector` → Container App, no ingress, same image, exporter switched to Azure Monitor in T0009;
      - `lgtm` → none; Application Insights and Log Analytics replace it;
      - `OTEL_EXPORTER_OTLP_ENDPOINT` → the collector's internal URL;
      - `KHONDI_GRAFANA_PORT` and `KHONDI_OTLP_HTTP_PORT` → local only.

### PR 3: Web tracing and the web → api → worker trace
13. **Dependencies** (`frontend/package.json`, `package-lock.json`): `@vercel/otel` 2.3.0 and its required OpenTelemetry peer packages, at the newest versions inside its peer ranges (see Dependencies).
14. **Settings** (`frontend/src/settings.ts`): optional `OTEL_EXPORTER_OTLP_ENDPOINT` (a URL) and `DIAGNOSTICS_ENABLED` (boolean, default false).
15. **`frontend/src/instrumentation.ts`:** after the existing settings check, `registerOTel` with service name `khondi-web`, the endpoint from settings (no exporter when unset), and **trace headers sent only to `API_BASE_URL`**, so later calls to third-party providers never receive Khondi trace IDs.
16. **`frontend/src/log.ts`:** a JSON line logger with the same fields as the backend's, written with `process.stdout.write` (Q14 forbids `console.log`), taking `trace_id` and `span_id` from the active span.
17. **`POST /api/diagnostics/echo`** (`frontend/src/app/api/diagnostics/echo/route.ts`, addition, see Risks 1):
    - Returns 404 unless `DIAGNOSTICS_ENABLED` is true.
    - Parses the body with zod (`message` 1–200 characters, `delay_seconds` 0–30), forwards it and any `Idempotency-Key` to `${API_BASE_URL}/v1/diagnostics/echo`, parses the api's answer with zod, and returns it (Q7).
    - If the api is unreachable or answers with something other than 202, it returns 502 `{"detail": "api unavailable"}` and logs the status, never the URL or body.
    - Writes one request log line (R1–R3).
18. **Tests** (vitest):
    - the route returns 404 when disabled, 422 for invalid bodies, and 502 without the URL when the api fails;
    - it forwards the body and `Idempotency-Key`, and returns the api's job ID;
    - the logger writes valid JSON with the trace ID inside an active span and masks a URL password (R2).
19. **Compose and CI:** the web service gets `DIAGNOSTICS_ENABLED` and `OTEL_EXPORTER_OTLP_ENDPOINT`. The PR 2 stack step now starts with the `POST` on the **web** route (port 3000), and also checks the trace has `khondi-web` spans with the api's server span as their child. That is T0002 AC 7.
20. **Docs:** the `curl` example in `local-setup.md` goes through the web route; parity rows for the web's two new settings.

**Out of scope**
- Metrics and dashboards beyond Grafana's built-in trace and log views. Nothing in T0002 or #36 asks for them yet.
- Database spans (SQLAlchemy or asyncpg instrumentation). The api runs no queries outside `/readyz` yet; the first feature task (#2) adds them, under R1 (no SQL parameters).
- Browser-side tracing. Only the Next.js server is traced.
- The "traced New Orleans mock planning run" from #36. No planning run exists until #2. `echo` stands in for it, and #2's first job inherits `traced_job`.
- The Azure collector exporter and sampling (T0009). Compose-wide integration tests and Playwright (T0008).

## Acceptance criteria
1. On a fresh clone with `.env` from `.env.example`, `docker compose up --wait --build` starts `otel-collector` and `lgtm` with the rest of the stack, and Grafana answers on `127.0.0.1:3001` only.
2. A `POST /api/diagnostics/echo` on the web app with a `traceparent` header produces one trace with that trace ID in Grafana, holding spans from `khondi-web`, `khondi-api` and `khondi-worker` in parent-child order (T0002 AC 7).
3. The api and worker log lines for that request are JSON, carry the same `trace_id`, and can be found in Grafana's log view by that ID. The web's log line carries it on stdout.
4. No span or log line contains a request body, job argument, header value, query string, client IP or credential (R1–R4). The canary test passes in pytest and on the real stack.
5. With `OTEL_EXPORTER_OTLP_ENDPOINT` unset, the api, worker and web start and work, and their log lines still carry trace IDs.
6. With the collector stopped, requests and jobs still succeed.
7. `/healthz`, `/readyz` and `/api/healthz` produce no spans and no log lines.
8. `local-setup.md` states the measured RAM of the telemetry pair and the api's start time with and without telemetry (#36).
9. Every new service and setting has its row in `azure-parity.md` (P12), and no Azure telemetry SDK is imported anywhere (P9).
10. Backend CI (ruff, `mypy --strict`, pytest ≥85 % coverage), frontend CI (lint, typecheck, vitest) and the extended `stack` job pass on each PR's head commit, and diff hygiene passes.

## Test plan
| AC | Type | What it proves |
| --- | --- | --- |
| 1, 2, 3, 4, 6 | CI `stack` job steps | One trace across three services in Tempo, correlated logs in Loki, no canary or password anywhere, collector outage harmless |
| 2, 3, 4, 5, 7 | pytest unit and integration (in-memory exporter) | Parent-child spans api → worker, log format and trace IDs, masking, health exclusion, no-endpoint mode |
| 2, 4, 5 | vitest | Web route behavior, trace header scope, logger format and masking |
| 8, 9 | Claude review of docs against measured output | Overhead is measured, not guessed; parity map complete |
| 10 | CI run links | Pipeline green on all three PRs |

## Dependencies
Each is pinned exactly; reasons, alternatives and licenses go in each PR's handoff (Q12). All are Apache-2.0 unless stated.

| Package or image | Version | Released | Why |
| --- | --- | --- | --- |
| `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp-proto-http` | 1.45.2 | 2026-10-29 | Traces and logs over OTLP/HTTP. HTTP rather than gRPC avoids the `grpcio` wheel. |
| `opentelemetry-instrumentation-fastapi` | 0.66b2 | 2026-10-29 | Server spans and incoming `traceparent`. The `b` is the contrib project's normal version scheme, not a pre-release of a stable line. |
| `@vercel/otel` (MIT) | 2.3.0 | 2026-11 | The setup Next.js documents for its `instrumentation.ts`, with fetch propagation that can be limited to one URL. Its peers pin the OpenTelemetry JS 2.x line (`sdk-trace-base`/`resources` 2.12.1, `api-logs` 0.223.2, `api` 1.10.0). |
| `otel/opentelemetry-collector-contrib` | 0.165.0 | 2026-11-07 | Collector with the `attributes` processor (T0002 Dependencies) |
| `grafana/otel-lgtm` | 0.41.1 | 2026-11-20 | Tempo, Loki and Grafana in one local container (T0002) |

No new Python package beyond these; Arq, Redis and FastAPI stay as they are.

## Risks and open questions
1. **Addition: a web diagnostics route.** AC 2 (T0002 AC 7) needs the web app to call the api, and nothing does yet.
   - **Risk:** another unauthenticated route that queues work.
   - **Mitigations:** off unless `DIAGNOSTICS_ENABLED=true` in the web's own settings; same bounds as the api route; it can only reach `API_BASE_URL`; Azure dev keeps it off.

   **Merging this spec approves it.** The alternative is to drop PR 3's route and prove web → api propagation in vitest only, which leaves T0002 AC 7 unproven on the real stack.
2. **Addition: the telemetry pair starts by default.** T0002 approved this. `grafana/otel-lgtm` is the heaviest local container (Tempo, Loki, Prometheus and Grafana in one). PR 2 measures it. If it pushes the stack past what Phil's computer handles comfortably, the fallback is a Compose `obs` profile, which would be a small follow-up for Phil to approve.
3. **Addition: rules R1 to R4.** They bind later tasks, especially #2's agent and provider code. Merging this spec makes them review rules alongside Q1–Q16 and P1–P12.
4. **The Python logs SDK is still under `opentelemetry.sdk._logs`.** Its API can change between minor versions. Only `telemetry.py` imports it, and stdout JSON keeps working if the bridge has to be removed.
5. **`@vercel/otel` follows the OpenTelemetry JS 2.x line,** one major version behind. The alternative, `@opentelemetry/sdk-node` set up by hand, is more code to own. If `@vercel/otel` stops keeping up, that switch stays inside `instrumentation.ts`.
6. **Grafana in `otel-lgtm` lets anyone on the machine in as admin without a password.** It is bound to `127.0.0.1` and holds only local telemetry. It is not part of Azure.
7. **Frontend overlap with T0011.** Codex's website shell also edits `frontend/`. PR 3 touches only `settings.ts`, `instrumentation.ts`, two new files and the lockfile. Whichever merges second rebases; the lockfile is regenerated, not hand-merged.
8. **R2's URL mask is a backstop, not a guarantee.** A secret written to a log in some other shape would not be caught. The real protection is R1 and R2 at the call site, which Claude's reviews check.

## Size
Estimated changed lines, excluding lockfiles:

| PR | Code | Tests | Compose / CI / config | Docs / parity | Total |
| --- | --- | --- | --- | --- | --- |
| 1 | ~170 | ~180 | ~5 | 0 | ~355 |
| 2 | 0 | 0 | ~150 | ~70 | ~220 |
| 3 | ~110 | ~110 | ~25 | ~15 | ~260 |

## Approval request
Phil, please approve spec **v1** of T0007 by merging this spec PR. Merging is the Gate 1 approval, and it includes:
- the web diagnostics route behind `DIAGNOSTICS_ENABLED` (Risks 1);
- the telemetry pair in the default stack, as T0002 approved (Risks 2);
- redaction rules R1–R4 as standing review rules (Risks 3);
- the three-PR split and the dependencies above.

Implementation starts after T0006's PRs (#68, #69) merge, or stacked on #69 if you ask. Claude implements, Codex reviews, and you merge. Nothing here touches Azure.
