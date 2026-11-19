# T0000 · <Task title> · Spec

| Field | Value |
| --- | --- |
| Task | T0000-<slug> |
| Step | 1 · Spec (Gate 1 proposal) |
| Author | Claude (architect) |
| For | Phil (approval), then Codex (implementation) |
| Date (UTC) | YYYY-MM-DD HH:MM |
| Spec version | v1 |
| Related | Issue #, ADR link, earlier tasks |

## Goal
One or two sentences on the user or system outcome, in plain language.

## Context
Why this is needed now and what already exists. Link the ADR sections and code it builds on.

## Scope
**In scope**
- Each item is something Codex must build.

**Out of scope**
- Things that look related but must not be touched in this task.

## Design
Modules and files to add or change, interfaces and data shapes (with types), error cases and how each is handled, logging and tracing, and any migration. Name the existing patterns Codex must follow.

## Acceptance criteria
Numbered, each one testable. QA checks every one of these.
1. Given ..., when ..., then ...

## Test plan
| Criterion | Test type (unit / integration / replay eval / Playwright) | What the test proves |
| --- | --- | --- |
| 1 | | |

## Dependencies
New packages or services, each with the reason. Write "None" if none.

## Risks and open questions
Anything Phil should decide before approving.

## Size
Expected diff size and whether it should be split into more than one PR. Target: under 400 changed lines excluding lockfiles and fixtures.

## Approval request
Phil, please approve spec **v1** of T0000 by merging this spec PR. Merging is the Gate 1 approval. Request changes on the PR if anything should differ.
