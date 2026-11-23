# T0008 · Integration tests and Playwright · Gate 1 approval record

| Field | Value |
| --- | --- |
| Task | T0008-integration-tests |
| Step | 2 · Approval record |
| Author | Claude (DevOps implementer for this task; verifying before starting work) |
| Date (UTC) | 2026-11-23 02:40 |
| Branch | `claude/T0008-stack-suite` |

## Evidence
- **Spec:** `docs/tasks/T0008-integration-tests/01-spec.md`, version v1.
- **Spec PR:** #75, merged into `main` at 2026-11-22 18:15:07 UTC by `phuc-minu`, from the reviewed head `97af826`.
- **Merge commit:** `48e62ce`.
- **Approval scope.** The merge approves spec v1, including:
  - Addition 1: moving the CI stack checks into the pytest `stack` suite;
  - Addition 2: restoring into a scratch database;
  - Addition 3: `-m "not stack"` in the backend's pytest options;
  - Addition 4: deferring #37's itinerary and save checks to #2;
  - the three-PR split and its start conditions.
- **Start condition for PR 1 and PR 2** ("after #74, #68, #72 and #73 merge to `main`") is met:

  | PR | Merged (UTC) | Merge commit |
  | --- | --- | --- |
  | #74 | 2026-11-22 18:09:12 | `55a16ed` |
  | #68 | 2026-11-22 20:53:46 | `ed7a70b` |
  | #72 | 2026-11-23 02:27:25 | `57fe0a6` |
  | #73 | 2026-11-23 02:36:31 | `4859343` |

## Check
- [x] The spec PR is merged into `main`.
- [x] The spec version above is the one in `main` today: this branch starts from `main` at `4859343`.

## Notes
1. **Roles** (owner decision, 2026-11-20): Claude implements as DevOps, Codex reviews, and Phil merges (Gate 2).
2. **This branch is PR 1 of 3:** the suite framework and the T0004/T0005 checks (health, migrations, database role, persistence, backup and restore). PR 2 (worker and telemetry checks) follows. PR 3 (Playwright) waits for T0011.
3. **`StackSettings` grows per PR (Q5).** PR 1 reads only the variables its tests use: `STACK_API_URL`, `STACK_WEB_URL` and `STACK_DATABASE_URL`. `STACK_GRAFANA_URL` arrives with the telemetry tests in PR 2.
