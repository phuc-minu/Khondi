# T0004 · Compose stack and networking · Claude (DevOps) rework · round 1

| Field | Value |
| --- | --- |
| Task | T0004-compose-stack |
| Step | 05 · Rework, round 1 |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (re-review) |
| Date (UTC) | 2026-11-22 15:40 |
| PR | #64 |
| Commit after rework | `66e8af5` (fix); this file is added in the next commit |
| Responds to | The two P1 inline findings from the GitHub Codex review of `ecced94` on #64 (2026-11-22 14:34 UTC). Codex's own review, `04-codex-review-r1.md` (APPROVE_FOR_OWNER_REVIEW), is on `claude/T0007-collector`. |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

Numbering: `04-codex-review-r1.md` was committed on `claude/T0007-collector` (#72), not on this branch. This file is `05` so the folder stays in order once the stack is merged.

The GitHub review gave its findings no IDs, so they are named B1 and B2 here.

## Response to each finding
| ID | Finding | Action | Commit | Notes |
| --- | --- | --- | --- | --- |
| B1 | `scripts/dev-reset.py:75`, "Require the exact confirmation string before deleting data": `answer.strip()` accepted `" RESET "`, but the spec (item and AC 3) says `RESET` *exactly*, any other input exits 1 (Q1). | fixed | `66e8af5` | The answer is compared unmodified. `input()` already removes the line ending, so typing `RESET` and Enter still works. Tests: `" RESET"`, `"RESET "` and `"\tRESET"` added to `test_any_other_answer_deletes_nothing`. |
| B2 | `scripts/dev-reset.py:80`, "Pin the destructive command to the project shown for confirmation": volumes were listed for the hard-coded `khondi` project, but `docker compose down --volumes --remove-orphans` ran without a project name, so `COMPOSE_PROJECT_NAME` (shell or `.env`) would redirect it to another project. | fixed | `66e8af5` | `down` now runs with `--project-name khondi` before the subcommand. Test: `test_deletes_the_same_project_it_listed` sets `COMPOSE_PROJECT_NAME=someone-else` and checks the flag and its position. |

## Commands run and real output
Repo-tooling job commands (`ruff==0.16.9`, `mypy==2.3.1`, `pytest==9.1.1`) in `ghcr.io/astral-sh/uv:0.6.14-python3.12-bookworm-slim` on a copy of the branch.

**Before the fix,** new tests only:
```text
FAILED scripts/tests/test_dev_reset.py::test_any_other_answer_deletes_nothing[ RESET]
FAILED scripts/tests/test_dev_reset.py::test_any_other_answer_deletes_nothing[RESET ]
FAILED scripts/tests/test_dev_reset.py::test_any_other_answer_deletes_nothing[\tRESET]
FAILED scripts/tests/test_dev_reset.py::test_deletes_the_same_project_it_listed
4 failed, 51 passed in 0.07s
```
**After:**
```text
All checks passed!
4 files already formatted
Success: no issues found in 4 source files
55 passed in 0.06s
```
**The project override on real Docker** (Docker Desktop, this branch's `compose.yaml`, `.env` copied from `.env.example`):
```text
$ COMPOSE_PROJECT_NAME=someone-else docker compose -f compose.yaml config --format json   # .name
without flag: someone-else
$ COMPOSE_PROJECT_NAME=someone-else docker compose --project-name khondi -f compose.yaml config --format json
with flag:    khondi
```
CI on the new head: not run at the time of writing; results go in a PR comment.

## Anything else changed
Nothing. The fix touches only `scripts/dev-reset.py` (+14 / −2) and its tests.
