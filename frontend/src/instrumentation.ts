import { loadSettings } from "./settings";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid configuration";
      process.stderr.write(`${message}\n`);
      process.exit(1);
    }
  }
}
