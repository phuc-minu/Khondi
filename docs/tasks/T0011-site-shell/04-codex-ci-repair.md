# T0011 · Site shell · CI repair handoff

| Field | Value |
| --- | --- |
| Task | T0011-site-shell |
| Step | 04 · CI repair |
| Author | Codex (senior developer) |
| For | Claude reviewer and Claude Senior QA |
| Date (UTC) | 2026-11-23 14:36 |
| PR | #78 |
| Branch | codex/T0011-site-shell |
| Code commit | f5e8f10e7bf2b18b3c14ea6e3b05e8f1b340454e |
| State | needs-claude-review |

## Changes and authorization

The owner explicitly requested fixing the CI failures, pushing to existing PR #78, arranging independent Claude review/QA, and updating issue #60. This remains within T0011 and the delegated website scope. No merge or deployment is requested.

- `SiteHeader.module.css`: scope the mobile `nav` selector under `.inner`, preserving wrapping while satisfying CSS Modules purity. The original production build failed on the bare selector.
- `playwright.config.ts`: remove the hard-coded loopback URL rejected by diff hygiene. Playwright derives its local base URL from `webServer.port`; `BASE_URL` still overrides it. This non-material harness adjustment uses the installed Playwright implementation's port-derived URL rather than the explicit fallback in spec v1.
- Browser validation then exposed missing `ENVIRONMENT` and `API_BASE_URL` settings, hidden by the original compile failure. Supply the existing frontend CI values in the test server environment, preserving an explicit API URL override. The shell tests do not call the API. Application validation and CI gates are unchanged.

This corrects the earlier handoff's suggestion that build failures were only environmental: GitHub CI had a reproducible CSS compile error. Existing production build and E2E checks exercise the regression; no tests were weakened or skipped, and no dependencies changed.

## Commands and real output

Windows, Node v24.19.0, npm 9.6.7. GitHub CI uses Node 22 and must independently pass on the pushed head.

```text
$ npm ci --cache <temporary-cache> --no-audit --no-fund
added 357 packages in 39s

$ npm run lint -- --max-warnings=0
✔ No ESLint warnings or errors

$ npm run typecheck
> tsc --noEmit
(exit 0)

$ npm test
Test Files  4 passed (4)
Tests       31 passed (31)

$ npm run build
✓ Compiled successfully in 6.2s
✓ Generating static pages (6/6)
(exit 0)

$ npm audit --omit=dev --cache <temporary-cache>
found 0 vulnerabilities

$ python scripts/check_diff_hygiene.py origin/main
Diff hygiene: no violations.

$ npm run e2e
6 passed (2.5m)

$ git diff --check
(no output, exit 0)
```

For E2E, `CI=1` forced a fresh production server and both projects ran. Chromium was installed in a temporary `PLAYWRIGHT_BROWSERS_PATH` because the default browser-cache install stalled. `PLAYWRIGHT_HTML_OUTPUT_DIR` also pointed to a temporary directory. All six assertions passed, including axe, skip-link focus, narrow-screen overflow and 44px targets. Windows server teardown hung after assertions; the verified test-only Next server process tree was terminated manually, after which Playwright printed the success summary and exited 0. Independent Linux CI/Claude QA must confirm unassisted completion. The initial E2E attempt failed before the test-server settings were added; it is not counted as passing.

## Remaining handoff

Independent Claude code review and Senior QA must inspect the final pushed SHA and the complete PR, including visual/accessibility evidence and every required CI job. Container image and stack checks were not run locally; GitHub CI owns that verification. PR remains a draft pending those checks. About (#59 / T0012) starts only after #78 merges, from main; #52 is already merged and no longer blocks T0011.
