# Task handoffs

Every piece of work in Khondi is a **task**. Product questions can be handed to ChatGPT Product Manager without bypassing Phil's approvals. Each task has its own folder here, and every handoff between Phil, Claude and Codex is saved in that folder as a numbered, dated Markdown file. The folder is the audit trail: anyone can open it later and read, in order, what was asked, who approved it, what was built, what review found, and what Phil decided.

GitHub labels show **whose turn it is right now**. The task folder shows **everything that happened**. Neither agent remembers anything between sessions, so the folder is also how each agent picks up where the last one stopped.

## Who does what

| Step | Who | Writes | Then |
| --- | --- | --- | --- |
| 0. Product clarification (only when needed) | Claude or Codex requests ChatGPT Product Manager review using an issue comment or a new numbered `NN-product-review.md` | ChatGPT recommends updated requirements and returns the outcome to Claude; scope changes return to Gate 1 |
| 1. Spec | Claude | `01-spec.md` in a spec PR | Asks Phil to approve the spec |
| 2. Plan approval (Gate 1) | Phil | Approves by merging the spec PR | Starts Codex with the kickoff prompt |
| 3. Implementation | Codex | `02-approval.md`, code, tests, `03-codex-handoff.md` | Opens a draft PR, label `needs-claude-review` |
| 4. Code review + QA | Claude | `NN-claude-review-rK.md` | Either rework (step 5) or ready for Phil (step 6) |
| 5. Rework | Codex | `NN-codex-rework-rK.md`, fixes | Label back to `needs-claude-review`, return to step 4 |
| 6. Notify Phil | Claude | Final review file says `APPROVE_FOR_OWNER_REVIEW` | Marks PR ready, label `ready-for-phil`, assigns and requests review from Phil |
| 7. Merge decision (Gate 2) | Phil | `NN-phil-decision.md` (Claude records it for Phil if asked) | Phil merges, or sends it back to step 5 |

Phil is only asked to look at the implementation PR once Claude's review and QA verdict is `APPROVE_FOR_OWNER_REVIEW`. Before that, the PR stays a draft.

```text
Claude: 01-spec ──► Phil merges spec PR (Gate 1)
                         │
                         ▼
Codex: 02-approval, code, 03-codex-handoff ──► label needs-claude-review
                         │
                         ▼
Claude: review + QA (NN-claude-review-rK)
        ├── CHANGES_REQUIRED ──► label needs-rework ──► Codex: NN-codex-rework-rK ──┐
        │                                                                          │
        │◄─────────────────────────────── label needs-claude-review ◄──────────────┘
        └── APPROVE_FOR_OWNER_REVIEW ──► PR ready, label ready-for-phil, Phil notified
                         │
                         ▼
Phil: reviews and merges, or requests rework (Gate 2)
```

## Folder layout

```text
docs/tasks/
  README.md                  this file
  INDEX.md                   one line per task, current state
  _templates/                copy these, never edit a task's file in place
  T0001-trip-intake-api/
    01-spec.md               Claude, Gate 1 proposal
    02-approval.md           Codex, evidence that Phil approved
    03-codex-handoff.md      Codex → Claude
    04-claude-review-r1.md   Claude → Codex (CHANGES_REQUIRED)
    05-codex-rework-r1.md    Codex → Claude
    06-claude-review-r2.md   Claude → Phil (APPROVE_FOR_OWNER_REVIEW)
    07-phil-decision.md      Phil's Gate 2 decision
```

## ChatGPT Product Manager handoff (optional, blocking when requested)

Use this handoff **only** for unresolved user value, product scope, acceptance criteria, priority, UX tradeoffs or product-risk questions—not ordinary code-review findings. Claude or Codex writes the next numbered append-only `NN-product-review.md` using [`_templates/product-review.md`](_templates/product-review.md) on the relevant task/spec branch. If no branch exists, post the complete template content as a GitHub issue comment and link it in the next spec; do not create an empty/false handoff file.

