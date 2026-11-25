import { expect, test } from "@playwright/test";

const headings: Readonly<Record<string, string>> = {
  "/": "Plan the right trip for your budget",
  "/about": "About Khondi",
  "/trips/new-orleans-example": "New Orleans for $3,000",
};

// T0014 removes this exception when it adds the starter route.
const pendingStarter = "/plan";

const footerSentence = "This site doesn't use cookies or analytics, and the trip planner keeps your answers in your browser.";
const approvedDisclaimers: Readonly<Record<string, string>> = {
  "/": "We don't show prices as live or places as verified unless they are.",
  "/about": "Nothing here is a live price, a booking or a guarantee that a place is open or available.",
};

test("all public pages keep distinct titles, one h1, and the approved claims and footer", async ({ page }) => {
  const titles = new Set<string>();
  for (const [path, heading] of Object.entries(headings)) {
    expect((await page.goto(path))?.status()).toBe(200);
    titles.add(await page.title());
    await expect(page.getByRole("heading", { level: 1 })).toHaveText([heading]);
    await expect(page.getByRole("contentinfo").getByText(footerSentence, { exact: true })).toBeVisible();

    let copy = (await page.locator("header, main, footer").allTextContents()).join(" ").replace(/\s+/g, " ");
    const disclaimer = approvedDisclaimers[path];
    if (disclaimer) {
      expect(copy).toContain(disclaimer);
      copy = copy.replace(disclaimer, "");
    }
    expect(copy, path).not.toMatch(/verified|live price|book now|guaranteed/i);
  }
  expect(titles.size).toBe(Object.keys(headings).length);
});

test("every public link reaches its page and any named anchor", async ({ page }) => {
  const destinations = new Set<string>();
  for (const path of Object.keys(headings)) {
    await page.goto(path);
    const links = await page.locator("header a[href], main a[href], footer a[href], a.skip-link").evaluateAll(
      (elements) => elements.map((element) => element.getAttribute("href")),
    );
    for (const href of links) {
      expect(href, path).toMatch(/^(?:\/(?!\/)|#.+$)/);
      if (href === pendingStarter) continue;
      destinations.add(new URL(href ?? "", page.url()).href);
    }
  }

  for (const href of destinations) {
    const { pathname, search, hash } = new URL(href);
    const heading = headings[pathname];
    expect(heading, href).toBeDefined();
    expect((await page.goto(pathname + search))?.status(), href).toBe(200);
    if (hash) {
      await page.goto(href);
      await expect(page).toHaveURL(href);
      await expect(page.locator(`[id="${hash.slice(1)}"]`)).toHaveCount(1);
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveText([heading]);
  }
});
