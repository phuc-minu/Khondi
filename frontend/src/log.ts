import { isSpanContextValid, trace } from "@opentelemetry/api";

import { loadSettings } from "./settings";
import { maskCredentials } from "./telemetry";

type Level = "INFO" | "WARNING" | "ERROR";
type Fields = Record<string, string | number | boolean>;

/** One JSON line on stdout with the backend's fields, including the active trace (Q14). */
export function log(level: Level, logger: string, message: string, fields: Fields = {}): void {
  const context = trace.getActiveSpan()?.spanContext();
  const traced = context !== undefined && isSpanContextValid(context);
  const line = {
    timestamp: new Date().toISOString(),
    level,
    logger,
    message: maskCredentials(message),
    service: "khondi-web",
    environment: loadSettings().ENVIRONMENT,
    trace_id: traced ? context.traceId : "",
    span_id: traced ? context.spanId : "",
    ...fields,
  };
  process.stdout.write(`${JSON.stringify(line)}\n`);
}
