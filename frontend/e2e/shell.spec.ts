import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("site shell", () => {
  test("has accessible landmarks and no third-party requests", async ({ page }) => {
    const origins = new Set<string>();
    page.on("request", (request) => origins.add(new URL(request.url()).origin));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect([...origins]).toEqual([new URL(page.url()).origin]);
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("main")).toHaveAttribute("id", "main");
    await expect(page.getByRole("link", { name: "Home" }).first()).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("This site doesn't use cookies or analytics, and the trip planner keeps your answers in your browser.")).toBeVisible();
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

  test("has no overflow and has 44px targets", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const boxes = await page.locator("header a, footer a").evaluateAll((links) => links.map((link) => { const rect = link.getBoundingClientRect(); return { width: rect.width, height: rect.height }; }));
    for (const box of boxes) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
  });
});
