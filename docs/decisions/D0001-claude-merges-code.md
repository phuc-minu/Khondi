# D0001 · Claude reviews and merges code; Phil is not a code reviewer

| Field | Value |
| --- | --- |
| Decision by | Product Owner Phil (GitHub `@phuc-minu`) |
| Date | 2026-11-23 |
| Given to | The Claude orchestrator session for this project, directly |
| Recorded by | Claude, in PR #80 |
| Scope | The whole Khondi project, every repository path, not only the website epic |
| Status | In force once PR #80 merges |

## The owner's words

> Have Claude merge code, remove Phil as code reviewer for this project.

Same day, relayed by the orchestrator as additional owner rules for this change: an issue is closed only after its PR has merged **and** the end-to-end tests have passed on `main` after the merge. PR bodies reference issues with `Refs #N` and never use `Closes`, `Fixes` or `Resolves`, so GitHub does not close the issue at merge time. The Claude that merges closes the issue after checking the post-merge `main` run, and links that run.

## What changes

1. **Code review and merge belong to Claude.** A PR merges when the Claude merge gate in [merge-policy.md](../merge-policy.md) passes: an independent Claude code review (`khondi-architect-reviewer`) and Claude Senior QA both pass on the exact head SHA, every required check is green on that SHA, no blocking finding is open, and the diff stays inside approved scope. Claude then performs the merge.
2. **Phil is not asked to review code.** He is not requested or assigned as a PR reviewer, and `.github/CODEOWNERS` no longer names him. The former owner "Gate 2" code review is replaced by the Claude merge gate.
3. **The Tier A / Tier B split proposed earlier in PR #80 is withdrawn.** It existed to decide which PRs Phil reviewed; he now reviews none.
4. **Issues close only after post-merge e2e passes on `main`**, as described above.

## What does not change

This decision is about **code review and merging only**. It does not widen anything else:

- **Gate 1 stays as documented.** Phil approves each spec or plan (by merging the spec PR) before implementation starts. The website delegation for epic #53 (2026-11-20) continues for that epic's plans exactly as written in [AGENTS.md](../../AGENTS.md).
- **The hard boundary still needs Phil's explicit approval:** deployments to any environment, Azure provisioning or anything that incurs charges, secrets and credentials, external provider credentials, authentication and personal data handling, payments and booking, and destructive actions. Merging a PR never authorizes any of these.
- **Roles stay split.** From T0014 on, Codex implements and Claude reviews and runs QA. When Claude wrote the code, a Codex cross-check is also required before merge. A GitHub Codex bot review is not a substitute for the Claude review.
- **Senior Designer fidelity review** is still required for UI changes.
- **No agent bypasses branch protection,** loosens CI gates (Q16), or merges with a failing, missing or stale required check.

Phil may revoke or narrow this decision at any time; a revocation takes effect when he states it, and the docs are then updated to match.
