# T0004 · Compose stack and networking · Gate 1 approval record

| Field | Value |
| --- | --- |
| Task | T0004-compose-stack |
| Step | 2 · Approval record |
| Author | Claude (DevOps implementer for this task; verifying before starting work) |
| Date (UTC) | 2026-11-20 16:43 |
| Branch | `claude/T0004-compose-stack` |

## Evidence
- **Spec:** `docs/tasks/T0004-compose-stack/01-spec.md`, version v1.
- **Spec PR:** #63, merged into `main` at 2026-11-20 16:41:52 UTC.
- **Merge commit:** `53c253f1345221ad27065457f8c9214c2f0fdfcf`.
- **Who merged it.** GitHub shows the merge as `phuc-minu`. Claude performed it with the operator's token, on the Product Owner's explicit instruction in the Claude Code session ("merge #52 and #63, then start T0004"). The merge commit message records this.
- **Approval scope.** The approval covers spec v1, including the host-port overrides in its Risks 1.

## Check
- [x] The spec PR is merged into `main` on Phil's instruction (not just opened or commented on).
- [x] The spec version above is the one in `main` today: `01-spec.md` on this branch is identical to `origin/main`.

## Notes
1. **Roles changed by the owner on 2026-11-20.**
   - Claude implements T0004 as DevOps, in place of Codex.
   - **Codex does the independent code review**, in place of Claude.
   - Phil's merge stays the Gate 2 decision.

   The `state:needs-claude-review` label on the PR therefore means "reviewer's turn" (Codex) for this task.
2. **The branch is stacked on T0003.**
   - The spec says implementation starts after PR #52 merges. PR #52 isn't merged yet: round 8 asked for W1–W3, and Codex's fix `42bd16a` is under re-review.
   - On 2026-11-20 the owner chose to start T0004 now, on a branch stacked on #52's head (`42bd16a`), with `main` merged in for this spec.
   - T0004 changes no file that W1–W3 touch (`backend/khondi_api/*`, `backend/tests/*`).
   - This PR's diff includes T0003's commits until #52 merges. After that it is rebased or merged onto `main`, and **it must not merge before #52**.
3. **Spec filename kept.** The spec names the reset script `scripts/dev-reset.py`, which isn't an importable module name. The tests load it with `importlib` so the filename stays as specified.
