# Task index

One line per task. Updated in the same commit as each handoff file. The PR label is the live state; this table is the record.

| Task | Title | State | Spec PR | Implementation PR | Last handoff |
| --- | --- | --- | --- | --- | --- |
| [T0001](T0001-handoff-workflow/) | Claude–Codex handoff workflow | merged | (requested directly by Phil) | #48 | `01-spec.md` |
| [T0002](T0002-local-infra-azure-parity/) | Local dev infrastructure that can be duplicated in Azure | merged | #49 | (T0003–T0009) | `01-spec.md` |
| [T0003](T0003-service-skeletons-config/) | Service skeletons and configuration | ready-for-phil | #50 (covered by T0002 approval) | #52 | `22-claude-review-r11.md` |
| [T0004](T0004-compose-stack/) | Compose stack and networking | merged | #63 (merged; design in T0002 v1) | #64 | `06-codex-review-r2.md` |
| [T0005](T0005-postgres-migrations/) | PostgreSQL, migrations and recovery | merged | #65 (merged; design in T0002 v1) | #66, carried to main by #74 | `03-claude-devops-handoff.md` |
| [T0006](T0006-redis-worker/) | Redis and worker | merged | #67 (merged; design in T0002 v1) | #68 | `05-codex-review-r2.md` |
| [T0007](T0007-observability/) | Observability | merged | #70 (merged; design in T0002 v1) | PR 1 #71 (via #69, #68); PR 2 #72; PR 3 #73 | `11-codex-review-pr3-r2.md` |
| [T0008](T0008-integration-tests/) | Integration tests and Playwright | PR 1 needs-claude-review (reviewer: Codex) | #75 (merged; design in T0002 v1, four additions) | PR 1 (this branch) | `03-claude-devops-handoff-pr1.md` |
| [T0010](T0010-website-epic53/) | Public website: three pages and budget-first flow (epic #53) | spec signed off under delegation (PR #61) | this PR | (T0011–T0015) | `02-claude-delegated-signoff.md` |
| [T0011](T0011-site-shell/) | Website site shell and test harness (#55, #60) | needs-claude-review | #61 (covered by T0010 signoff) | draft PR #78 | `06-codex-qa-followup.md` |
| [T0012](T0012-about-page/) | About page (#59) | merged | this PR (delegated) | #79 (merged) | `04-claude-review-r1.md` |
| [T0013](T0013-new-orleans-example/) | Illustrative $3,000 New Orleans trip (#58) | needs-claude-review (QA D1 fixed; delta review, QA re-run and Codex r2 pending) | this PR (delegated) | draft PR #81 | `08-claude-ci-fix.md` |
| [T0014](T0014-budget-starter/) | Budget-first trip starter (#56) | spec signed off under delegation; follows T0015 (owner order, 2026-11-25); needs design addendum | this PR (delegated) | | `01-spec.md` |
| [T0015](T0015-landing/) | Landing page (#57, #54) | needs-claude-review | [#90](https://github.com/phuc-minu/Khondi/pull/90) (delegated) | [Draft PR](https://github.com/phuc-minu/Khondi/pulls?q=is%3Apr+head%3Acodex%2FT0015-landing) | `03-codex-handoff.md` |
| [T0016](T0016-visual-design/) | Visual design for the public website (#55) | designer handoff received; Claude review done; awaiting Owner decisions D1–D3 | this PR (delegated) | | `03-claude-design-review.md` |
| [T0017](T0017-design-shell/) | Design tokens and site shell (#55) | merged | #83 (delegated) | #86 | `03-codex-handoff.md` |
| [T0018](T0018-example-restyle/) | New Orleans example restyle (#55, #58) | drafted for Claude review | [#87](https://github.com/phuc-minu/Khondi/pull/87) (delegated) | [Draft PR](https://github.com/phuc-minu/Khondi/pulls?q=is%3Apr+head%3Acodex%2FT0018-example-restyle) | `03-codex-handoff.md` |

States: `awaiting-plan-approval`, `in-progress`, `needs-claude-review`, `needs-rework`, `ready-for-phil`, `blocked`, `merged`, `cancelled`.
