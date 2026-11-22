# Task index

One line per task. Updated in the same commit as each handoff file. The PR label is the live state; this table is the record.

| Task | Title | State | Spec PR | Implementation PR | Last handoff |
| --- | --- | --- | --- | --- | --- |
| [T0001](T0001-handoff-workflow/) | Claude–Codex handoff workflow | merged | (requested directly by Phil) | #48 | `01-spec.md` |
| [T0002](T0002-local-infra-azure-parity/) | Local dev infrastructure that can be duplicated in Azure | merged | #49 | (T0003–T0009) | `01-spec.md` |
| [T0003](T0003-service-skeletons-config/) | Service skeletons and configuration | ready-for-phil | #50 (covered by T0002 approval) | #52 | `22-claude-review-r11.md` |
| [T0004](T0004-compose-stack/) | Compose stack and networking | merged | #63 (merged; design in T0002 v1) | #64 (merged to main) | `06-codex-review-r2.md` |
| [T0005](T0005-postgres-migrations/) | PostgreSQL, migrations and recovery | merged into #64's branch by #66; not yet on main | #65 (merged; design in T0002 v1) | #66 | `03-claude-devops-handoff.md` |
| [T0006](T0006-redis-worker/) | Redis and worker | PR 2 (#69) merged into #68's branch; #68 needs-claude-review (reviewer: Codex) | #67 (merged; design in T0002 v1) | #68 | `04-claude-devops-handoff-pr2.md` |
| [T0007](T0007-observability/) | Observability | PR1/PR2 APPROVE_FOR_OWNER_REVIEW | #70 (merged; design in T0002 v1) | PR 1 in #69; PR 2 #72 | `07-codex-review-pr2-r2.md` |
| [T0010](T0010-website-epic53/) | Public website: three pages and budget-first flow (epic #53) | spec signed off under delegation (PR #61) | this PR | (T0011–T0015) | `02-claude-delegated-signoff.md` |
| [T0011](T0011-site-shell/) | Website site shell and test harness | blocked: waits for PR #52 (T0003) to merge | this PR (covered by T0010 signoff) | | `01-spec.md` |

States: `awaiting-plan-approval`, `in-progress`, `needs-claude-review`, `needs-rework`, `ready-for-phil`, `blocked`, `merged`, `cancelled`.
