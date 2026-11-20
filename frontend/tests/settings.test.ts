import { describe, expect, it, vi } from "vitest";

import { loadSettings } from "../src/settings";

describe("settings", () => {
  it("parses valid values", () => {
    vi.stubEnv("ENVIRONMENT", "ci");
    vi.stubEnv("API_BASE_URL", "http://api:8000");
    expect(loadSettings().ENVIRONMENT).toBe("ci");
  });

  it("names a missing variable without exposing values", () => {
    vi.stubEnv("ENVIRONMENT", "ci");
    vi.stubEnv("API_BASE_URL", "");
    expect(() => loadSettings()).toThrow("API_BASE_URL");
  });

  it("rejects invalid environment values", () => {
    vi.stubEnv("ENVIRONMENT", "production");
    vi.stubEnv("API_BASE_URL", "http://api:8000");
    expect(() => loadSettings()).toThrow("ENVIRONMENT");
  });
});
