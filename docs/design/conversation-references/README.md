# Khondi UI conversation — graphic reference boards

These four repository-hosted **SVG reference boards** reconstruct the visual hierarchy and product decisions from the ChatGPT conversation. They are **not exact copies** of the original generated raster mockups, not licensed travel photography, and not production-ready design assets. The original images were generated in ChatGPT; this issue-update workflow cannot attach those binary PNG files to GitHub using the currently available connector.

**Approved brand tagline:** **Your budget, your trip**. A supporting hero question may read **Where can your budget take you?**. The direction is calm, minimal, premium and budget-first (not the earlier crowded itinerary dashboards).

## Primary visual concepts

### 1. Landing / Discover
![Khondi budget-first landing reference](https://raw.githubusercontent.com/phuc-minu/Khondi/docs/khondi-ui-conversation-graphics/docs/design/conversation-references/landing-reference.svg)

- Primary CTA: **Plan my trip**; secondary CTA: **See New Orleans trip**.
- Budget → destination → grounded plan is the centerpiece; concise credible differentiators and lots of whitespace.

### 2. $3,000 New Orleans illustrative example
![Khondi New Orleans sample trip reference](https://raw.githubusercontent.com/phuc-minu/Khondi/docs/khondi-ui-conversation-graphics/docs/design/conversation-references/new-orleans-3000-reference.svg)

- Example **$3,000 total** is illustrative, **not live or bookable**.
- Sample totals: flights $900, lodging $1,050, food $450, activities $350, local transport $250, adding to $3,000. Confirm assumptions (party, origin, nights, tax/contingency) in final design.
- The original visuals include 4-day sample itinerary cards and a hero image of the French Quarter; this board reconstructs those elements with simple vector geometry.

### 3. About / differentiation
![Khondi About reference](https://raw.githubusercontent.com/phuc-minu/Khondi/docs/khondi-ui-conversation-graphics/docs/design/conversation-references/about-reference.svg)

- Explain the mission, target travelers, transparent budgets and realistic constraints without implying superiority or guaranteed verification.

### 4. Budget → destination → itinerary journey
![Khondi user flow reference](https://raw.githubusercontent.com/phuc-minu/Khondi/docs/khondi-ui-conversation-graphics/docs/design/conversation-references/budget-first-flow-reference.svg)

- Progressive disclosure rather than a dense dashboard.
- Demo mode must distinguish illustrative from live data.

## Historical visual direction
Earlier conversation also included (a) a simple panoramic landing with four feature icons and (b) two dense, five-day New Orleans dashboard variants with maps, evidence and video cards. **These are secondary exploratory concepts**, not the preferred default page. Their content can inform future #22–#27 deeper detail states without bringing dashboard density to Home.

## Design-to-code boundaries
- Treat these SVGs as wireframe-style reference graphics. The UI Designer must supply real desktop/mobile layouts, tokens, licensed/original assets, semantics and accessibility before implementation.
- Core public site, issue #53: Claude may sign off and Codex may implement under the **narrow delegated approval** in PR #61, with independent Claude QA and Playwright passing before merge.
- Wider UI epic #16 features (#21–#30 as applicable) **retain normal owner approvals** unless separately delegated.
- Never assert verified attractions, route timing, availability or live prices from these images.
