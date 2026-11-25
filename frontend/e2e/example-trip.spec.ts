import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const path = "/trips/new-orleans-example";

test.describe("example trip page", () => {
  test("has the title, one h1 and the note above the first h2", async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Sample trip: New Orleans for $3,000 — Khondi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("New Orleans for $3,000");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const noteAboveFirstH2 = await page.evaluate(() => {
      const note = document.querySelector("main [role=note]");
      const h2 = document.querySelector("main h2");
      return Boolean(note && h2 && note.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(noteAboveFirstH2).toBe(true);
    await expect(page.locator("main header").getByRole("listitem")).toHaveText([
      "2 adults", "4 days, 3 nights", "Flying from the San Francisco Bay Area",
    ]);
    await expect(page.getByRole("note")).toHaveText(
      "Illustrative estimate — not a quote. Prices are sample values for planning, not live fares or rates, and nothing here can be booked.",
    );
  });

  test("shows assumptions, costs, totals, no-buffer line and four days", async ({ page }) => {
    await page.goto(path);
    const assumptions = page.getByRole("region", { name: "Trip assumptions" });
    for (const text of ["2 adults", "San Francisco Bay Area (SFO, OAK or SJC)", "4 days, 3 nights", "An off-peak week in autumn; no specific dates", "Flying, economy, round trip"]) {
      await expect(assumptions.getByText(text)).toBeVisible();
    }
    for (const item of ["Travel insurance", "Checked bag fees", "Shopping and souvenirs", "Travel to and from your home airport"]) {
      await expect(page.getByRole("listitem").filter({ hasText: item })).toBeVisible();
    }
    const table = page.getByRole("table", { name: "Estimated costs for 2 travelers (party total)" });
    for (const [label, covers, amount] of [
      ["Flights", "Round-trip economy for 2, including taxes and one carry-on each", "$900"],
      ["Hotel", "3 nights in one room, including taxes and fees", "$1,050"],
      ["Food and drink", "Meals and tips for 2 people over 4 days", "$450"],
      ["Activities", "Tours, music venues and museum entry", "$350"],
      ["Getting around", "Airport transfers, streetcar passes and occasional rideshares", "$250"],
    ]) {
      const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: label, exact: true }) });
      await expect(row).toContainText(covers);
      await expect(row).toContainText(amount);
    }
    for (const [label, amount] of [["Total", "$3,000"], ["Budget", "$3,000"], ["Remaining", "$0"]]) {
      await expect(table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: label, exact: true }) })).toContainText(amount);
    }
    await expect(page.getByText("This sample uses the full budget and has no buffer. For a real trip, keep some money aside for surprises.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: /^Day \d — / })).toHaveCount(4);
    await expect(page.getByText("Dinner and live music on Frenchmen Street")).toBeVisible();
    await expect(page.getByText("These are suggestions, not reservations. Check opening hours, prices and availability before you go.")).toBeVisible();
  });

  test("has table caption and header scopes", async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("table caption")).toHaveCount(1);
    await expect(page.locator('thead th[scope="col"]')).toHaveCount(3);
    await expect(page.locator('tbody th[scope="row"]')).toHaveCount(5);
    await expect(page.locator('tfoot th[scope="row"]')).toHaveCount(3);
  });

  test("matches the budget bar and legend to the cost table without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const budget = page.getByRole("region", { name: "Where the $3,000 goes" });
    const bar = budget.locator('[aria-hidden="true"]');
    const legend = budget.getByRole("list").getByRole("listitem");
    const table = budget.getByRole("table");

    const budgetText = await table.getByRole("row", { name: /^Budget / }).getByRole("cell").innerText();
    const toDollars = (text: string) => Number(text.replace(/[$,]/g, ""));
    const rows = await table.locator("tbody tr").evaluateAll((elements) =>
      elements.map((row) => ({
        label: row.querySelector("th")?.textContent ?? "",
        amount: row.querySelector("td:last-child")?.textContent ?? "",
      })),
    );
    const weights = rows.map(({ amount }) => (toDollars(amount) / toDollars(budgetText)) * 100);
    let total = 0;

    await expect(budget.getByText(`${budgetText} total`, { exact: true })).toBeVisible();
    await expect(bar).toBeVisible();
    await expect(bar).toHaveCSS("column-gap", "2px");
    expect(await bar.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor),
    );
    await expect(bar.locator("span")).toHaveCount(rows.length);
    await expect(legend).toHaveCount(rows.length);
    for (const [index, { label, amount }] of rows.entries()) {
      const item = legend.nth(index);
      const segment = bar.locator("span").nth(index);
      const width = weights[index];
      const percentage = Number.isInteger(width) ? width.toString() : width.toFixed(1);
      await expect(item.getByText(label, { exact: true })).toBeVisible();
      await expect(item.getByText(amount, { exact: true })).toBeVisible();
      await expect(item.getByText(`${percentage}%`, { exact: true })).toBeVisible();
      await expect(segment).toHaveCSS("animation-name", "none");
      const { pixels, available, weight, color } = await segment.evaluate((element) => {
        const bar = element.parentElement;
        if (!bar) throw new Error("Budget segment has no parent");
        const style = getComputedStyle(element);
        return {
          pixels: element.getBoundingClientRect().width,
          available: bar.clientWidth - (bar.childElementCount - 1) * 2,
          weight: Number(style.flexGrow),
          color: style.backgroundColor,
        };
      });
      expect(weight).toBeCloseTo(width, 4);
      expect(Math.abs(pixels - available * width / 100)).toBeLessThan(1);
      await expect(item.locator("[data-category]")).toHaveCSS("background-color", color);
      total += weight;
    }
    expect(total).toBeCloseTo(100, 4);
  });

  test("aligns sections without overflow and reflows day cards at 768px", async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const leftEdge = await page.locator("header a:first-child > svg").evaluate((element) => element.getBoundingClientRect().left);
      const headingEdges = await page.locator("main h1, main h2").evaluateAll((headings) =>
        headings.map((heading) => heading.getBoundingClientRect().left),
      );
      expect(headingEdges).toEqual([leftEdge, leftEdge, leftEdge, leftEdge]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      const days = page.getByRole("region", { name: "Day by day" });
      await expect(days.getByRole("heading", { level: 3 })).toHaveText([
        /^Day 1 — /, /^Day 2 — /, /^Day 3 — /, /^Day 4 — /,
      ]);
      const cards = await days.locator("section").evaluateAll((sections) =>
        sections.map((section) => {
          const { x, y } = section.getBoundingClientRect();
          return { x, y };
        }),
      );
      expect(cards).toHaveLength(4);
      const columns = width < 768 ? 1 : 2;
      expect(new Set(cards.map(({ x }) => x)).size).toBe(columns);
      expect(new Set(cards.map(({ y }) => y)).size).toBe(4 / columns);
      expect(cards).toEqual([...cards].sort((a, b) => a.y - b.y || a.x - b.x));
    }
  });

  test("contains none of the forbidden claims", async ({ page }) => {
    await page.goto(path);
    const text = (await page.getByRole("main").innerText()).toLowerCase();
    for (const phrase of ["verified", "live price", "book now", "guaranteed"]) {
      expect(text).not.toContain(phrase);
    }
  });

  test("lists Example trip second in header and footer and marks it current", async ({ page }) => {
    await page.goto(path);
    if ((page.viewportSize()?.width ?? 900) < 900) await page.getByRole("button", { name: "Menu" }).click();
    for (const name of ["Main", "Footer"]) {
      const links = page.getByRole("navigation", { name }).getByRole("link");
      await expect(links).toHaveText(["Home", "Example trip", "About"]);
    }
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Example trip" })).toHaveAttribute("aria-current", "page");
  });

  test("has no axe violations, overflow or cross-origin requests", async ({ page }) => {
    const origins = new Set<string>();
    page.on("request", (request) => origins.add(new URL(request.url()).origin));
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect([...origins]).toEqual([new URL(page.url()).origin]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations).toEqual([]);
  });

  for (const width of [320, 375, 414]) {
    test(`cost table wraps only at word boundaries at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const result = await page.evaluate(() => {
        const brokenWords: string[] = [];
        for (const cell of document.querySelectorAll("table tbody th, table tbody td")) {
          const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent ?? "";
            for (const match of text.matchAll(/[^\s-]+/g)) {
              const range = document.createRange();
              range.setStart(node, match.index ?? 0);
              range.setEnd(node, (match.index ?? 0) + match[0].length);
              if (range.getClientRects().length > 1) brokenWords.push(match[0]);
            }
          }
        }
        const wrapper = document.querySelector("table")?.parentElement;
        return {
          brokenWords,
          tableFits: wrapper ? wrapper.scrollWidth <= wrapper.clientWidth : false,
          pageFits: document.documentElement.scrollWidth <= window.innerWidth,
        };
      });
      expect(result).toEqual({ brokenWords: [], tableFits: true, pageFits: true });
    });
  }

  test("About Khondi button leads to the about page", async ({ page }) => {
    await page.goto(path);
    await page.getByRole("main").getByRole("link", { name: "About Khondi" }).click();
    await expect(page).toHaveURL(/\/about$/);
  });
});
