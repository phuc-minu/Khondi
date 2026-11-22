// Tracing for the Next.js server (T0007). Spans follow redaction rules R1-R4
// (docs/tasks/T0007-observability/01-spec.md): Next.js and the fetch instrumentation record
// full URLs, query strings included, so every span is cleaned on its way out of the process.
import { type Attributes, type Context, type Link, SpanKind } from "@opentelemetry/api";
import {
  AlwaysOnSampler,
  BatchSpanProcessor,
  ParentBasedSampler,
  type ReadableSpan,
  type Sampler,
  SamplingDecision,
  type SamplingResult,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { type Configuration, OTLPHttpProtoTraceExporter } from "@vercel/otel";

import type { Settings } from "./settings";

export const HEALTH_PATH = "/api/healthz";
const URL_ATTRIBUTES = new Set(["http.url", "url.full", "http.target"]);
// Client addresses and user agents (R3); query strings and headers (R2).
const DROPPED_ATTRIBUTES = new Set([
  "client.address",
  "net.peer.ip",
  "http.client_ip",
  "http.user_agent",
  "user_agent.original",
  "url.query",
]);
const DROPPED_PREFIXES = ["http.request.header.", "http.response.header."];
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)[^/@\s]*@/gi;

export function maskCredentials(text: string): string {
  return text.replace(URL_CREDENTIALS, "$1***@");
}

function withoutQuery(text: string): string {
  return text.replace(/\?\S*/g, "");
}

function clean(attributes: Attributes): Attributes {
  const cleaned: Attributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (DROPPED_ATTRIBUTES.has(key) || DROPPED_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      continue;
    }
    cleaned[key] =
      typeof value === "string"
        ? maskCredentials(URL_ATTRIBUTES.has(key) ? withoutQuery(value) : value)
        : value;
  }
  return cleaned;
}

export function redactSpan(span: ReadableSpan): ReadableSpan {
  return {
    name: maskCredentials(withoutQuery(span.name)),
    kind: span.kind,
    spanContext: () => span.spanContext(),
    parentSpanContext: span.parentSpanContext,
    startTime: span.startTime,
    endTime: span.endTime,
    // The status message can repeat an exception message (R1); the code is kept.
    status: { code: span.status.code },
    attributes: clean(span.attributes),
    links: span.links,
    events: span.events.map((event) => ({ ...event, attributes: clean(event.attributes ?? {}) })),
    duration: span.duration,
    ended: span.ended,
    resource: span.resource,
    instrumentationScope: span.instrumentationScope,
    droppedAttributesCount: span.droppedAttributesCount,
    droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
  };
}

export class RedactingSpanExporter implements SpanExporter {
  constructor(private readonly exporter: SpanExporter) {}

  export(spans: ReadableSpan[], resultCallback: Parameters<SpanExporter["export"]>[1]): void {
    this.exporter.export(spans.map(redactSpan), resultCallback);
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }

  async forceFlush(): Promise<void> {
    await this.exporter.forceFlush?.();
  }
}

/** Every trace except Compose's health checks, which would bury real requests (AC 7). */
export class SkipHealthChecks implements Sampler {
  private readonly sampler = new ParentBasedSampler({ root: new AlwaysOnSampler() });

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[],
  ): SamplingResult {
    const target = attributes["http.target"];
    if (
      spanKind === SpanKind.SERVER &&
      typeof target === "string" &&
      withoutQuery(target) === HEALTH_PATH
    ) {
      return { decision: SamplingDecision.NOT_RECORD };
    }
    return this.sampler.shouldSample(context, traceId, spanName, spanKind, attributes, links);
  }

  toString(): string {
    return "SkipHealthChecks";
  }
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function telemetryConfig(settings: Settings): Configuration {
  const apiPrefix = `${settings.API_BASE_URL.replace(/\/+$/, "")}/`;
  const endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/+$/, "");
  return {
    serviceName: "khondi-web",
    attributes: { "deployment.environment": settings.ENVIRONMENT },
    traceSampler: new SkipHealthChecks(),
    // Explicit, so nothing is exported without an endpoint: "auto" reads the environment
    // directly and falls back to a default collector address on this machine.
    spanProcessors: endpoint
      ? [
          new BatchSpanProcessor(
            new RedactingSpanExporter(
              new OTLPHttpProtoTraceExporter({ url: `${endpoint}/v1/traces` }),
            ),
          ),
        ]
      : [],
    instrumentationConfig: {
      fetch: {
        // Trace headers go to the api only, never to third parties. Without the "don't" rule
        // the instrumentation also adds them to any plain-http URL on this machine.
        propagateContextUrls: [apiPrefix],
        dontPropagateContextUrls: [new RegExp(`^(?!${escapeForRegExp(apiPrefix)})`)],
      },
    },
  };
}
