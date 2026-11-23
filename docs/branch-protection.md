# Branch protection for `main`

Set these in GitHub under **Settings → Branches → Add branch ruleset** (or a classic rule) targeting `main`. Only the repository owner can change them. They are a setting, not code, so this file records what to configure.

| Setting | Value | Why |
| --- | --- | --- |
| Require a pull request before merging | On | No direct pushes to `main` |
| Required approving reviews | 0 | Agents merge Tier A without Phil; Tier B is enforced by CODEOWNERS below |
| Require review from Code Owners | On | Applies only to paths listed in `.github/CODEOWNERS` |
| Dismiss stale approvals on new commits | On | An approval applies to the head SHA it was given on |
| Require status checks to pass | On | See the list below |
| Require branches to be up to date before merging | On | Blocks merging on a stale check |
| Require conversation resolution | On | Review threads must be resolved |
| Require linear history | On | Matches squash merging |
| Block force pushes | On | |
| Restrict deletions | On | |
| Allow bypass | Nobody | "Do not bypass protections" stays true |

Required status checks, from `.github/workflows/quality.yml`: `detect`, `diff-hygiene`, `repo-tooling`, `secret-scan`, `backend`, `frontend`, `images`, `e2e`, `stack`. Confirm each name against a recent PR's check list when you add them, because a check that never reports will block every merge.

Repository settings, under **Settings → General**:

- Pull Requests: allow squash merging only, and turn on **Automatically delete head branches**.
- Leave **Allow auto-merge** off until the Tier A flow has run cleanly for a few PRs.

`.github/CODEOWNERS` change, to follow this PR as its own Tier B change: replace `* @phuc-minu` with the Tier B paths so Phil is requested only where the policy says so.

```text
/infra/                  @phuc-minu
/compose.yaml            @phuc-minu
/.github/                @phuc-minu
/backend/**/migrations/  @phuc-minu
/AGENTS.md               @phuc-minu
/docs/ai-workflow.md     @phuc-minu
/docs/merge-policy.md    @phuc-minu
/docs/branch-protection.md @phuc-minu
/docs/tasks/README.md    @phuc-minu
```

The repository is currently **public**, while `ai-workflow.md` says it is intended to start private. Check that nothing confidential is committed before relying on it either way.
