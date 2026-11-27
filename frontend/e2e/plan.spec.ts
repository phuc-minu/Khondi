import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const examplePath = "/trips/new-orleans-example";
const stepOne = "Step 1 of 3 — Your budget";
const stepTwo = "Step 2 of 3 — Destinations that fit";
const different = "Your answers are different from the sample, so its costs won't match your trip. We don't adjust sample prices to your answers.";
const below = "Your budget is below this sample's $3,000 total.";

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations).toEqual([]);
}

test("shows focused, linked field errors and passes axe in both form states", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const response = await page.goto("/plan");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Start planning — Khondi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start planning");
  await expectNoOverflow(page);
  await expectAccessible(page);

  const fields = [
    ["Total budget (USD)", "Enter your total budget in whole dollars, from $500 to $50,000."],
    ["Travelers", "Choose 1 to 4 travelers."],
    ["Trip length", "Choose a trip length from 1 to 5 days."],
    ["Leaving from (optional)", "Use 60 characters or fewer."],
  ];
  // Force invalid values past the native controls to exercise every parser error in the UI.
  for (const label of ["Travelers", "Trip length"]) {
    const select = page.getByLabel(label);
    await select.evaluate((element) => element.append(new Option("Invalid", "0")));
    await select.selectOption("0");
  }
  const origin = page.getByLabel("Leaving from (optional)");
  await origin.evaluate((element) => element.removeAttribute("maxlength"));
  await origin.fill("A".repeat(61));

  await page.getByRole("button", { name: "See what fits" }).click();
  const summary = page.getByRole("main").getByRole("alert");
  await expect(summary).toBeFocused();
  await expect(summary.getByRole("heading")).toHaveText("Please fix the following");
  for (const [label, message] of fields) {
    const field = page.getByLabel(label);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription(message);
    await summary.getByRole("link", { name: message, exact: true }).click();
    await expect(field).toBeFocused();
  }
  await expectNoOverflow(page);
  await expectAccessible(page);
});

