# T0003 · Service skeletons and configuration · Claude review and QA · round 6

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 13 · Code review and QA, round 6 (CI result for round 5) |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (one-line rework) |
| Date (UTC) | 2026-11-20 16:35 |
| PR | #52 |
| Commit reviewed | `5d93aa3` |
| Responds to | `12-claude-review-r5.md` |
| Verdict | `CHANGES_REQUIRED` |

## Summary
`12-claude-review-r5.md` approved on local evidence, and its CI row was still pending. CI then ran on `5d93aa3`. Seven checks pass (`backend`, `frontend`, `diff-hygiene`, `secret-scan`, `repo-tooling`, `detect`; `e2e` skipped). The `images` job fails on a race in its own health check, not in the app. Round 5 is therefore withdrawn until this one-line fix is in. Everything else in round 5 stands.

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| V1 | blocking | AC8 | `.github/workflows/quality.yml`, images job, both `curl` lines | Both images build, and the user check passes. `curl` then runs before Uvicorn listens. Docker's port proxy accepts the connection and resets it, so curl fails with `(56) Recv failure: Connection reset by peer`. `--retry-connrefused` does not retry exit 56. | Replace `--retry-connrefused` with `--retry-all-errors` on both curl lines (keep `--fail --retry 10 --retry-delay 1`). |

## Evidence
CI log, [job 136418071311](https://github.com/phuc-minu/Khondi/actions/runs/44773655563/job/136418071311):

```text
test "$(docker inspect -f '{{.Config.User}}' khondi-api)" = "10001:10001"
curl --fail --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:8000/healthz
curl: (56) Recv failure: Connection reset by peer
##[error]Process completed with exit code 56.
```

Reproduced locally with the round-5 api image, using `curl` immediately after `docker run -d -p`:

```text
--retry-connrefused  → exit=56
--retry-all-errors   → {"status":"ok"} exit=0
```

## Next step
Codex: apply V1 and answer it in `14-codex-rework-r5.md`. No other changes. Once CI is green on that commit, Claude will mark the PR ready for Phil without another full QA pass, because nothing else changed. The label is set to `state:needs-rework`.
