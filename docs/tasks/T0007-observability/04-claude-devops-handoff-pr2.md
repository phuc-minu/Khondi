# T0007 · Observability (PR 2 of 3) · Claude (DevOps) → Codex handoff

| Field | Value |
| --- | --- |
| Task | T0007-observability |
| Step | 4 · Implementation handoff (PR 2: collector, Grafana and the stack check; spec items 9–12) |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (independent code review and QA) |
| Date (UTC) | 2026-11-22 04:30 |
| Branch | `claude/T0007-collector`, stacked on `claude/T0006-diagnostics` at `6fb4232` (PR #69) |
| Commit reviewed | `de342f6` (implementation; this file is added in the next commit) |
| PR | Draft, opened with this file; base is the T0006 PR 2 branch until #69 merges |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

**Base note.** Phil merged PR 1 (#71) into its base branch `claude/T0006-diagnostics` on 2026-11-22 at 03:45 UTC, before Codex reviewed it. PR 1's changes now travel inside #69. This PR's diff against its base is PR 2 only. The PR 1 handoff ([03](03-claude-devops-handoff.md)) still needs Codex's review, which can be done on #69's diff.

## What changed
- `docker compose up` now also starts `otel-collector` and `lgtm`. The api and worker send traces and logs to the collector, which forwards them to Tempo and Loki inside `lgtm`. Grafana answers on `127.0.0.1:3001`.
- No app waits for either service. A missing collector loses telemetry, never a request or a job, and the CI stack job checks that.
- The CI stack job finds one api → worker trace in Tempo and both services' log lines in Loki, by trace ID, through Grafana's data-source proxy. It checks that neither contains the canary message or a `.env.example` password.

| File | Why |
| --- | --- |
| `infra/otel/collector.yaml` (new) | Spec item 9. <ul><li>OTLP/HTTP receiver on 4318 only.</li><li>`memory_limiter` (200 MiB), `attributes/redact` (deletes `http.request.header.*`, `http.response.header.*` by pattern, and `url.query`: R2 backstop), `batch`.</li><li>`otlphttp` exporter to `http://lgtm:4318`.</li><li>`health_check` on `0.0.0.0:13133`. The image has no shell, so it can't have a Compose health check; CI probes this endpoint from the `lgtm` container, and Azure will use it as the HTTP probe.</li><li>Traces and logs pipelines only; nothing sends metrics yet.</li></ul> Validated with the pinned binary's `validate --config` (exit 0). |
| `compose.yaml` | Spec item 10. <ul><li>`otel-collector`: `otel/opentelemetry-collector-contrib:0.165.0`, config mounted read-only, `127.0.0.1:${KHONDI_OTLP_HTTP_PORT:-4318}:4318`.</li><li>`lgtm`: `grafana/otel-lgtm:0.41.1`, `127.0.0.1:${KHONDI_GRAFANA_PORT:-3001}:3000`, named volume `khondi-lgtm` at `/data` (where the image keeps Grafana, Tempo and Loki data). Health check `test -f /tmp/ready`, the file the image's own start script writes once all its parts answer.</li><li>`GF_PLUGINS_PREINSTALL_DISABLED=true` on `lgtm` (see Deviations 2).</li><li>api and worker: `OTEL_EXPORTER_OTLP_ENDPOINT: ${OTEL_EXPORTER_OTLP_ENDPOINT:-}`.</li><li>No `depends_on` on either telemetry service.</li></ul> |
| `.env.example` | `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318`; commented `KHONDI_GRAFANA_PORT` and `KHONDI_OTLP_HTTP_PORT`. |
| `backend/khondi_api/settings.py` | An empty `OTEL_EXPORTER_OTLP_ENDPOINT` now means "unset" (see Deviations 3). `OptionalUrl` applies only to this field. |
| `backend/tests/test_settings.py` | Regression test, parametrized over `Settings` and `WorkerSettings`: empty → `None`, a URL → that URL. The two empty cases fail without the fix (output below). |
| `.github/workflows/quality.yml` | Spec item 11, `stack` job only. <ul><li>A `docker compose pull --quiet --ignore-buildable` step before `up` (see Deviations 4).</li><li>Step "Traces and logs reach Tempo and Loki…": collector health; `POST` with `traceparent` trace `5bf92f…4736` and message `t0007-canary-content`; wait for `complete`; then a Python check (standard library only) that polls Tempo (`/api/v2/traces/<id>`) for up to 60 s until the api's server span and the worker's consumer span are both there, asserts `job echo` descends from the server span, polls Loki for up to 30 s for lines with that `trace_id` from both services, and asserts neither body contains the canary, `khondi_app_local` or `:khondi@`.</li><li>Step "Requests and jobs still succeed with the collector stopped": stop, `POST` must be 202, job must complete, start again.</li></ul> |
| `docs/infra/local-setup.md` | Spec item 12: "Traces and logs" section (find a trace, trace → logs, a `jq` filter, no-endpoint mode, outage behavior, R1–R4 in short); measured figures in the Prerequisites table; two ports; three troubleshooting entries. The outdated "JSON logs arrive with T0007" line now describes the job log lines. |
| `docs/infra/azure-parity.md` | Spec item 12 (P12): `otel-collector` row replaces the placeholder; `lgtm` row (none in Azure); `OTEL_EXPORTER_OTLP_ENDPOINT` row; the two new host ports added to the local-only row. |

No new dependency. The two images are the ones pinned in the spec (Apache-2.0, AGPL-3.0 for Grafana/Tempo/Loki inside `otel-lgtm`, used locally only and not distributed).

## Acceptance criteria (PR 2 covers AC 1, 6, 8, 9, and the backend half of AC 2–4 on the real stack)
| # | Criterion (spec v1) | Done? | Where |
| --- | --- | --- | --- |
| 1 | Fresh `up --wait --build` starts both, Grafana on `127.0.0.1:3001` only | yes | Local run below; CI "Ports bind to 127.0.0.1" check now covers 6 ports |
| 2 | One trace across services in Grafana | api → worker yes; web in PR 3 | CI step; local runs below |
| 3 | api and worker lines in Loki by trace ID | yes | CI step; local runs below |
| 4 | No content or credentials, on the real stack | yes for api and worker | CI step's forbidden-string check, plus a negative run that fails |
| 5 | Works with the endpoint unset | yes, now also through Compose | Deviations 3; `test_otlp_endpoint_left_empty_means_no_export` |
| 6 | Collector stopped: requests and jobs succeed | yes | CI step; local run below |
| 8 | Measured RAM and start time in `local-setup.md` | yes | Measurements below |
| 9 | Parity rows; no Azure telemetry SDK | yes | `azure-parity.md`; `git grep -il azure -- backend frontend` (lockfiles excluded) finds no file |
| 10 | CI and hygiene pass on the head | **not yet** (all pass locally) | CI on the PR head |

## Commands run and real output
**Local stack** (Windows 11, Docker Desktop; `.env` from `.env.example` plus `KHONDI_PG_PORT=5433` and `KHONDI_WEB_PORT=3010`, because a Windows PostgreSQL holds 5432 and a dev server holds 3000):
```text
$ docker compose up --wait --build       # images already pulled
 Container khondi-otel-collector-1 Healthy
 Container khondi-api-1 Healthy
 Container khondi-web-1 Healthy
 Container khondi-lgtm-1 Healthy
elapsed=106s
```
**The two new CI steps,** extracted from `quality.yml` with PyYAML and run against that stack (`jq` from `ghcr.io/jqlang/jq:1.7.1`):
```text
== Traces and logs reach Tempo and Loki without content or credentials (T0007)
{"status":"Server available","upSince":"2026-11-22T03:54:12.089837623Z","uptime":"7m26.866474426s"}true
55853a5ef27f9028 khondi-api POST /v1/diagnostics/echo SPAN_KIND_SERVER 00f067aa0ba902b7
acd7c8cea9d5ec0d khondi-worker job echo SPAN_KIND_CONSUMER f0ff23d40d8c2925
f0ff23d40d8c2925 khondi-api enqueue echo SPAN_KIND_PRODUCER 55853a5ef27f9028
log streams from ['khondi-api', 'khondi-worker']
== Requests and jobs still succeed with the collector stopped (T0007)
 Container khondi-otel-collector-1 Stopped
true
 Container khondi-otel-collector-1 Started
exit=0
```
**The check can fail.** A copy with `"job finished"` added to the forbidden list:
```text
AssertionError: 'job finished' reached Tempo or Loki
```
An earlier version stopped polling at the first `job echo` span and failed when the worker's batch reached Tempo before the api's (`ValueError: not enough values to unpack (expected 1, got 0)`). The committed version waits for both.

**Query strings.** `GET /v1/diagnostics/echo/abc?token=QSECRET`: the span's `http.target` is `/v1/diagnostics/echo/abc` (the instrumentation leaves the query out of that attribute), and `docker compose logs api | grep -c QSECRET` printed `0`.

**Collector stopped, what the apps log:** one `WARNING` (`Transient error … Failed to resolve 'otel-collector'`) and one `ERROR` (`Failed to export logs batch due to timeout, max retries or shutdown.`) per batch, as JSON, from `opentelemetry.exporter.otlp.proto.http.*`. The request returned 202 and the job completed.

**The empty-endpoint bug, before the fix:**
```text
$ OTEL_EXPORTER_OTLP_ENDPOINT= docker compose up -d api
api Exited (3) 4 seconds ago
OTEL_EXPORTER_OTLP_ENDPOINT
  Input should be a valid URL, input is empty [type=url_parsing]
ERROR:    Application startup failed. Exiting.

$ pytest tests/test_settings.py            # new test, before the fix
FAILED tests/test_settings.py::test_otlp_endpoint_left_empty_means_no_export[-None-Settings]
FAILED tests/test_settings.py::test_otlp_endpoint_left_empty_means_no_export[-None-WorkerSettings]
2 failed, 5 passed in 0.20s
$ pytest tests/test_settings.py            # after
7 passed in 0.14s
```
After the fix, the same `up` with an empty endpoint started healthy (the "without" start-time runs below, where `os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"]` printed `''`).

**Measurements (issue #36), 2026-11-22:**
```text
$ docker stats --no-stream      # lgtm, collector and worker up 9 minutes, no traffic
khondi-api-1             61.98MiB
khondi-lgtm-1            797.8MiB
khondi-otel-collector-1  48.33MiB
khondi-postgres-1        33.17MiB
khondi-redis-1           9.062MiB
khondi-web-1             39.49MiB
khondi-worker-1          59.83MiB   (three later samples: 59.9-60.1MiB)
grafana/otel-lgtm:0.41.1 3.83GB
otel/opentelemetry-collector-contrib:0.165.0 525MB

# api: from `up -d --force-recreate api` to the first /healthz 200
without run 1: 8.7s   with run 1: 6.0s
without run 2: 6.0s   with run 2: 7.3s
without run 3: 5.8s   with run 3: 7.6s

# worker health check, `python -m khondi_api.worker --check`, inside the container
check 805ms / 789ms / 941ms
python -X importtime: khondi_api.worker 580 ms cumulative, arq 217 ms, khondi_api.telemetry 40 ms, khondi_api.jobs 26 ms
```
`lgtm` became healthy about 45 s after it started. `GF_PLUGINS_PREINSTALL_DISABLED`: `/data/grafana/plugins` does not exist and `GET /api/plugins?type=app` returns `[]`.

**Backend and repo-tooling,** the CI backend job's commands in `ghcr.io/astral-sh/uv:0.6.14-python3.12-bookworm-slim`, with throwaway `postgres:16.16` and `redis:7.4.12` sharing its `localhost` (log: `qa/t7b-ci.log` in the session scratchpad):
```text
== ruff check
All checks passed!
== ruff format --check
22 files already formatted
== mypy --strict
Success: no issues found in 22 source files
== pytest (CI env, real services)
TOTAL                                               496     19    96%
Required test coverage of 85% reached. Total coverage: 96.17%
71 passed, 25 warnings in 21.55s
== pytest unit tests without env vars (S6)
FAILED tests/test_api.py::test_connection_checks_close_clients - pydantic_cor...
1 failed, 48 passed, 22 deselected, 10 warnings in 5.17s
== repo-tooling
51 passed in 0.10s
```
The no-env failure is the existing one from T0006 (PR 1 follow-up 2); CI always sets the variables. A first run with the services on a separate Docker network failed `test_readyz_uses_ci_services` with 503, because that test hardcodes `localhost`; with a shared `localhost`, as in CI, it passes.

## Quality rules self-check
- **Q1, Q3:** spec items 9–12. The web's `OTEL_EXPORTER_OTLP_ENDPOINT` waits for PR 3 (item 19), because the web can't read it yet. The settings fix is needed for AC 5 through Compose (Deviations 3).
- **Q2:** +249 / −11 lines before this file, against the ~220 estimate. Most of the extra is the CI check script.
- **Q4, Q5:** nothing unfinished. The collector's health endpoint is used by the CI step.
- **Q6:** the CI script lets every error raise except Tempo's 404 while a trace is still arriving. Export failures in the apps are logged by the SDK, not hidden.
- **Q7:** the endpoint is still a typed `AnyHttpUrl`; only `""` maps to `None`.
- **Q8:** `mypy --strict` clean; no new ignores.
- **Q9:** the settings fix has a test that failed first; the CI check was shown to fail on a forbidden string.
- **Q10:** output above is real; CI not run yet.
- **Q12:** no new package. The images are the spec's.
- **Q13:** comments say why (no shell in the collector image, why Grafana must stay on 127.0.0.1, why images are pulled first).
- **Q15:** only `.env.example` values and canaries.
- **Q16:** no lint, type-check, coverage or existing CI check changed; new steps added to `stack` only, as the spec says.

## Deviations from the spec
1. **The web gets `OTEL_EXPORTER_OTLP_ENDPOINT` in PR 3, not here.** Item 10 lists web, item 19 adds it in PR 3. Passing it now would be a setting nothing reads (Q5).
2. **`GF_PLUGINS_PREINSTALL_DISABLED=true` on `lgtm`.** The image sets Grafana to download `grafana-llm-app` from grafana.com on every start. Nothing here uses it, it needs the internet at start-up, and it is third-party code we did not choose. Turning it off changes nothing else.
3. **Empty `OTEL_EXPORTER_OTLP_ENDPOINT` means unset** (`settings.py`, a change to PR 1's code). Compose passes `${OTEL_EXPORTER_OTLP_ENDPOINT:-}` as `""` when `.env` leaves it out, and `AnyHttpUrl | None` rejected `""`, so the api and worker crashed at start. That broke AC 5 and the "leave it empty" instruction. The validator applies to this field only, not `env_ignore_empty` on the whole model, so empty required settings keep failing as before.
4. **A `docker compose pull` step before `timeout 300 docker compose up`.** `lgtm` is 3.8 GB unpacked; pulling it inside the 300 s start-up timeout would make that timeout measure download speed. The existing step is unchanged.
5. **The password check looks for `khondi_app_local` and `:khondi@`, not `khondi`.** `POSTGRES_PASSWORD=khondi` is also the project, database and service-name prefix (`khondi-api`), so a bare search can't pass. `:khondi@` catches it inside any connection URL, which is how it could leak.

## Risks and known limits
- **`lgtm` uses about 800 MiB idle,** about seven times the rest of the stack together (about 210 MiB). Spec Risks 2 names the fallback: a Compose `obs` profile so it starts only on request. That is Phil's call after seeing these numbers.
- **The CI stack job downloads about 960 MB more** (lgtm, compressed, amd64, from `docker manifest inspect -v`) on every run. The job's 15-minute limit has room; if it gets tight, the fallback above also fixes it.
- **Grafana signs in everyone as admin** (spec Risks 6); bound to `127.0.0.1`, documented.
- **AGPL components** (Grafana, Tempo, Loki in `otel-lgtm`) run locally and are not shipped; Azure uses Application Insights (T0009).
- **Telemetry lags** by up to the SDK's 5 s batch delay, so the CI check polls rather than reading once.

## Follow-ups (not in this PR)
1. PR 3: the web route, web settings, `khondi-web` spans and the web → api → worker trace in this CI step.
2. If Phil finds `lgtm` too heavy: the `obs` profile (spec Risks 2).
3. The existing no-env test failure (PR 1 follow-up 2).
