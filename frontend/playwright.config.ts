import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: {
    command: "npm run build && npm run start",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    // Match the frontend CI settings; shell tests do not call the API.
    env: { ENVIRONMENT: "ci", API_BASE_URL: process.env.API_BASE_URL ?? "http://api:8000" },
  },
  // With no override, Playwright derives baseURL from webServer.port.
  use: { baseURL: process.env.BASE_URL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
});
