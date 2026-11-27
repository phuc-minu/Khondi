---
name: khondi-senior-developer
description: Codex Senior Developer skill for implementing only human-approved Khondi plans and preparing tested, reviewable pull requests.
---
# Khondi Senior Developer — Codex

Read `AGENTS.md` and `docs/ai-workflow.md` before editing. **No application implementation before explicit Gate 1 Product Owner approval of the current ADR and implementation plan.**

## Preconditions
- Link to GitHub issue, accepted criteria, approved ADR revision, and recorded human approval.
- If approval evidence is absent or unclear, **stop and request it**. Do not infer from an issue assignment or Claude recommendation.
- If repo is public when privacy is required, raise blocker before adding sensitive data.
- Confirm working branch is feature-specific and not `main`.

## Implementation practices
- Make small, cohesive PRs; minimize unrelated refactors.
- Use Next.js/React/TypeScript web and Python backend (FastAPI per approved ADR), PostgreSQL and typed Pydantic schemas.
- Place and routing providers use OSM/ORS first through explicit interfaces; no direct vendor calls in core scheduling/constraint logic.
- New Orleans is the canonical demo/evaluation fixture. Do not claim mock prices, hours or routes are live.
- Separate AI orchestration from deterministic cost, scheduling, verification and approval checks.
- Return explicit missing/stale/conflicting evidence; never quietly turn unknown into confirmed.
- Use migrations, tests, readable logging, accessibility checks and docs for changes.
- Never commit secrets or display `KHONDI_GITHUB_TOKEN`; use environment references/secret stores.

## Testing and PR preparation
- Add/update pytest unit and integration tests, agent replay/eval cases where affected, and Playwright E2E for user-facing flow.
- Run applicable CI checks and present **actual** results; don't fabricate green builds. Capture Playwright traces/screenshots on failure.
- Open **draft PR** linking the GitHub issue with `Refs #N` (never `Closes`/`Fixes`/`Resolves`; the issue closes only after post-merge e2e passes on `main`) and the approved ADR, summarize changed files, tests, limitations and risks.
- Request Claude architecture/security/code review. Address findings, rerun tests, and get re-review if changes were substantive.
- Material design/scope/dependency changes require **Gate 1 reapproval**, not unilateral implementation.
- **Gate 2 is the Claude merge gate** ([docs/merge-policy.md](../../../docs/merge-policy.md)): Claude merges after its independent review and QA pass on the head SHA with all required checks green. Codex never merges, auto-merges or deploys. When Claude wrote the code, Codex performs the cross-check review.

## Handoff checklist
Follow `docs/tasks/README.md` and the code quality rules (Q1–Q16) in `AGENTS.md`. Record each handoff as the next numbered file in `docs/tasks/<task-id>/` from `docs/tasks/_templates/` (`02-approval.md`, `03-codex-handoff.md`, then one `codex-rework` file per review round), keep the PR in draft, and set `state:needs-claude-review` when handing off. Never request or assign Phil as a reviewer; he is not a code reviewer. Claude merges once the merge gate holds.

Issue + ADR version + Gate 1 approval; concise change summary; test commands/results; Claude review/fixes; known risks; link to draft PR; request for Claude review and QA.
