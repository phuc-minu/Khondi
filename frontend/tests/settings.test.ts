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

  it("reads the telemetry endpoint and diagnostics switch, treating empty as unset", () => {
    vi.stubEnv("ENVIRONMENT", "ci");
    vi.stubEnv("API_BASE_URL", "http://api:8000");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
    vi.stubEnv("DIAGNOSTICS_ENABLED", "");
    expect(loadSettings()).toMatchObject({
      OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
      DIAGNOSTICS_ENABLED: false,
    });
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4318");
    vi.stubEnv("DIAGNOSTICS_ENABLED", "true");
    expect(loadSettings()).toMatchObject({
      OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4318",
      DIAGNOSTICS_ENABLED: true,
    });
  });

  it.each(["false", "yes", "1"])("treats DIAGNOSTICS_ENABLED=%s as off or invalid", (value) => {
    vi.stubEnv("ENVIRONMENT", "ci");
    vi.stubEnv("API_BASE_URL", "http://api:8000");
    vi.stubEnv("DIAGNOSTICS_ENABLED", value);
    if (value === "false") {
      expect(loadSettings().DIAGNOSTICS_ENABLED).toBe(false);
    } else {
      expect(() => loadSettings()).toThrow("DIAGNOSTICS_ENABLED");
    }
  });

  it("rejects invalid environment values", () => {
    vi.stubEnv("ENVIRONMENT", "production");
    vi.stubEnv("API_BASE_URL", "http://api:8000");
    expect(() => loadSettings()).toThrow("ENVIRONMENT");
  });
});
