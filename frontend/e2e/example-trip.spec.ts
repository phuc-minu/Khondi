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
    await expect(page.getByRole("note")).toHaveText(
      "Illustrative estimate — not a quote. Prices are sample values for planning, not live fares or rates, and nothing here can be booked.",
    );
  });

  test("shows assumptions, costs, totals, no-buffer line and four days", async ({ page }) => {
    await page.goto(path);
    for (const text of ["2 adults", "San Francisco Bay Area (SFO, OAK or SJC)", "4 days, 3 nights", "An off-peak week in autumn; no specific dates", "Flying, economy, round trip"]) {
      await expect(page.getByRole("main").getByText(text)).toBeVisible();
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
    await expect(page.locator('tfoot th[scope="row"]')).toHaveCount(3);
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
            for (const match of text.matchAll(/\S+/g)) {
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
