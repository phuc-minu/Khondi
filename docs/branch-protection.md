# Branch protection for `main`

These are repository settings, not code. Only the repository owner can change them, and agents never change them through the API or bypass them. This file records what is configured and what the [merge policy](merge-policy.md) relies on.

## Current `Main` ruleset (read 2026-11-23)

The active ruleset `Main` targets `refs/heads/main` with no bypass actors.

| Setting | Value | Why it matters under the Claude merge gate |
| --- | --- | --- |
| Require a pull request before merging | On | No direct pushes to `main` |
| Required approving reviews | 0 | Phil is not a code reviewer; Claude's verdicts live in the task folder, not as GitHub approvals |
| Require review from Code Owners | On | Harmless once `.github/CODEOWNERS` lists no owners (see below) |
| Dismiss stale reviews on push | On | |
| Require approval for unattributed changes | On | Left as is. If it ever blocks a Claude merge, Claude stops and asks Phil; it does not work around it |
| Require conversation resolution | On | Review threads must be resolved (merge gate item 7) |
| Required status checks | `detect`, `diff-hygiene`, `repo-tooling`, `secret-scan`, `backend`, `frontend`, `images`, `e2e`, `stack` | Merge gate item 6 |
| Require branches to be up to date | On (strict) | Blocks merging on a stale check |
| Require linear history | On | Matches squash merging |
| Block force pushes | On | |
| Restrict deletions | On | |
| Bypass | Nobody | |

The disabled ruleset `RuleSet-Limited` has no effect.

## CODEOWNERS

Until PR #80, `.github/CODEOWNERS` contained `* @phuc-minu`. Combined with **Require review from Code Owners**, that is what forced Phil's review on every PR. PR #80 removes the rule, so no path has a code owner and GitHub requires no owner review. Phil is not added back for any path, including `infra/` or `.github/`: the hard-boundary items in the merge policy are decided by Phil's explicit approval of the action or spec, recorded in the task folder, not by a code review.

## Optional owner changes

None of these is required for the policy to work. Phil may make them at any time:

- **Turn off "Require review from Code Owners".** With an empty CODEOWNERS it does nothing; turning it off just removes a setting that no longer applies. Leaving it on is also fine.
- **Restrict allowed merge methods to squash.** The ruleset currently allows merge, squash and rebase; linear history already blocks merge commits, and Claude always squash-merges.
- **Turn on "Automatically delete head branches"** under Settings → General → Pull Requests.
- **Delete the old `state:ready-for-phil` label.** The `Sync labels` workflow creates and updates labels from `.github/labels.json` but never deletes them.

Keep **Allow auto-merge** off and keep the required status checks and bypass list as they are; the merge gate depends on them. If a required check is renamed in `.github/workflows/quality.yml`, update this list in the ruleset in the same change, because a check that never reports blocks every merge.

The repository is currently **public**, while `ai-workflow.md` says it is intended to start private. Check that nothing confidential is committed before relying on it either way.