1. Link the source issue, exact spec/ADR version, what changed and the specific decision needed. Set `state:needs-product-review` **on the issue**; preserve existing implementation-PR `state:` labels so the code review/QA state is not lost. Update `INDEX.md` when a handoff file is added, in the same commit.
2. Start a ChatGPT Product Manager session manually and supply the issue/PR or task-file URL using the [kickoff prompt](_templates/prompts.md). **GitHub labels and @mentions do not automatically deliver messages to ChatGPT**, and no unattended connector is configured.
3. ChatGPT reviews the actual linked source, suggests user stories/acceptance criteria, records a GitHub issue comment or the next numbered append-only `NN-product-response.md` on the task branch, and links it back to the request. It may recommend a decision, but **cannot approve for Phil**.
4. Claude revises the spec or ADR in a new proposed version as needed and requests **Phil's Gate 1 approval** for any material scope/architecture changes. Codex must stop impacted implementation while product review is unresolved. Clear the issue's `state:needs-product-review` after an auditable response and update task status without changing unrelated PR labels.
5. If the Product Owner has already decided, preserve that decision and escalate conflicting proposals instead of silently reversing it. Do not allow a product review to skip Claude architecture/security review, Senior QA, Gate 2, or separate Azure permissions.

The product-review label is a **routing flag on issues**, not an authorization or proof that a model ran. If the issue already has a `state:` label, coordinate state transitions explicitly rather than silently replacing authoritative approval states.

## Rules for task folders

1. **Task IDs** are `T` plus four digits, assigned in order (`T0001`, `T0002`, ...), followed by a short kebab-case slug. Check `INDEX.md` for the next free number.
2. **Files are numbered in the order they happened** (`01-`, `02-`, ...). Review and rework rounds also carry a round number (`-r1`, `-r2`).
3. **Append only.** Never edit or delete an earlier handoff file. If something in it was wrong, write the correction in the next file and say which file it corrects. The only exception is fixing a typo before the file is first pushed.
4. **Every file starts with the header block** from its template: task, step, author, recipient, date and time in UTC, branch, commit SHA and verdict or state. Use the real commit SHA you reviewed or pushed, never a placeholder.
5. **Plain, human-readable Markdown.** Write for someone reading it a year from now with no other context: full sentences, links to the PR and commits, and real command output rather than claims.
6. **Handoff files are committed on the task's branch** so they are reviewed and merged together with the code. The spec is committed in its own spec PR and lands on `main` first.
7. **No secrets or personal data** in any handoff file. Never paste the value of `KHONDI_GITHUB_TOKEN` or any other credential, even partially.
8. **Update `INDEX.md`** in the same commit as each handoff file so the index always matches the folders.

## Labels: whose turn is it?

Exactly one `state:` label is on a task PR at any time. Whoever finishes a step changes it.

| Label | Meaning | Whose turn |
| --- | --- | --- |
| `state:awaiting-plan-approval` | Spec PR is open | Phil |
| `state:in-progress` | Codex is implementing | Codex |
| `state:needs-claude-review` | Codex handed off | Claude |
| `state:needs-rework` | Claude found blocking issues | Codex |
| `state:ready-for-phil` | Claude approved for owner review | Phil |
| `state:blocked` | Waiting on a decision or outside fix; reason in the latest handoff file | Phil |
| `state:needs-product-review` | Product question on an issue; implementation PR maintains its current QA label | ChatGPT Product Manager, initiated manually |

The labels are defined in [`.github/labels.json`](../../.github/labels.json) and created by the `Sync labels` workflow.

## How each handoff actually starts

Claude and Codex are not wired to each other automatically. A handoff starts in one of these ways:

- **Claude/Codex → ChatGPT Product Manager (when product scope is unclear):** Post a source-linked handoff on the issue or branch, set the issue's `state:needs-product-review` and manually open the Product Manager session using the prompt below. A label alone does not launch ChatGPT.
- **Phil → Codex (after Gate 1):** Phil pastes the Codex kickoff prompt from [`_templates/prompts.md`](_templates/prompts.md) into Codex.
- **Codex → Claude:** Codex sets `state:needs-claude-review`. Claude, watching the PR from the Khondi project, picks it up. If no Claude session is watching, Phil pastes the Claude review prompt.
- **Claude → Codex (rework):** Claude sets `state:needs-rework` and posts a PR comment linking the review file. If the Codex GitHub integration is enabled on this repository, the comment starts with `@codex` so Codex picks it up; otherwise Phil pastes the Codex rework prompt.
- **Claude → Phil:** Claude marks the PR ready for review, assigns Phil and requests his review (GitHub notifies him), and also tells him in the Khondi project.

## Limits that stop the loop

- **Three rework rounds at most.** If review round 3 still says `CHANGES_REQUIRED`, Claude sets `state:blocked` and asks Phil whether to re-scope, split or stop, instead of starting round 4.
- **Scope change means Gate 1 again.** If Codex finds the spec cannot be built as written, Codex stops, writes the problem in the handoff file, sets `state:blocked`, and Claude revises the spec for Phil's approval. Codex never quietly builds something different.
