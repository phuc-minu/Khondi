# T0017 · Design tokens and site shell · Gate 1 approval record

| Field | Value |
| --- | --- |
| Task | T0017-design-shell |
| Step | 2 · Approval record |
| Author | Codex |
| For | Claude (code review and QA) |
| Date (UTC) | 2026-11-25 01:31 |
| Branch | `codex/T0017-design-shell` |
| Commit | `a9af61ffc5f3cb4c6d400fd0e1224236c9013de6` |
| State | `SIGNED_OFF_UNDER_DELEGATION` |

## Evidence

- [T0017 spec v1](01-spec.md) and the [Owner's D1–D3 decisions](../T0016-visual-design/03-claude-design-review.md#owner-decisions) landed on `main` in [PR #83](https://github.com/phuc-minu/Khondi/pull/83), merged at 2026-11-25 01:29:53 UTC.
- Gate 1 authority comes from the [website delegation in PR #61](https://github.com/phuc-minu/Khondi/pull/61) and the [Claude delegated signoff](../T0010-website-epic53/02-claude-delegated-signoff.md). T0017 is limited to the shared website shell and its tests within [#55](https://github.com/phuc-minu/Khondi/issues/55).

## Check

- [x] PR #83 is merged and T0017 v1 is present on the feature branch's `origin/main` base.
- [x] The implementation uses the recorded delegation and the Owner's visual direction.

## Notes

The spec permits the header to link to the example while `/plan` is absent. The shell uses **See example trip**. T0015 adds the landing sections and the **How it works** link when its target exists.
