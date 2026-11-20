# Task index

One line per task. Updated in the same commit as each handoff file. The PR label is the live state; this table is the record.

| Task | Title | State | Spec PR | Implementation PR | Last handoff |
| --- | --- | --- | --- | --- | --- |
| [T0001](T0001-handoff-workflow/) | Claude–Codex handoff workflow | merged | (requested directly by Phil) | #48 | `01-spec.md` |
| [T0002](T0002-local-infra-azure-parity/) | Local dev infrastructure that can be duplicated in Azure | merged | #49 | (T0003–T0009) | `01-spec.md` |
| [T0003](T0003-service-skeletons-config/) | Service skeletons and configuration | needs-rework | #50 (covered by T0002 approval) | #52 | `20-claude-review-r10.md` |
| [T0010](T0010-website-epic53/) | Public website: three pages and budget-first flow (epic #53) | spec signed off under delegation (PR #61) | this PR | (T0011–T0015) | `02-claude-delegated-signoff.md` |
| [T0011](T0011-site-shell/) | Website site shell and test harness | blocked: waits for PR #52 (T0003) to merge | this PR (covered by T0010 signoff) | | `01-spec.md` |

States: `awaiting-plan-approval`, `in-progress`, `needs-claude-review`, `needs-rework`, `ready-for-phil`, `blocked`, `merged`, `cancelled`.
