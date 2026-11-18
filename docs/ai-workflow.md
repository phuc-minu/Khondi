# Khondi AI collaboration and approval workflow

**Status: PROPOSED — awaiting Product Owner approval.** This document becomes binding for agents only after review/merge. Do not interpret a GitHub issue, draft PR, code generation, or absence of objection as approval.

## Ownership
| Actor | Accountable for | May not do |
| --- | --- | --- |
| Product Owner (human) | Product priorities, ADR approval, final code/merge approval | Approval cannot be delegated implicitly |
| ChatGPT — Product Manager | PRD, outcome, user journeys, prioritized issues, acceptance criteria, release requirements | Implement unapproved code or assert code has been reviewed |
| Claude — Architect | ADR, options, constraints, interface design, risk assessment, implementation plan | Authorize own architecture or start Codex without owner's approval |
| Senior Designer — UI/UX | Wireframes, UI specification, visual assets, accessibility and visual QA; uses OpenAI image generation when available | Implement unapproved designs or claim an image was generated without invoking a tool |
| Claude — Senior QA | Test plans, independent Playwright E2E, regression/eval verification, QA verdict and evidence | Substitute QA verdict for owner's code approval |
| Codex — Senior Developer | Code and tests against approved ADR, small draft PRs, fixes | Change major architecture without Gate 1 reapproval; merge/deploy |
| Claude — Code Reviewer | Independent security, architecture, performance, correctness and test review | Give owner's final approval or merge |
| CI + Playwright | Build, lint, pytest/unit/integration, end-to-end browser and agent replay evals | Substitute for human review |

## State transitions
`BACKLOG → REQUIREMENTS_READY → DESIGN_AND_ADR_PROPOSED → AWAITING_PLAN_APPROVAL → APPROVED_FOR_IMPLEMENTATION → IMPLEMENTING → DRAFT_PR → CLAUDE_REVIEW → SENIOR_QA_TESTING → AWAITING_OWNER_CODE_REVIEW → APPROVED_FOR_MERGE → MERGED`

Any requested correction at Gate 1 returns to `ADR_PROPOSED`. Material implementation changes in architecture, scope, dependencies, user privacy, external providers or costs require **Gate 1 reapproval**. Claude review findings send the work back to `IMPLEMENTING`; rerun relevant tests after fixes. Any missing/failed Playwright or CI result blocks merge. Only owner authorization permits transition to `APPROVED_FOR_MERGE` or deployment.

## Gate 1: Product Owner plan/ADR review
Claude delivers:
- Linked GitHub issue and Product Manager-approved requirements/acceptance criteria.
- ADR: context, considered alternatives, decision recommendation, risks, security/privacy, API boundaries, and provider substitutions.
- Step-by-step implementation plan decomposed into small PRs, affected files/modules, tests, expected tool/API costs and dependencies.
- For UI changes: Senior Designer annotated responsive mockups, accessibility/interaction states, design assets or OpenAI-generated image concepts (only if actually generated), and visual acceptance criteria.
- Claude Senior QA test strategy covering critical paths, Playwright scenarios, regression risks, and evaluation cases.
- Explicit **approval request**. Stop; no implementation until Product Owner states approval for this particular plan/version.

Record approval in a durable issue/PR comment or review with approver, timestamp and approved ADR version. If not obtainable, remain blocked. A draft ADR is a proposal, not an approval.

## Implementation and review
Codex works only from approved scope, makes small focused commits and draft PRs, links approved ADR and issue, and provides test commands/results. Never mark nonexistent test runs as passed. Claude reviews independently for correctness, evidence grounding, budget/date/route verification, authentication, secret handling, accessibility, and test sufficiency. Codex repairs issues; Claude re-reviews substantive updates. **Claude Senior QA** validates the exact PR commit with Playwright, pytest, integration and replay eval evidence, and reports blocked/failed suites explicitly. Senior Designer reviews implemented UI fidelity and accessibility.

## Gate 2: Product Owner code/PR review
Deliver before requesting approval:
- Draft PR link, linked issue and exact approved ADR version.
- Human-readable summary and full diff available.
- Claude review summary and disposition of review comments.
- Claude Senior QA report with verdict and reproducible evidence; Senior Designer UI review for visual changes.
- CI results: lint, unit, integration, agent replay evals, and **Playwright E2E** traces/screenshots or explicit explanation of blockers (block merge until passing).
- Risk and known limitation report, including any security or provider impacts.

**Stop for Product Owner code review.** No merge, auto-merge, branch protection bypass, deployment, payments, or real booking activity until the Product Owner explicitly authorizes the corresponding action. Approval of a PR is not implicit approval of production deployment; ask separately.

## Architecture and scope baseline
Python backend, PostgreSQL, Next.js/React/TypeScript; OSM and ORS free-first behind providers; New Orleans demo/evals; independent deterministic verifier and constraints; model-neutral customer-facing LLM. Separate the Claude *engineering role* from the runtime model choice. The first technical MVP proves New Orleans trip intake → grounded tools → draft → deterministic verify → bounded repair → user-facing citations, with cost and latency evaluation. YouTube videos, deal discovery, affiliate offers, and proactive replanning are downstream roadmap phases unless expressly approved.

## Operational guardrails
- `KHONDI_GITHUB_TOKEN` must only be read from authorized secrets/environment, never copied to commits/logs/comments or chat.
- Repository intended to start private: halt any confidential upload if it is publicly visible.
- Use auditable GitHub issues, versioned ADRs, draft PRs, and recorded approvals. Tools and human approvals are required; instructions alone do not create automation.
