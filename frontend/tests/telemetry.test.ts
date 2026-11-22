import { ROOT_CONTEXT, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import {
  InMemorySpanExporter,
  SamplingDecision,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { registerOTel } from "@vercel/otel";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { log } from "../src/log";
import { loadSettings } from "../src/settings";
import { RedactingSpanExporter, SkipHealthChecks, telemetryConfig } from "../src/telemetry";
import type { Settings } from "../src/settings";
import { captureLogLines, FakeServer } from "./helpers";

const api = new FakeServer(200, {});
// On "localhost", which @vercel/otel would send trace headers to by default.
const thirdParty = new FakeServer(200, {}, "localhost");
const spans = new InMemorySpanExporter();
const tracer = () => trace.getTracer("khondi-web-test");
let thirdPartyBase = "";

beforeAll(async () => {
  vi.stubEnv("ENVIRONMENT", "ci");
  vi.stubEnv("API_BASE_URL", await api.start());
  thirdPartyBase = await thirdParty.start();
  // The production configuration, with an in-memory exporter behind the production redaction.
  registerOTel({
    ...telemetryConfig(loadSettings()),
    spanProcessors: [new SimpleSpanProcessor(new RedactingSpanExporter(spans))],
  });
});

afterEach(() => {
  spans.reset();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await api.stop();
  await thirdParty.stop();
  vi.unstubAllEnvs();
});

describe("trace context", () => {
  it("is sent to the api and to no one else", async () => {
    const traceId = await tracer().startActiveSpan("request", async (span) => {
      await fetch(`${loadSettings().API_BASE_URL}/v1/diagnostics/echo`);
      await fetch(`${thirdPartyBase}/elsewhere`);
      span.end();
      return span.spanContext().traceId;
    });
    const [toApi] = api.received;
    expect(String(toApi.headers.traceparent)).toMatch(new RegExp(`^00-${traceId}-[0-9a-f]{16}-01$`));
    const [toOther] = thirdParty.received;
    expect(toOther.headers.traceparent).toBeUndefined();
  });
});

describe("log lines", () => {
  it("carry the active span's trace and span IDs", () => {
    const lines = captureLogLines();
    const context = tracer().startActiveSpan("unit", (span) => {
      log("INFO", "khondi_web.test", "inside");
      span.end();
      return span.spanContext();
    });
    log("INFO", "khondi_web.test", "outside");
    const [inside, outside] = lines();
    expect(inside).toMatchObject({
      level: "INFO",
      logger: "khondi_web.test",
      message: "inside",
      service: "khondi-web",
      environment: "ci",
      trace_id: context.traceId,
      span_id: context.spanId,
    });
    expect(outside).toMatchObject({ trace_id: "", span_id: "" });
  });

  it("mask passwords in URLs", () => {
    const lines = captureLogLines();
    log("WARNING", "khondi_web.test", "connecting to redis://:SUPERSECRET@cache:6379/0");
    expect(lines()[0].message).toBe("connecting to redis://***@cache:6379/0");
  });
});

describe("exported spans", () => {
  it("drop query strings, headers, client data and exception text", () => {
    tracer()
      .startSpan("GET /api/x?token=SUPERSECRET", {
        kind: SpanKind.SERVER,
        attributes: {
          "http.target": "/api/x?token=SUPERSECRET",
          "http.url": "http://api:8000/v1/x?token=SUPERSECRET",
          "url.full": "redis://:SUPERSECRET@cache:6379/0",
          "http.request.header.authorization": "Bearer SUPERSECRET",
          "http.user_agent": "agent/1",
          "net.peer.ip": "203.0.113.9",
          "next.route": "/api/x",
        },
      })
      .setStatus({ code: SpanStatusCode.ERROR, message: "input was SUPERSECRET" })
      .end();
    const [span] = spans.getFinishedSpans();
    expect(span.name).toBe("GET /api/x");
    expect(span.attributes).toMatchObject({
      "http.target": "/api/x",
      "http.url": "http://api:8000/v1/x",
      "url.full": "redis://***@cache:6379/0",
      "next.route": "/api/x",
    });
    for (const dropped of ["http.request.header.authorization", "http.user_agent", "net.peer.ip"]) {
      expect(span.attributes).not.toHaveProperty([dropped]);
    }
    expect(span.status).toEqual({ code: SpanStatusCode.ERROR });
    expect(JSON.stringify([span.name, span.attributes, span.status])).not.toContain("SUPERSECRET");
  });
});

describe("sampling", () => {
  const sampler = new SkipHealthChecks();
  const decide = (kind: SpanKind, target: string) =>
    sampler.shouldSample(ROOT_CONTEXT, "0af7651916cd43dd8448eb211c80319c", "GET", kind, {
      "http.target": target,
    }, []).decision;

  it("drops the health check's server span", () => {
    expect(decide(SpanKind.SERVER, "/api/healthz")).toBe(SamplingDecision.NOT_RECORD);
    expect(decide(SpanKind.SERVER, "/api/healthz?probe=1")).toBe(SamplingDecision.NOT_RECORD);
  });

  it("keeps every other request", () => {
    expect(decide(SpanKind.SERVER, "/api/diagnostics/echo")).toBe(
      SamplingDecision.RECORD_AND_SAMPLED,
    );
    expect(decide(SpanKind.CLIENT, "/api/healthz")).toBe(SamplingDecision.RECORD_AND_SAMPLED);
  });
});

describe("export", () => {
  const settings = (endpoint: string | undefined): Settings => ({
    PORT: 3000,
    ENVIRONMENT: "ci",
    API_BASE_URL: "http://api:8000",
    OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
    DIAGNOSTICS_ENABLED: false,
  });

  it("is set up only when an endpoint is configured", () => {
    expect(telemetryConfig(settings(undefined)).spanProcessors).toEqual([]);
    expect(telemetryConfig(settings("http://otel-collector:4318")).spanProcessors).toHaveLength(1);
  });
});
