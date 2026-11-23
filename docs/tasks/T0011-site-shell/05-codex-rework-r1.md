# T0011 · Site shell · Codex rework · round 1

| Field | Value |
| --- | --- |
| Task | T0011-site-shell |
| Step | 05 · Rework, round 1 |
| Author | Codex (senior developer) |
| For | Claude (re-review) and Claude Senior QA |
| Date (UTC) | 2026-11-23 14:42 |
| PR | #78 |
| Branch | codex/T0011-site-shell |
| Commit after rework | 6b020f5d5e854c52c1974726226cef05cc5b299b |
| Responds to | Independent Claude review run 3735d498-f2a7-49d5-9b96-e2350ffdd1ff, reviewed SHA 84648784a40580a4f4dd0668500449fc10f213b8 |
| State | needs-claude-review |

## Response to findings

The reviewer provided one required finding and three optional observations, without finding IDs. All are addressed below.

| Finding | Response |
| --- | --- |
| Required: exact dependency versions and manifest/lock agreement | Pinned `@axe-core/playwright` to 4.10.2, `@playwright/test` to 1.65.1 and restored `eslint-config-next` to 15.5.29. Regenerated the lockfile; resolved dependency versions did not change. |
| Optional: nonexistent Chromium device descriptor | Removed the ineffective spread. Mobile still uses the default Chromium browser with its explicit viewport, touch and mobile options. |
| Optional: request observation stops at load | Wait for initial network idle before asserting same-origin requests. This covers initial hydration traffic; it does not claim to observe an indefinitely open session. |
| Optional: unassisted E2E completion | Linux CI e2e passed on 8464878. Local rerun below also shut down automatically when permitted process-tree cleanup. |

## Commands and real output

```text
$ npm install --package-lock-only --ignore-scripts --no-audit --no-fund --cache <temporary-cache>
up to date in 589ms

$ npm run lint -- --max-warnings=0
✔ No ESLint warnings or errors

$ npm run typecheck
> tsc --noEmit
(exit 0)

$ npm test
Test Files  4 passed (4)
Tests       31 passed (31)

$ npm run e2e
6 passed (51.1s)
(exit 0, automatic server teardown)

$ git diff --check
(no output, exit 0)
```

The E2E run used `CI=1`, temporary browser/report paths, and elevated process-cleanup access. It built and started the production application, ran both projects, and exited without manual intervention. This supports a sandbox-specific explanation for the first Windows teardown hang recorded in 04; no production configuration was changed to obtain this result.

On the previous pushed head, CI frontend, backend, diff hygiene, repo tooling, secrets, e2e and image checks passed; stack was still running when this handoff was written. These are not evidence for the new head: rerun CI plus independent Claude review/QA on the final pushed commit before merge. No inline GitHub review threads existed when checked; the review was recorded by Orchestrator. No merge or deployment requested.
