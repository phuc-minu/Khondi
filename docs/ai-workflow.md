# Khondi AI collaboration and approval workflow

**Status: in force.** Merge tiers, the review-round cap and stacked-PR rules are in [merge-policy.md](merge-policy.md); once that is merged, Tier A replaces the per-PR Gate 2 below. Do not interpret a GitHub issue, draft PR, code generation, or absence of objection as approval.

## Temporary owner-delegated website exception (2026-11-20)

The Product Owner expressly requested: **“remove my review for now and let Claude and Codex create site for me.”** This grants a **narrow, revocable delegation** for [website epic #53](https://github.com/phuc-minu/Khondi/issues/53) and child issues #54–#60 **only**: static/responsive public landing, About, illustrative $3,000 New Orleans trip, demo budget/destination UX, shared front-end components and their tests.

- **Planning:** ChatGPT Product Manager requirements and preferred visual direction are already documented in #53–#60. Claude Architect (with UI designer input where available) may finalize a versioned website spec/implementation plan, decide non-material design details, and hand approved in-scope plans directly to Codex **without a fresh owner Gate 1 review**. Include a handoff record linking this delegated authorization; do not falsely label a spec PR as directly reviewed by the owner.
- **Implementation and review:** Codex may implement the bounded website scope in small draft PRs. Claude must independently review scope, security, UX/accessibility and code; Claude QA must run relevant real CI, tests and Playwright on the exact head SHA, with failure evidence and rework as needed. Senior Designer fidelity review where available. A GitHub Codex bot review **is not a substitute** for Claude review.
- **Merge:** For PRs affecting only this delegated website scope, Claude may mark ready and arrange a merge **after its own explicit passing review/QA verdict** and successful required checks, without requesting a fresh owner Gate 2 review. Record a handoff and merge authorization tied to the final commit; protect against stale checks. No merge when blocking issues remain.
- **Hard boundary:** No authorization for unrelated backend or infrastructure work, deployments, Azure provisioning/charges, secrets/credentials, external provider credentials, authentication/PII handling, payment/booking, destructive actions, broad architecture changes, or materially expanded product scope. Those still need the owner's normal approvals, plus separate authorization for deployment/provisioning. If uncertain, stop and ask.
- **Execution:** This is a recorded permission, not a running Claude/Codex job. The operator still needs to start agents through a supported integration; GitHub issue comments/labels do not auto-start sessions. Owner may revoke delegation at any time.

Outside this listed website scope, the normal Gate 1 and Gate 2 rules below continue unchanged.

## Ownership
| Actor | Accountable for | May not do |
| --- | --- | --- |
| Product Owner (human) | Product priorities, ADR approval, final code/merge approval | Approval cannot be delegated implicitly |
| ChatGPT — Product Manager | PRD, outcome, user journeys, prioritized issues, acceptance criteria, release requirements | Implement unapproved code or assert code has been reviewed |
| Claude — Architect | ADR, options, constraints, interface design, risk assessment, implementation plan | Authorize own architecture or start Codex without owner's approval |
| Senior Designer — UI/UX | Wireframes, UI specification, visual assets, accessibility and visual QA; uses OpenAI image generation when available | Implement unapproved designs or claim an image was generated without invoking a tool |
| Claude — Senior QA | Test plans, independent Playwright E2E, regression/eval verification, QA verdict and evidence | Substitute QA verdict for owner's code approval |
| Codex — Senior Developer | Code and tests against approved ADR, small draft PRs, fixes | Change major architecture without Gate 1 reapproval; merge/deploy |
| Codex — DevOps Engineer | Local Docker environment, Azure IaC, CI/CD, secret integration, observability, infrastructure tests and rollback documentation | Provision, incur cloud charges, deploy or delete resources without explicit environment-specific owner authorization |
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
- For infrastructure changes: Codex DevOps proposed local and Azure topology, cost estimate, resource inventory, IaC selection, security controls, deployment rollback and resource teardown plan; no implementation/provisioning before approval.
- Explicit **approval request**. Stop; no implementation until Product Owner states approval for this particular plan/version.

Record approval in a durable issue/PR comment or review with approver, timestamp and approved ADR version. If not obtainable, remain blocked. A draft ADR is a proposal, not an approval.

## Implementation and review
Codex works only from approved scope, makes small focused commits and draft PRs, links approved ADR and issue, and provides test commands/results. Never mark nonexistent test runs as passed. Claude reviews independently for correctness, evidence grounding, budget/date/route verification, authentication, secret handling, accessibility, and test sufficiency. Codex repairs issues; Claude re-reviews substantive updates. **Claude Senior QA** validates the exact PR commit with Playwright, pytest, integration and replay eval evidence, and reports blocked/failed suites explicitly. Senior Designer reviews implemented UI fidelity and accessibility. Codex DevOps validates approved infrastructure changes with IaC static checks, safe non-applying Azure what-if/plan, Docker health checks, security scan and documented cost impact; **Azure apply and deployments need separate explicit human approval**.

## Handoff records and quality rules
The concrete handoff steps, labels, file templates and audit folders are in [docs/tasks/README.md](tasks/README.md). The code quality rules (Q1–Q16) are in [AGENTS.md](../AGENTS.md). Claude's review verdict is recorded in the task folder; the Product Owner is asked to review a PR only after that verdict is `APPROVE_FOR_OWNER_REVIEW`.

## Gate 2: Product Owner code/PR review
Deliver before requesting approval:
- Draft PR link, linked issue and exact approved ADR version.
- Human-readable summary and full diff available.
- Claude review summary and disposition of review comments.
- Claude Senior QA report with verdict and reproducible evidence; Senior Designer UI review for visual changes.
- CI results: lint, unit, integration, agent replay evals, and **Playwright E2E** traces/screenshots or explicit explanation of blockers (block merge until passing).
- Risk and known limitation report, including any security or provider impacts.
- For infrastructure PRs: Azure what-if/plan without apply, estimated charges and ongoing operating costs, rollback and destroy plan, and verification that no unapproved resources were created.

**Stop for Product Owner code review.** No merge, auto-merge, branch protection bypass, deployment, payments, or real booking activity until the Product Owner explicitly authorizes the corresponding action. Approval of a PR is not authorization to create billable Azure resources or deploy to **any environment**; request explicit environment- and action-specific authorization. Never run destructive commands without separate approval.

## Architecture and scope baseline
Python backend, PostgreSQL, Next.js/React/TypeScript; OSM and ORS free-first behind providers; New Orleans demo/evals; independent deterministic verifier and constraints; model-neutral customer-facing LLM. Separate the Claude *engineering role* from the runtime model choice. The first technical MVP proves New Orleans trip intake → grounded tools → draft → deterministic verify → bounded repair → user-facing citations, with cost and latency evaluation. YouTube videos, deal discovery, affiliate offers, and proactive replanning are downstream roadmap phases unless expressly approved.

## Operational guardrails
- `KHONDI_GITHUB_TOKEN` must only be read from authorized secrets/environment, never copied to commits/logs/comments or chat.
- Repository intended to start private: halt any confidential upload if it is publicly visible.
- Use auditable GitHub issues, versioned ADRs, draft PRs, and recorded approvals. Tools and human approvals are required; instructions alone do not create automation.
