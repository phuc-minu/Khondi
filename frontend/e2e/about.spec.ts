import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("about page", () => {
  test("has the title, one h1 and h2 sections in order", async ({ page }) => {
    const response = await page.goto("/about");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("About — Khondi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Khondi");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Who it's for",
      "What makes it different",
      "How it works",
      "Where Khondi is today",
    ]);
    await expect(page.getByText("Khondi is in early development. This site shows one sample New Orleans trip with illustrative costs. Nothing here is a live price, a booking or a guarantee that a place is open or available. Khondi doesn't sell or book travel. As live data sources are added, plans will show where their information came from and how current it is.")).toBeVisible();
    await expect(page.getByRole("list").filter({ hasText: "Set your budget" }).getByRole("listitem")).toHaveCount(3);
  });

  test("shows About in header and footer and marks it current", async ({ page }) => {
    await page.goto("/about");
    if ((page.viewportSize()?.width ?? 900) < 900) await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "About" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current", "page");
  });

  test("links to the example trip", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("main").getByRole("link", { name: "See example trip" }).click();
    await expect(page).toHaveURL(/\/trips\/new-orleans-example$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("New Orleans for $3,000");
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto("/about");
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations).toEqual([]);
  });

  test("has no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/about");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("makes no cross-origin requests", async ({ page }) => {
    const origins = new Set<string>();
    page.on("request", (request) => origins.add(new URL(request.url()).origin));
    await page.goto("/about");
    await page.waitForLoadState("networkidle");
    expect([...origins]).toEqual([new URL(page.url()).origin]);
  });
});
