import { loadSettings } from "./settings";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    loadSettings();
  }
}
