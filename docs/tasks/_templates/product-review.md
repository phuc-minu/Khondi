# T0000 · <Task title> · Product review handoff

| Field | Value |
| --- | --- |
| Task | T0000-<slug> |
| Step | NN · Product review request |
| Author | Claude (or requesting role) |
| For | ChatGPT Product Manager, then Product Owner if a decision is needed |
| Date (UTC) | YYYY-MM-DD HH:MM |
| Issue / PR | #<n> / #<n> |
| Branch | <branch or "no task branch; issue comment only"> |
| Commit / spec version | <exact SHA, spec version, or "not available"> |
| State | NEEDS_PRODUCT_REVIEW |
| Responds to | <previous task handoff filename or issue comment URL> |

## Product decision needed
One specific question or decision; state why it affects the user outcome, scope, priority, or acceptance criteria.

## Product context
- User / problem / outcome:
- Approved product requirements (links and versions):
- Current behavior or proposed change:
- Exact scope delta, if any:
- Alternatives and tradeoffs:
- Dependencies, impact on timeline, usability and risks:

## Requested ChatGPT output
- [ ] Clarify/adjust user stories or acceptance criteria
- [ ] Decide recommendation or reprioritization for the owner's Gate 1 decision
- [ ] Identify whether a new Gate 1 approval is needed
- [ ] Update or propose relevant GitHub issues (never silently rewrite approved scope)

## Evidence and links
List exact GitHub issue/PR, affected spec/ADR paths, trace/test evidence if relevant. Do not include secrets or personal data.

## Required follow-up
ChatGPT records its response as a GitHub issue comment (or a new, numbered append-only `NN-product-response.md` when a task branch exists), links the response to the handoff, and makes explicit whether product advice is **recommendation** or a **Product Owner decision**. Claude then updates the spec/ADR proposal and returns to Gate 1 if scope or architecture changed.

**Stop conditions:** No Codex implementation of disputed/changed scope and no automatic merge or deployment while the decision is unresolved. A GitHub label is not an instruction received by a live ChatGPT session.
