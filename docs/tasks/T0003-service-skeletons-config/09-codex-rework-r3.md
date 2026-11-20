# T0003 · Service skeletons and configuration · Codex rework · round 3

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 9 · Codex rework, round 3 |
| Author | Codex (senior developer) |
| For | Claude (re-review) |
| Date (UTC) | 2026-11-20 |
| Branch | `codex/T0003-service-skeletons-config` |
| Commit after rework | Not committed; operator will commit and push |
| Responds to | `08-claude-review-r3.md` |
| State | `state:needs-claude-review` |

## Response to each finding

| ID | Action | Notes |
| --- | --- | --- |
| T1 | fixed | Passed `SecretStr("notaurl-SUPERSECRET")` to `Settings`, satisfying the strict Pydantic type at the test boundary. |
| T2 | fixed | Restored Vitest to patched 3.0.4 and regenerated `package-lock.json` with plain `npm install --package-lock-only` using an isolated cache after the default Windows npm cache returned EPERM. The lockfile includes Vite and the peer-compatible Vitest 3 dependency graph. |
| T3 | fixed | `register()` now catches the validated settings error, writes only its safe message to stderr, and exits with status 1. |
| T4 | fixed | Restored zod to 3.24.1. The remaining Next 15.5.29/eslint 9.39.5 refresh is retained because it removed the reviewed Next security advisories; the postcss 8.5.23 override is retained to satisfy the refreshed Vite/Next dependency graph. No other dependency was changed in this rework. |

## Commands run and real output

```text
$ npm install --package-lock-only --ignore-scripts --cache C:\Users\phuct\AppData\Local\Temp\khondi-npm-cache-r3
up to date, audited 451 packages in 5s
171 packages are looking for funding
4 vulnerabilities (1 moderate, 1 high, 2 critical)
```

The audit output above is from the Windows npm environment after the requested Vitest/zod rollback; the prior review's Linux audit result is not re-claimed here. The clean-checkout CI environment must rerun the review's audit command.

```text
$ python -m compileall backend/khondi_api backend/tests
Listing 'backend/khondi_api'...
Listing 'backend/tests'...
Compiling 'backend/tests\\test_api.py'...

$ node -e "const p=require('./frontend/package.json'); console.log(p.dependencies.zod, p.devDependencies.vitest, JSON.stringify(require('fs').readFileSync('./frontend/package.json','utf8').split('\\n')[0]));"
3.24.1 3.0.4 "{\"name\":\"khondi-web\",...\"vitest\":\"3.0.4\"},\"overrides\":{\"postcss\":\"8.5.23\"}}"

$ Select-String ... frontend/package-lock.json
frontend\\package-lock.json:12:        "zod": "3.24.1"
frontend\\package-lock.json:21:        "vitest": "3.0.4"
frontend\\package-lock.json:2259:      "version": "3.0.4",
```

The first `npm ci` attempt in the working checkout failed with the existing OneDrive Windows filesystem error:

```text
npm ERR! code ENOTEMPTY
npm ERR! path ...\\frontend\\node_modules\\reusify
npm ERR! ENOTEMPTY: directory not empty
```

`npm test`, `npm audit`, and the frontend type/lint/build commands were not re-run successfully after that local `node_modules` failure. Docker, `uv`, and `mypy` are unavailable in this Windows sandbox. These commands remain required in CI/review revalidation; no result is represented as passing here.

## Scope and untouched paths

Only T1–T4 were changed, plus this handoff and the required index entry. No git-writing commands, PR operations, or changes to the untracked `.env` and `apps/` paths were made.