test("shows the budget notes, announces step 2, and keeps every raw answer when editing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/plan");
  const progress = page.getByRole("list", { name: "Planning progress" });
  await expect(progress.getByRole("listitem")).toHaveText(["Set a budget (current)", "See what fits", "Read the plan"]);
  const current = progress.locator('[aria-current="step"]');
  await expect(current).toHaveText("Set a budget (current)");
  await expect(page.getByText("Your answers stay in this browser tab. They aren't sent anywhere or saved.")).toBeVisible();
  await page.getByLabel("Total budget (USD)").fill("2,999");
  await page.getByLabel("Travelers").selectOption("3");
  await page.getByLabel("Trip length").selectOption("2");
  await page.getByLabel("Leaving from (optional)").fill(" Boston ");
  await page.getByRole("checkbox", { name: "Food" }).check();
  await page.getByRole("checkbox", { name: "Museums" }).check();
  await page.getByRole("button", { name: "See what fits" }).click();

  await expect(page.getByRole("heading", { name: stepTwo })).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("Step 2 of 3");
  await expect(current).toHaveText("See what fits (current)");
  await expect(page.getByRole("heading", { name: "New Orleans (sample)" })).toBeVisible();
  await expect(page.getByText(different, { exact: true })).toBeVisible();
  await expect(page.getByText(below, { exact: true })).toBeVisible();
  await expect(page.getByText("You picked: Food, Museums", { exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await expectAccessible(page);

  await page.getByRole("button", { name: "Change my answers" }).click();
  await expect(page.getByRole("heading", { name: stepOne })).toBeFocused();
  await expect(current).toHaveText("Set a budget (current)");
  await expect(page.getByLabel("Total budget (USD)")).toHaveValue("2,999");
  await expect(page.getByLabel("Travelers")).toHaveValue("3");
  await expect(page.getByLabel("Trip length")).toHaveValue("2");
  await expect(page.getByLabel("Leaving from (optional)")).toHaveValue(" Boston ");
  await expect(page.getByRole("checkbox", { name: "Food" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Museums" })).toBeChecked();

  await page.getByLabel("Total budget (USD)").fill("3000");
  await page.getByRole("button", { name: "See what fits" }).click();
  await expect(page.getByText(different, { exact: true })).toBeVisible();
  await expect(page.getByText(below, { exact: true })).toHaveCount(0);
});

test("prefills the sample, shows no notes for a match, and ignores unknown sources", async ({ page }) => {
  await page.goto("/plan?from=new-orleans-example");
  await expect(page.getByText("Pre-filled from the New Orleans sample.")).toBeVisible();
  await expect(page.getByLabel("Total budget (USD)")).toHaveValue("3000");
  await expect(page.getByLabel("Travelers")).toHaveValue("2");
  await expect(page.getByLabel("Trip length")).toHaveValue("4");
  await expect(page.getByLabel("Leaving from (optional)")).toHaveValue("San Francisco Bay Area");
  await page.getByRole("checkbox", { name: "Music" }).check();
  await page.getByRole("button", { name: "See what fits" }).click();
  await expect(page.getByRole("heading", { name: stepTwo })).toBeVisible();
  await expect(page.getByText("You picked: Music")).toBeVisible();
  await expect(page.getByText(different, { exact: true })).toHaveCount(0);
  await expect(page.getByText(below, { exact: true })).toHaveCount(0);

  await page.goto("/plan?from=other");
  await expect(page.getByLabel("Total budget (USD)")).toBeEmpty();
  await expect(page.getByLabel("Leaving from (optional)")).toBeEmpty();
  await expect(page.getByText("Pre-filled from the New Orleans sample.")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("completes the flow by keyboard without background requests", async ({ page }) => {
  const requests: { url: string; type: string; method: string }[] = [];
  page.on("request", (request) => requests.push({ url: request.url(), type: request.resourceType(), method: request.method() }));
  await page.goto("/plan");
  const origin = new URL(page.url()).origin;

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Total budget (USD)")).toBeFocused();
  await page.keyboard.type("3941");
  for (const label of ["Travelers", "Trip length", "Leaving from (optional)"]) {
    await page.keyboard.press("Tab");
    await expect(page.getByLabel(label)).toBeFocused();
  }
  await page.keyboard.type("Private test origin");
  for (const interest of ["Food", "Music", "History", "Outdoors", "Museums"]) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox", { name: interest })).toBeFocused();
  }
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "See what fits" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: stepTwo })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Open the sample plan" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Change my answers" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: stepOne })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Total budget (USD)")).toHaveValue("3941");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: stepTwo })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`${origin}${examplePath}`);
  await page.waitForLoadState("networkidle");

  expect(requests.filter((request) => {
    const url = new URL(request.url);
    const pageNavigation = request.type === "document" && ["/plan", examplePath].includes(url.pathname) && !url.search;
    const asset = ["script", "stylesheet", "image", "font"].includes(request.type) && url.pathname.startsWith("/_next/static/");
    return url.origin !== origin || request.method !== "GET" || !(pageNavigation || asset);
  })).toEqual([]);
});

test("links all entry CTAs and fits the 320px viewport with a 44px header target", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ["/", "/about", examplePath, "/plan"]) {
    await page.goto(path);
    await expectNoOverflow(page);
    await page.getByRole("button", { name: "Menu" }).click();
    const cta = page.getByRole("banner").getByRole("link", { name: "Start planning" });
    const box = await cta.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("banner").getByRole("link", { name: "Start planning" }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await page.goto("/about");
  await page.getByRole("main").getByRole("link", { name: "Start planning" }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await page.goto(examplePath);
  await page.getByRole("link", { name: "Customize this trip" }).click();
  await expect(page).toHaveURL(/\/plan\?from=new-orleans-example$/);
  await expect(page.getByLabel("Total budget (USD)")).toHaveValue("3000");
});

test("places the progress and form in two columns from 768px", async ({ page }) => {
  for (const width of [767, 768]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/plan");
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    const formHeading = await page.getByRole("heading", { name: stepOne }).boundingBox();
    expect(heading).not.toBeNull();
    expect(formHeading).not.toBeNull();
    if (width === 768) {
      expect(formHeading?.x).toBeGreaterThan((heading?.x ?? 0) + (heading?.width ?? 0));
    } else {
      expect(formHeading?.y).toBeGreaterThan((heading?.y ?? 0) + (heading?.height ?? 0));
    }
    await expectNoOverflow(page);
  }
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("offers the sample plan without exposing an unusable form", async ({ page }) => {
    await page.goto("/plan");
    const message = page.locator("noscript p");
    await expect(message).toBeVisible();
    await expect(message).toHaveText("The planner needs JavaScript. You can still read the sample trip.");
    await expect(page.getByLabel("Total budget (USD)")).toBeHidden();
    await page.locator("noscript a").click();
    await expect(page).toHaveURL(/\/trips\/new-orleans-example$/);
  });
});
