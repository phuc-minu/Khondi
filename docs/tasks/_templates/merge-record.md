# T0000 · <Task title> · Merge record (Gate 2)

| Field | Value |
| --- | --- |
| Task | T0000-<slug> |
| Step | NN · Claude merge gate |
| Merged by | Claude (session or role) |
| Date (UTC) | YYYY-MM-DD HH:MM |
| PR | #<n> |
| Reviewed head SHA | <full sha> |
| Issues | Refs #<n> |

Written on the PR branch just before merging. The only change allowed after the reviewed SHA is this file and its `INDEX.md` line; the merging Claude checks that with `git diff --name-only <reviewed-sha> <head-sha>`.

## Merge gate (docs/merge-policy.md)
| # | Item | Evidence | Holds |
| --- | --- | --- | --- |
| 1 | Approved scope unchanged | spec version, spec PR | yes / no |
| 2 | Independent Claude review `APPROVE_FOR_MERGE` on the reviewed SHA | `NN-claude-review-rK.md` | yes / no |
| 3 | Claude Senior QA pass on the reviewed SHA | same file or QA file | yes / no |
| 4 | Senior Designer fidelity review (UI changes) | link, or n/a | yes / no / n/a |
| 5 | Codex cross-check (Claude-authored code) | link, or n/a | yes / no / n/a |
| 6 | All required checks green on the head SHA, branch up to date | run link | yes / no |
| 7 | No open blocking finding; threads resolved | review files | yes / no |
| 8 | Hard boundary untouched, or Phil's approval linked | `NN-owner-decision.md` or "none touched" | yes / no |
| 9 | PR body uses `Refs #N`, no closing keyword | PR link | yes / no |

Merge only if every row says yes or n/a: `gh pr merge <n> --squash --match-head-commit <head-sha>`.

## After merge
Issues are closed only after the `e2e` job passes on `main` for the merge commit. The closing comment on each issue names this PR, the merge commit and the `main` run. That comment, not this file, is the record of closure.
