import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const example = "/trips/new-orleans-example";
const routes = ["/", "/about", example, "/plan"];
const footerSentence = "This site doesn't use cookies or analytics, and the trip planner keeps your answers in your browser.";

test.describe("site shell", () => {
  test("has accessible landmarks and no third-party requests", async ({ page }) => {
    const origins = new Set<string>();
    page.on("request", (request) => origins.add(new URL(request.url()).origin));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect([...origins]).toEqual([new URL(page.url()).origin]);
    if ((page.viewportSize()?.width ?? 900) < 900) await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("main")).toHaveAttribute("id", "main");
    await expect(page.getByRole("link", { name: "Home" }).first()).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(footerSentence)).toBeVisible();
    await expect(page.getByText("© 2026 Khondi")).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations).toEqual([]);
  });

  test("skip link moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("keeps the tagline out of main content and serves the local icon", async ({ page, request }) => {
    for (const path of routes) {
      await page.goto(path);
      await expect(page.getByRole("main").getByText("Your budget, your trip")).toHaveCount(0);
      await expect(page.locator("link[rel=icon]")).toHaveAttribute("href", "/khondi.svg");
    }
    expect((await request.get("/khondi.svg")).status()).toBe(200);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plan the right trip for your budget");
  });

  test("aligns header, main content and footer at all widths without overflow", async ({ page }) => {
    for (const width of [1280, 768, 375, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 640 : 800 });
      const expectedLeft = Math.max((width - 1120) / 2, width >= 768 ? 32 : 16);
      for (const path of routes) {
        await page.goto(path);
        if (width < 900) await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
        const leadingContent = page.locator("header a:first-child > svg, main h1, footer p:first-child > svg");
        const leftEdges = await leadingContent.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().left));
        expect(leftEdges, `${path} at ${width}px`).toEqual([expectedLeft, expectedLeft, expectedLeft]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      }
    }
  });

  test("is sticky and gives the skip target the header clearance", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(example);
    const header = page.getByRole("banner");
    const height = await header.evaluate((element) => element.getBoundingClientRect().height);
    await expect(page.getByRole("main")).toHaveCSS("scroll-margin-top", `${height}px`);
    await page.evaluate(() => window.scrollTo(0, 500));
    expect(await page.evaluate(() => window.scrollY)).toBe(500);
    expect(await header.evaluate((element) => element.getBoundingClientRect().top)).toBe(0);
    await expect(header.getByRole("link", { name: "Start planning" })).toHaveCSS("min-height", "48px");
  });

  test("menu works by click and keyboard and restores focus on close and navigation", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Menu" });
    const menu = page.locator("#header-menu");
    await expect(trigger).toHaveAttribute("aria-controls", "header-menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeHidden();
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.click();
    await expect(menu).toBeHidden();
    await trigger.press("Enter");
    for (const name of ["Home", "Example trip", "How it works", "About", "Start planning"]) {
      await page.keyboard.press("Tab");
      await expect(menu.getByRole("link", { name, exact: true })).toBeFocused();
    }
    const boxes = await page.locator("header a:visible, header button:visible, footer a:visible").evaluateAll((targets) =>
      targets.map((target) => {
        const { left, right, width, height } = target.getBoundingClientRect();
        return { left, right, width, height };
      })
    );
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(320);
    }
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.press("Space");
    await menu.getByRole("link", { name: "Start planning" }).click();
    await expect(page).toHaveURL("/plan");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(menu.locator('[aria-current="page"]')).toHaveCount(0);
  });

  test("keeps the navigation visible without JavaScript", async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 640 } });
    try {
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Menu" })).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
      await page.getByRole("banner").getByRole("link", { name: "Start planning" }).click();
      await expect(page).toHaveURL("/plan");
    } finally {
      await page.close();
    }
  });

  test("disables smooth scrolling and button transitions for reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const cta = page.getByRole("banner").getByRole("link", { name: "Start planning" });
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
    await expect(cta).toHaveCSS("transition-property", "background-color, color");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    await expect(cta).toHaveCSS("transition-property", "none");
  });
});
