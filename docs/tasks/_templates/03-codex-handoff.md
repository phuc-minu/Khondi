# T0000 · <Task title> · Codex → Claude handoff

| Field | Value |
| --- | --- |
| Task | T0000-<slug> |
| Step | 3 · Implementation handoff |
| Author | Codex (senior developer) |
| For | Claude (code review and QA) |
| Date (UTC) | YYYY-MM-DD HH:MM |
| Branch | `codex/T0000-<slug>` |
| Commit reviewed | <full sha of the last commit> |
| PR | #<n> (draft) |
| State | `needs-claude-review` |

## What changed
Plain-language summary, then one line per file or module and why it changed.

## Acceptance criteria
| # | Criterion (from spec) | Done? | Where (file / test) |
| --- | --- | --- | --- |
| 1 | | yes / no / partial | |

Anything not fully done is listed here as **no** or **partial** with the reason. Never mark a criterion done that is not.

## Commands run and real output
Paste the actual commands and the end of their output. Do not summarize as "all passing".

```text
$ <command>
<output>
```

## Quality rules self-check
Confirm each rule in `AGENTS.md` → "Code quality rules". List any exception with the reason.

- Exceptions: none / Q<n>: <reason>

## New dependencies
None, or each package with version, reason, alternatives considered and license.

## Deviations from the spec
None, or each one with why. A deviation that changes scope should have stopped the task instead.

## Risks and known limits
What Claude and QA should look at hardest.

## Follow-ups (not in this PR)
Ideas noticed but deliberately not built.
