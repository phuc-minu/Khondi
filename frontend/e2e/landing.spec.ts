import { expect, test } from "@playwright/test";

const example = "/trips/new-orleans-example";

test("renders the four landing sections and the approved metadata", async ({ page }) => {
  expect((await page.goto("/"))?.status()).toBe(200);
  await expect(page).toHaveTitle("Khondi — Plan the right trip for your budget");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content", "Plan the right trip for your budget, with a day-by-day plan and every estimated cost laid out.",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(["Plan the right trip for your budget"]);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "How it works", "Why Khondi is different", "Sample trip: New Orleans for $3,000",
  ]);
  const steps = page.getByRole("region", { name: "How it works" }).getByRole("listitem");
  await expect(steps.locator("strong")).toHaveText(["Set your budget", "See what fits", "Get a grounded plan"]);
  await expect(steps.locator('[aria-hidden="true"]')).toHaveText(["1", "2", "3"]);
  await expect(page.getByRole("heading", { level: 3 })).toHaveText([
    "Budget first", "Costs with their assumptions", "Honest about what's known",
  ]);
  await expect(page.getByRole("note")).toHaveText("Illustrative estimate — not a quote.");
});

test("How it works is reachable from the home and About menus and focuses the section", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/about"]) {
    await page.goto(path);
    if ((page.viewportSize()?.width ?? 900) < 900) await page.getByRole("button", { name: "Menu" }).click();
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveText(["Home", "Example trip", "How it works", "About"]);
    await expect(nav.locator('[aria-current="page"]')).toHaveText([path === "/" ? "Home" : "About"]);
    await nav.getByRole("link", { name: "How it works" }).press("Enter");
    await expect(page).toHaveURL("/#how-it-works");
    const section = page.getByRole("region", { name: "How it works" });
    await expect(section).toBeFocused();
    const headerHeight = await page.getByRole("banner").evaluate((header) => header.getBoundingClientRect().height);
    await expect(section).toHaveCSS("scroll-margin-top", `${headerHeight}px`);
    const top = await section.evaluate((element) => element.getBoundingClientRect().top);
    expect(Math.round(top)).toBeGreaterThanOrEqual(Math.round(headerHeight));
  }
});

test("links to the pending planner and both example trip calls to action work", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Start planning" })).toHaveAttribute("href", "/plan");
  for (const name of ["See example trip", "See the full example"]) {
    await main.getByRole("link", { name }).click();
    await expect(page).toHaveURL(example);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("New Orleans for $3,000");
    await page.goto("/");
  }
});

for (const width of [320, 375, 768, 1280]) {
  test(`hero and cards fit and reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await page.goto("/");
    const hero = page.getByRole("region", { name: "Plan the right trip for your budget" });
    const art = hero.locator('[aria-hidden="true"]');
    if (width >= 768) {
      await expect(art).toBeVisible();
      const copyRight = await hero.locator(":scope > div").first().evaluate((copy) => copy.getBoundingClientRect().right);
      expect((await art.boundingBox())?.x).toBeGreaterThan(copyRight);
    } else {
      await expect(art).toBeHidden();
    }

    const steps = page.getByRole("region", { name: "How it works" }).getByRole("listitem");
    const features = page.getByRole("region", { name: "Why Khondi is different" }).locator("h3");
    for (const cards of [steps, features.locator("..")]) {
      const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
        const { left, top, right } = element.getBoundingClientRect();
        return { left, top, right, fits: element.scrollWidth <= element.clientWidth };
      }));
      expect(boxes).toHaveLength(3);
      expect(new Set(boxes.map((box) => box.top)).size).toBe(width >= 768 ? 1 : 3);
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
        expect(box.fits).toBe(true);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}
