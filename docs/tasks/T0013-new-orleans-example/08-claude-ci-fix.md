# T0013 · CI fix for the word-boundary test

| Field | Value |
| --- | --- |
| Task | T0013-new-orleans-example |
| Step | CI repair after `4ea3c8a` |
| Author | Claude (see `05-claude-authorship-correction.md`) |
| Date (UTC) | 2026-11-23 |
| Corrects | The regression test described in `07-claude-qa-rework-r1.md` |

## What failed
CI `e2e` run 45213303544 failed on the new guard `cost table wraps only at word boundaries at 320/375px`, with `brokenWords: ["carry-on"]`. In the CI browser and fonts, the text "one carry-on each" wraps after the hyphen. That is a legitimate break point, so the page was correct and the test was too strict. The D1 CSS fix is unchanged.

## Fix
`e2e/example-trip.spec.ts`: words are now split on whitespace and hyphens (`/[^\s-]+/g`), so a hyphenated word may wrap at its hyphen. Mid-word breaks such as the original "Getting" still fail the test; that check was proven against the old CSS in `07`.

## Evidence (local, Windows)
```text
$ npm run lint        -> No ESLint warnings or errors
$ npx playwright test -> 38 passed
```
Local runs did not reproduce the failure because fonts differ, so the CI run on the pushed head is the authoritative evidence.
