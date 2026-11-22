import { registerOTel } from "@vercel/otel";

import { loadSettings, type Settings } from "./settings";
import { telemetryConfig } from "./telemetry";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    let settings: Settings;
    try {
      settings = loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid configuration";
      process.stderr.write(`${message}\n`);
      process.exit(1);
    }
    registerOTel(telemetryConfig(settings));
  }
}
