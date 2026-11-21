# T0003 · Service skeletons and configuration · Codex rework · round 2

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 7 · Codex rework, round 2 |
| Author | Codex (senior developer) |
| For | Claude (re-review) |
| Date (UTC) | 2026-11-20 |
| Branch | `codex/T0003-service-skeletons-config` |
| Commit after rework | Not committed; operator will commit and push |
| Responds to | `06-claude-review-r2.md` |
| State | `state:needs-claude-review` |

## Response to each finding

| ID | Action | Notes |
| --- | --- | --- |
| S1 | fixed | Restored the narrow global exemptions. Added per-rule exemptions to `Rule`, applied only to P3/P10, and added a test proving a test-path Q9 violation is still reported while a test-path P3/P10 literal is exempt. |
| S2 | fixed | Removed exception chaining from DSN validation and added a traceback regression test asserting the invalid secret is absent. |
| S3 | fixed | Moved instrumentation to `frontend/src/instrumentation.ts`, guarded validation for the Node runtime, removed the eager settings export, and removed build-stage fake environment values. Running the web app without environment values reports `ENVIRONMENT is missing or invalid`. |
| S4 | fixed | Both images now declare numeric user/group `10001:10001`; image health curls retry on connection refusal. |
| S5 | fixed | Added marked integration tests for reachable CI PostgreSQL/Redis services and for unreachable dependencies returning 503 with both dependency names. |

## Commands run and real output

`uv` and `pytest` were not available in this Windows sandbox:

```text
$ uv run pytest scripts/tests -q
uv: The term 'uv' is not recognized as a name of a cmdlet, function, script file, or executable program.

$ pytest --version
pytest: The term 'pytest' is not recognized as a name of a cmdlet, function, script file, or executable program.
```

Frontend checks:

```text
$ npm run lint -- --max-warnings=0
✔ No ESLint warnings or errors

$ npm run typecheck
> tsc --noEmit

$ npm run build
✓ Compiled successfully
✓ Generating static pages (5/5)
```

Frontend unit tests were attempted and hit the existing Windows/OneDrive runner limitation:

```text
$ npm test
X [ERROR] Cannot read directory "../../../../..": Access is denied.
X [ERROR] Could not resolve "C:\\Users\\phuct\\OneDrive\\Repo\\Khondi\\Khondi\\frontend\\vitest.config.ts"
```

The no-environment startup check produced the required non-zero configuration failure:

```text
$ npm start
Failed to prepare server Error: ENVIRONMENT is missing or invalid
```

Python syntax validation:

```text
$ python -m compileall backend/khondi_api backend/tests scripts
Listing 'backend/khondi_api'...
Listing 'backend/tests'...
Listing 'scripts'...
```

The focused hygiene assertions also passed:

```text
$ python -c "...check_line..."
S1 rule assertions passed
```

Docker image builds and the real-service integration tests were not run because Docker and `uv` are unavailable in this sandbox. CI must run the backend service job and image job from the workflow.

## Anything else changed

Only the five blocking findings in `06-claude-review-r2.md` were addressed. No commits, branches, PR operations, or changes to the unrelated untracked `.env` and `apps/` paths were made.

## R16 · frontend dependency security update

| Field | Value |
| --- | --- |
| Finding | R16 addition |
| Action | fixed |
| Scope | Upgraded `next` and `eslint-config-next` to `15.5.29`; refreshed the compatible frontend dependency set and lockfile so the audit has no high or critical advisories. |
| Compatibility fix | Updated the existing Zod error-path formatting to support Zod 4 path values without changing the configuration error contract. |

Commands and real output:

```text
$ npm audit --audit-level=high
found 0 vulnerabilities

$ npm run lint -- --max-warnings=0
> lint
> next lint --max-warnings=0

`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .

✔ No ESLint warnings or errors

$ npm run typecheck
> typecheck
> tsc --noEmit

$ npm run build
> build
> next build

   ▲ Next.js 15.5.29
   Creating an optimized production build ...
 ✓ Compiled successfully in 2.8s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/5) ...
   Generating static pages (1/5)
   Generating static pages (2/5)
   Generating static pages (3/5)
 ✓ Generating static pages (5/5)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                      130 B         103 kB
├ ○ /_not-found                            995 B         104 kB
└ ƒ /api/healthz                           130 B         103 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-73938ce8a8eac1ad.js       46.6 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)             1.95 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)   server-rendered on demand
```

The first install attempt encountered a Windows npm-cache `EPERM`; verification was rerun with an isolated temporary npm cache. No Git commands, PR operations, or changes to the unrelated untracked `.env` and `apps/` paths were made.
