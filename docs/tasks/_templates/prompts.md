# Kickoff prompts

Copy and paste these to start a handoff when no agent is already watching. Replace `T0000-<slug>` and `#<n>`.

## Phil → Codex: start implementation (after merging the spec PR)
```text
Implement task T0000-<slug> in phuc-minu/khondi.
Read AGENTS.md and docs/tasks/README.md first, then docs/tasks/T0000-<slug>/01-spec.md.
Follow the workflow exactly: branch codex/T0000-<slug>, write 02-approval.md and stop if the spec PR is not merged,
implement only the spec, follow the code quality rules in AGENTS.md, write 03-codex-handoff.md with real command output,
update docs/tasks/INDEX.md, open a draft PR using the PR template, and set the label state:needs-claude-review.
```

## Phil → Claude: review and QA
```text
Review and QA PR #<n> for task T0000-<slug> in phuc-minu/khondi.
Read AGENTS.md, docs/tasks/README.md and every file in docs/tasks/T0000-<slug>/ in order.
Write the next numbered claude-review file from docs/tasks/_templates/claude-review.md, commit it to the PR branch,
update docs/tasks/INDEX.md and the state label, and notify me only if the verdict is APPROVE_FOR_OWNER_REVIEW.
```

## Phil → Codex: rework
```text
Rework PR #<n> for task T0000-<slug> in phuc-minu/khondi.
Read the latest claude-review file in docs/tasks/T0000-<slug>/ and fix every blocking finding.
Answer every finding by ID in the next numbered codex-rework file, paste real command output,
update docs/tasks/INDEX.md and set the label state:needs-claude-review.
```
