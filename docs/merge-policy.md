# Merge policy: tiers, review rounds and stacked PRs

**Status: PROPOSED — takes effect only when the Product Owner merges this PR.** Until then the gates in [ai-workflow.md](ai-workflow.md) apply unchanged.

This policy lets agents merge low-risk work without waiting for Phil, and keeps Phil's review for work where a mistake is expensive or hard to undo. Phil approves the policy once, by merging this PR. It replaces per-PR Gate 2 for Tier A only.

## Tier A: agents may merge

A PR is Tier A only if **all** of these hold:

1. Its task has a merged spec (`01-spec.md`), and the diff stays inside that spec's scope.
2. It touches none of the Tier B paths or topics below.
3. It adds no dependency, or the spec already approved that exact dependency.
4. Claude review and Claude QA both give a passing verdict on the PR's **final head SHA**, and every required check is green on that same SHA.
5. No finding labelled blocking is open.

When all five hold, Claude marks the PR ready and squash-merges it, then records the merge in the task folder (`NN-merge-record.md`: PR, head SHA, verdicts, check results) and updates `INDEX.md`. A push after the verdicts voids them; re-run review and QA on the new SHA.

The website delegation in AGENTS.md (epic #53) is a Tier A authorization for that epic only and stays as written.

## Tier B: Phil decides

Phil reviews and merges when a PR does any of the following:

- changes `infra/`, `compose.yaml`, `.github/`, migrations, or the files that define these rules (`AGENTS.md`, `docs/ai-workflow.md`, `docs/merge-policy.md`, `docs/branch-protection.md`, `docs/tasks/README.md`);
- adds or changes a provider, an external service, a cost, or a dependency not approved in the spec;
- touches secrets, credentials, authentication, personal data, payment or booking;
- changes CI, lint, type-check or coverage settings (Q16);
- deploys, provisions or deletes anything, or is otherwise destructive;
- widens product scope beyond the spec.

If it is unclear which tier applies, it is Tier B. Gate 1 (spec approval) still applies to every task not already covered by an approved epic scope, and a spec for a Tier B change needs Phil's approval.

## Review rounds

- Each finding is **blocking** or **non-blocking**. Only blocking findings force another round. Non-blocking findings become follow-up issues linked from the review file and do not hold the PR.
- At most **two** review rounds. If round 2 still has a blocking finding, the PR gets `state:blocked` and Phil decides in one step: accept with a follow-up issue, re-scope, split, or stop. There is no round 3.
- A reviewer does not raise a finding that lint, type-check or the quality jobs already enforce. Fix those in CI, not in review.
- Codex answers every finding by ID in its rework file, as today.

This replaces the three-round limit in `docs/tasks/README.md`.

## Stacked PRs

Prefer small independent PRs that branch from `main`. Stack only when PR B cannot be written without PR A's code.

1. A stacked PR targets its parent's branch, says `Depends on #N` in the body, and stays a **draft** until its parent merges.
2. Merge bottom-up. After a parent merges, retarget each child to `main` (`gh pr edit <n> --base main`), rebase it, and re-run review and QA on the new head SHA.
3. Never merge a child into a branch other than `main`. Work merged into a feature branch is not on `main` and does not count as merged.
4. Spec-only and docs PRs never stack.
5. Keep stacks to two PRs. A longer stack means the task should be split differently.
6. Tier is decided per PR, and a child is Tier B if its parent is Tier B.

## Branch protection

The required settings are in [branch-protection.md](branch-protection.md). Tier A merging depends on them: without them nothing stops an agent merging past a failing or stale check.
