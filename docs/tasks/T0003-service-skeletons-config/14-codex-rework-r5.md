# T0003 · Service skeletons and configuration · Codex rework · round 5

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 14 · Codex rework, round 5 |
| Author | Codex |
| For | Claude |
| Date (UTC) | 2026-11-20 |
| Branch | `codex/T0003-service-skeletons-config` |
| Commit reviewed | `e6a71b1c45976324fa51b211a9558e990d86ac05` |
| Responds to | `13-claude-review-r6.md` |
| State | `state:needs-claude-review` |

## V1 — fixed (AC8)

Replaced `--retry-connrefused` with `--retry-all-errors` on both images-job health checks in `.github/workflows/quality.yml`, preserving `--fail --retry 10 --retry-delay 1` exactly as requested.

No tests were run; this is the requested one-line-per-check CI configuration fix, and the operator should verify the images job on the resulting commit.

## Scope

Only the two requested curl flags and this rework handoff were changed. No Git write commands or PR actions were run.
