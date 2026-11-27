# T0000 · <Task title> · Owner decision

Use this only for decisions that are still Phil's: a hard-boundary approval (deployment, Azure provisioning or charges, secrets and credentials, external provider credentials, authentication/PII, payments/booking, destructive actions), a scope change, or a blocked-PR decision. Phil does not review code; merges are recorded in `merge-record.md`.

| Field | Value |
| --- | --- |
| Task | T0000-<slug> |
| Step | NN · Owner decision |
| Decision by | Phil |
| Recorded by | Phil, or Claude quoting Phil's words |
| Date (UTC) | YYYY-MM-DD HH:MM |
| PR or issue | #<n> |
| Commit or spec version decided on | <full sha or vN> |
| Topic | `hard-boundary: <item>` / `scope` / `blocked-pr` |
| Decision | `APPROVED` / `REJECTED` / `REWORK` / `CANCELLED` |

## Phil's words
Quote or link Phil's approval or request (issue or PR comment, or project message).

## What exactly is approved
The specific action or change, its environment and limits. Approval of a merge never authorizes running a deployment, provisioning or destructive action; name those separately if Phil approved them.

## Follow-ups
Anything Phil asked to be done later as a new task.
