# T0000 · <Task title> · Gate 1 approval record

| Field | Value |
| --- | --- |
| Task | T0000-<slug> |
| Step | 2 · Approval record |
| Author | Codex (verifying before starting work) |
| Date (UTC) | YYYY-MM-DD HH:MM |
| Branch | `codex/T0000-<slug>` |

## Evidence
- Spec file: `docs/tasks/T0000-<slug>/01-spec.md`, version v1
- Spec PR: #<n>, merged into `main` by `phuc-minu` at <merge time, UTC>
- Merge commit: <sha>

## Check
- [ ] The spec PR is merged into `main` by Phil (not just opened or commented on).
- [ ] The spec version above is the one in `main` today.

If either box cannot be ticked, stop. Do not write code. Set `state:blocked` and say why below.

## Notes
Anything unclear in the spec that Codex will resolve in the most conservative way, and how. Anything that changes scope stops the task instead.
