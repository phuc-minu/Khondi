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

## Phil/operator → ChatGPT Product Manager: resolve product handoff
```text
Review the pending Khondi product handoff in phuc-minu/Khondi, issue #<n>, task T0000-<slug>.
Read AGENTS.md, docs/tasks/README.md, the linked issue and all existing numbered handoff files, especially NN-product-review.md (or the linked issue comment), and the applicable PRD/ADR revision.
Identify the product decision, user stories, priority and acceptance-criteria changes; distinguish recommendations from my approval. Record a concise response as a source-linked GitHub issue comment, or a new append-only NN-product-response.md on the task branch if appropriate; update the task index with any new file.
Ask Claude to reconcile your recommendation into a proposed spec/ADR revision and stop at Gate 1 if scope changed. Do not instruct Codex to implement changed scope or merge anything automatically.
```
