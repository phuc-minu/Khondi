# Merge policy: Claude merge gate, issue closure, review rounds and stacked PRs

**Status: in force once PR #80 merges.** It records the Product Owner's decision of 2026-11-23, [D0001](decisions/D0001-claude-merges-code.md): *"Have Claude merge code, remove Phil as code reviewer for this project."* It applies to every PR in the repository, not only the website epic.

Phil does not review code. He is never requested or assigned as a PR reviewer. Claude reviews, runs QA, decides and performs the merge. Phil still decides the things listed under [What still needs Phil](#what-still-needs-phil).

## Gate 2: the Claude merge gate

Gate 2 used to be the owner's code review. It is now this checklist. Claude merges a PR only when **every** item holds on the PR's **current head SHA**, or on the reviewed SHA carried to the head under [Evidence-only commits](#evidence-only-commits):

1. **Approved scope.** The task has an approved spec (Gate 1, or the epic #53 delegated sign-off), and the diff stays inside it. Nothing was added that the spec did not cover: no new dependency, provider, cost or product scope beyond what was approved.
2. **Independent Claude code review** using the [`khondi-architect-reviewer`](../.claude/skills/khondi-architect-reviewer/SKILL.md) skill gives `APPROVE_FOR_MERGE` on this SHA, recorded in `NN-claude-review-rK.md`. The reviewing Claude session is not the session that wrote the code.
3. **Claude Senior QA** using the [`khond-senior-qa`](../.claude/skills/khond-senior-qa/SKILL.md) skill passes on this SHA, with real test output and Playwright evidence for user-facing changes.
4. **Senior Designer fidelity review** passes for any UI change.
5. **Codex cross-check** passes when Claude wrote the code. From T0014 on Codex implements and Claude reviews; when that is reversed, Codex reviews the Claude-authored diff before merge. A GitHub Codex bot review does not replace the Claude review in item 2.
6. **Every required check is green** on this SHA (see [branch-protection.md](branch-protection.md)), and the branch is up to date with `main`. A skipped, pending, cancelled or missing required check is not green.
7. **No blocking finding is open,** and every review thread is resolved. Non-blocking findings are fixed or have a linked follow-up issue.
8. **Nothing on the hard boundary** is in the diff unless Phil has explicitly approved it (see below), and that approval is linked.
9. **The PR body uses `Refs #N`** for its issues and contains no `Closes`, `Fixes` or `Resolves` keyword (see [Closing issues](#closing-issues)).

### Evidence-only commits

The review, QA and merge records are committed to the PR branch, so recording a verdict always creates a new head SHA. Those commits do not void the verdict. Any other push does: review and QA then run again on the new SHA.

The verdicts on a reviewed SHA carry over to the current head only when every change between the two is an evidence file:

- a **new** file in this task's folder, `docs/tasks/<task-id>/`, that is a Claude review (`NN-claude-review-rK.md`), designer review, Codex cross-check or merge record (`NN-merge-record.md`); and
- this task's row in `docs/tasks/INDEX.md`.

Nothing else may change: no code, tests, config, other docs, existing handoff files, or other tasks' rows. A merge or rebase from `main` changes code, so it voids the verdicts too. The merging Claude proves the carry-over before merging and records the output in the merge record:

```bash
git diff --name-status <reviewed-sha> <head-sha>    # only "A docs/tasks/<task-id>/NN-..." lines and "M docs/tasks/INDEX.md"
git diff <reviewed-sha> <head-sha> -- docs/tasks/INDEX.md    # only this task's row changed
```

The required checks must still be green on the current head, because that is the commit that merges.

### How Claude merges

1. Write `NN-merge-record.md` from [the template](tasks/_templates/merge-record.md) on the PR branch: reviewed SHA, review and QA files, designer and Codex cross-check results, required-check run link, hard-boundary statement. Set the task to `merged` in `INDEX.md` in the same commit.
2. Wait for the required checks on the new head, then mark the PR ready and set `state:ready-to-merge`.
3. Squash-merge pinned to the head SHA, so a late push cannot slip in: `gh pr merge <n> --squash --match-head-commit <head-sha>`.
4. Never use admin merge, bypass rules, or enable auto-merge.
5. Close the linked issues only as described in the next section.

If a check is red or stale, or anything in the gate fails, Claude does not merge. It sets `state:needs-rework` or `state:blocked` and says why on the PR.

## Closing issues

An issue is closed only after its PR has merged **and** the end-to-end tests have passed on `main` after the merge.

- PR bodies reference issues as `Refs #N`. Never write `Closes #N`, `Fixes #N` or `Resolves #N` (or their variants), because GitHub would close the issue at merge time, before `main` is verified.
- After merging, the merging Claude finds the `Quality gates` workflow run triggered by the push to `main` whose commit is the merge commit. Because runs on `main` cancel each other (the workflow's `concurrency` setting), if that run was cancelled, use the first later completed run on `main` whose commit contains the merge commit.
- The `e2e` job in that run must have concluded **success**. Skipped, cancelled or failed does not count.
- Claude then closes each referenced issue with a comment that names the PR, the merge commit, and links the `main` run, for example: `Merged in #81 (abc1234). Post-merge e2e passed on main: <run URL>.`
- If `e2e` fails on `main`, the issue stays open. Claude comments with the failing run, and the fix goes through a new PR under this same policy.
- An epic issue closes when all its child issues are closed.

## What still needs Phil

The decision removed Phil from code review only. These remain his, unchanged:

- **Gate 1 plan and spec approval** as documented in [ai-workflow.md](ai-workflow.md) and [tasks/README.md](tasks/README.md). Phil approves a spec by merging its spec PR; Claude does not merge spec PRs for him. The website delegation for epic #53 continues for that epic's plans as written in [AGENTS.md](../AGENTS.md).
- **The hard boundary.** Phil's explicit approval is required for: deployments to any environment; Azure provisioning or anything that incurs charges; secrets and credentials; external provider credentials; authentication and personal data (PII) handling; payments and booking; destructive actions. When a PR touches one of these, Claude merges only after Phil's approval is recorded, either in the approved Gate 1 spec that names it or in an `NN-owner-decision.md` file from [the template](tasks/_templates/owner-decision.md), and the PR waits under `state:needs-owner-approval` until then. Merging never authorizes running a deployment, provisioning or destructive action; each still needs its own action-specific approval at the time it is run.
- **Product scope.** Anything that widens scope beyond the approved spec returns to Gate 1.
- **Loosening the gates.** Changing CI, lint, type-check or coverage settings (Q16), or this policy's hard boundary, needs its own approved task.

If it is unclear whether something is on the hard boundary, treat it as if it is and ask Phil.

## Review rounds

- Each finding is **blocking** or **non-blocking**. Only blocking findings force another round. Non-blocking findings become follow-up issues linked from the review file and do not hold the PR.
- At most **two** review rounds. If round 2 still has a blocking finding, Claude sets `state:blocked` and does not merge. Claude chooses one of: split the blocked part into its own task, stop the PR, or (if the fix changes scope) return the spec to Gate 1 for Phil. There is no round 3, and a blocking finding is never waived to make a merge.
- A reviewer does not raise a finding that lint, type-check or the quality jobs already enforce. Fix those in CI, not in review.
- Codex answers every finding by ID in its rework file.

## Stacked PRs

Prefer small independent PRs that branch from `main`. Stack only when PR B cannot be written without PR A's code.

1. A stacked PR targets its parent's branch, says `Depends on #N` in the body, and stays a **draft** until its parent merges.
2. Merge bottom-up. After a parent merges, retarget each child to `main` (`gh pr edit <n> --base main`), rebase it, and re-run review and QA on the new head SHA.
3. Never merge a child into a branch other than `main`. Work merged into a feature branch is not on `main` and does not count as merged.
4. Spec-only and docs PRs never stack.
5. Keep stacks to two PRs. A longer stack means the task should be split differently.

## Branch protection

The settings this policy relies on are in [branch-protection.md](branch-protection.md). Without required, up-to-date status checks, nothing would stop a merge past a failing or stale check.
