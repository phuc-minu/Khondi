# T0001 · Claude–Codex handoff workflow · Spec

| Field | Value |
| --- | --- |
| Task | T0001-handoff-workflow |
| Step | 1 · Spec |
| Author | Claude (architect) |
| For | Phil |
| Date (UTC) | 2026-11-19 17:24 |
| Spec version | v1 |
| Related | AGENTS.md, docs/ai-workflow.md |

## Goal
Give Phil, Claude and Codex a written, auditable handoff process, and stop Codex from producing low-quality ("slop") code.

## Context
This is a governance task Phil asked for directly in the Khondi project, so it has no separate spec PR. Phil's words (2026-11-19, 17:19 UTC):

> Yes add a handoff template so that after I review and approve the plan, codex should start work. After codex completes the work, it should hand off back to claude for code review and qa testing. Then if there is rework, hand off back to coded again. Once Claude agrees work is ready to be reviewed by me then notify me regarding PR. Also make sure Coded does not write slop code.

And (17:20 UTC):

> make sure all handoff are organized in folders and human readable for future audits.

"Coded" is read as Codex. Because this task sets up the process itself and contains no application code, Claude wrote it rather than Codex.

## Scope
**In scope**
- Handoff process, labels and per-task audit folders: `docs/tasks/README.md`, `docs/tasks/INDEX.md`, `docs/tasks/_templates/`.
- Code quality rules Q1–Q16 in `AGENTS.md`, linked from the role skills and `docs/ai-workflow.md`.
- PR template, CODEOWNERS, label definitions and label sync workflow.
- CI quality gates: diff hygiene check, secret scan, and backend, frontend and Playwright jobs that switch on once those apps exist.

**Out of scope**
- Any application code, branch protection settings (Phil sets these in GitHub), and Codex or Claude automation beyond labels and PR comments.

## Acceptance criteria
1. A reader can follow one task from spec to merge decision using only the files in its task folder.
2. Codex is told, in `AGENTS.md`, to stop if the spec PR is not merged, and never to request Phil's review.
3. Phil is asked to review a PR only after Claude's verdict is `APPROVE_FOR_OWNER_REVIEW`.
4. Rework is limited to three rounds before Phil decides.
5. CI fails a PR that adds a TODO, swallowed exception, unexplained type suppression, skipped test or print/console logging, or that changes code without a handoff file.

## Approval request
Phil, please review this PR. Merging it is your approval of this workflow.
