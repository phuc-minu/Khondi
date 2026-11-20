# T0010 · Public website: three pages and budget-first flow · Delegated Gate 1 signoff

| Field | Value |
| --- | --- |
| Task | T0010-website-epic53 (also covers T0011-site-shell) |
| Step | 2 · Delegated plan signoff (replaces the owner's Gate 1 merge for this scope only) |
| Author | Claude (architect) |
| For | Codex (implementation), Senior Designer, Claude QA; record for Phil |
| Date (UTC) | 2026-11-20 15:50 |
| Branch | `claude/T0010-website-spec` |
| Commit signed off | `79c5023ae6bea7bcfbc8814ba04b8a690ef9725b` |
| Verdict | `SIGNED_OFF_UNDER_DELEGATION` for T0010 spec v1 and T0011 spec v1 |

## Authority used
- **Delegation.** [PR #61](https://github.com/phuc-minu/Khondi/pull/61), "docs: delegate limited website #53 approvals to Claude after QA". It was opened by `phuc-minu` and merged into `main` by `phuc-minu` at 2026-11-20 15:14:19 UTC (merge commit `a74e385`). The text is in `AGENTS.md` and `docs/tasks/README.md`, section "Temporary owner-delegated website exception (2026-11-20)". It is repeated at the top of issues #53–#60.
- **Quoted owner instruction:** "remove my review for now and let Claude and Codex create site for me."
- **Caveat.** Agents in this repository also act through the `phuc-minu` GitHub account. The PR #61 merge therefore can't, on its own, prove a human made it. Claude relies on it because:
  - it is on `main`;
  - it matches the issues the owner account opened;
  - the operator instructed Claude to work under it.

  The owner can revoke the delegation at any time.

## What is signed off
- `docs/tasks/T0010-website-epic53/01-spec.md` **v1** at the commit above: routes, copy, tokens, components, fixture contract, acceptance criteria, test plan and the T0011–T0015 sequence.
- `docs/tasks/T0011-site-shell/01-spec.md` **v1** at the commit above.
- Both are inside the delegated scope: static/responsive public pages, the demo budget UX, the illustrative $3,000 New Orleans trip, shared front-end components and their tests.

## Not signed off, and outside this delegation
- Backend, API, database, Docker/Compose, CI workflow or gate-setting changes.
- Deployment, hosting, Azure, DNS.
- Secrets, provider credentials.
- Auth, accounts, PII.
- Analytics or cookies.
- Live prices, bookings, payments.
- Maps.

Any task that needs one of these stops and goes to the owner through the normal gates.

## Non-material decisions made by Claude (allowed by the delegation)
1. **Sample trip assumptions.** 2 adults, flying from the SF Bay Area, 4 days / 3 nights, off-peak autumn with no dates. The PM's sample line items are kept as party totals summing to exactly $3,000. There is no contingency, and the page says so plainly. The not-included list is fixed.
2. **No imagery in v1.** No licensed or original assets exist yet. The owner's concept images are direction only (#55).
3. **No Compare control.** There is no contact link or privacy page; the footer states the site's real data behavior instead (Q4: no placeholders).
4. **PR order.** Shell → About → Example → Planner → Landing, instead of the PM's shell → landing → … This means no PR ever ships a link to a page that doesn't exist yet.
5. **No styling or runtime dependencies.** System fonts and CSS Modules only. Test-only dev dependencies are `@playwright/test` and `@axe-core/playwright`.
6. **The planner never adjusts sample prices to the visitor's answers.** It says so instead. Scaling a sample would invent numbers.

**Material changes need the owner.** Changing the product promise, adding live data or bookings, or changing the $3,000 / New Orleans framing would need the owner's normal Gate 1 approval.

## Senior Designer input
- **No Senior Designer session ran for this spec.** No OpenAI image-generation call was made, and no new mockups exist.
- Designer input is the written direction in #55 and the PM brief in #54, which reflects the owner's preferred concepts. The three concept images are not in the repository and were not available to Claude.
- The visual system (tokens, type, spacing, component behavior) is Claude's translation of that direction. Contrast ratios were computed, not estimated.
- **Request to the Designer (optional, non-blocking under the delegation):**
  - review T0010 "Design tokens" and "Shared components" for fidelity to the preferred concepts;
  - review QA's screenshots on each website PR;
  - propose licensed or original imagery as a later in-scope task.

  Record any response as a comment on #55 or as the next numbered file here.

## Dependency status and Codex handoff
- **T0011 is not dependency-ready.** It needs PR #52 (T0003) merged.
- As of 2026-11-20 15:45 UTC, PR #52 is an open draft labelled `state:needs-rework`. Its head is `905bde2`, and CI shows `backend` and `diff-hygiene` failing. Claude's round-1 review lists 12 blocking findings.
- Its frontend lockfile also has 1 critical and 3 high `npm audit` advisories in `next 15.1.6` / `react 19.0.0`. Details are in T0010 "Dependencies".
- **No task has been handed to Codex yet.** Claude will post the T0011 handoff as a comment on #53 and #60. The operator starts Codex with the prompt below **only after PR #52 is merged**. Codex's `02-approval.md` must confirm that, and stop otherwise.

```text
Implement task T0011-site-shell in phuc-minu/Khondi under the owner's website delegation (PR #61).
Read AGENTS.md and docs/tasks/README.md, then docs/tasks/T0010-website-epic53/01-spec.md (v1),
docs/tasks/T0010-website-epic53/02-claude-delegated-signoff.md and docs/tasks/T0011-site-shell/01-spec.md (v1).
First check the T0011 preconditions: PR #52 must be merged and frontend/package.json must exist on main; run npm audit --omit=dev.
If PR #52 is not merged, write 02-approval.md saying so, set state:blocked and stop.
Otherwise: branch codex/T0011-site-shell from main, write 02-approval.md citing the delegated signoff (not an owner merge),
implement only the T0011 spec, follow the Q1-Q16 rules, write 03-codex-handoff.md with real command output
(npm run lint, typecheck, test, e2e and npm audit), update docs/tasks/INDEX.md, open a draft PR and set state:needs-claude-review.
Do not merge. Claude reviews and runs QA on the exact head commit before any delegated merge.
```

## How later tasks proceed
For T0012–T0015, each task works the same way:
1. Claude writes that task's `01-spec.md`, narrowing T0010 v1, when the previous task has merged.
2. Claude signs it off in a numbered file in that task's folder.
3. Claude hands it to Codex.

**Merging under the delegation** happens only after all of these:
- Claude's own review and QA verdict passes on the exact head commit;
- the required checks have succeeded on that commit;
- the merge authorization is recorded in the task folder.

No stale checks, and no merge while any blocking finding is open.
