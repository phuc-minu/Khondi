<!--
Khondi PR. Read docs/tasks/README.md and docs/merge-policy.md. Codex opens task PRs as drafts.
The full handoff lives in docs/tasks/<task-id>/; this description links to it.
Reference issues with "Refs #N" only. Never write Closes/Fixes/Resolves #N: the issue is closed by the
merging Claude after the post-merge e2e run on main passes.
-->

## Task
- Task folder: `docs/tasks/T0000-<slug>/`
- Approved spec: `01-spec.md` vX, spec PR #<n>
- Latest handoff file: `NN-<name>.md`
- Refs #<issue>

## Summary
What changed and why, in two or three sentences.

## Codex → Claude handoff
- [ ] Handoff file written from the template, with real command output pasted
- [ ] Every acceptance criterion marked done, partial or not done
- [ ] Code quality rules Q1–Q16 self-checked; exceptions listed in the handoff file
- [ ] New dependencies justified, or none
- [ ] `docs/tasks/INDEX.md` updated
- [ ] Issues referenced with `Refs #N`, no closing keywords
- [ ] Label set to `state:needs-claude-review`

## Claude merge gate
Filled by Claude. All must hold on the same head SHA (docs/merge-policy.md):

- Head SHA reviewed:
- Claude code review (`APPROVE_FOR_MERGE`), file:
- Claude Senior QA, file:
- Senior Designer fidelity review (UI changes), or n/a:
- Codex cross-check (Claude-authored code), or n/a:
- Required checks green on head SHA, run:
- Blocking findings open: none
- Hard boundary: none touched, or Phil's approval linked:
- Merge record: `NN-merge-record.md`

<!-- Phil is not a code reviewer and is not requested or assigned on PRs. Claude merges when the gate passes. -->
