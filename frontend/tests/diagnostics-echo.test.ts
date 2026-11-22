import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../src/app/api/diagnostics/echo/route";
import { captureLogLines, FakeServer } from "./helpers";

const CANARY = "t0007-canary-content";
let api: FakeServer;

function echo(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request("http://web/api/diagnostics/echo", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function useApi(status: number, answer: unknown): Promise<void> {
  api = new FakeServer(status, answer);
  vi.stubEnv("API_BASE_URL", await api.start());
}

beforeEach(() => {
  vi.stubEnv("ENVIRONMENT", "ci");
  vi.stubEnv("DIAGNOSTICS_ENABLED", "true");
});

afterEach(async () => {
  await api?.stop();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/diagnostics/echo", () => {
  it("is not found while diagnostics are disabled", async () => {
    await useApi(202, { job_id: "j-1", created: true });
    vi.stubEnv("DIAGNOSTICS_ENABLED", "false");
    expect((await echo({ message: "hi" })).status).toBe(404);
    expect(api.received).toEqual([]);
  });

  it.each([
    ["no message", {}],
    ["an empty message", { message: "" }],
    ["a message over 200 characters", { message: "x".repeat(201) }],
    ["a delay over 30 s", { message: "hi", delay_seconds: 31 }],
    ["an unknown field", { message: "hi", extra: 1 }],
    ["a body that is not JSON", "{"],
  ])("rejects %s with 422 and calls nothing", async (_case, body) => {
    await useApi(202, { job_id: "j-1", created: true });
    const response = await echo(body);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ detail: "invalid request" });
    expect(api.received).toEqual([]);
  });

  it("rejects an invalid Idempotency-Key with 422", async () => {
    await useApi(202, { job_id: "j-1", created: true });
    expect((await echo({ message: "hi" }, { "idempotency-key": "has spaces" })).status).toBe(422);
    expect(api.received).toEqual([]);
  });

  it("forwards the body and Idempotency-Key and returns the api's job", async () => {
    await useApi(202, { job_id: "key-1", created: true });
    const response = await echo(
      { message: "hello", delay_seconds: 2 },
      { "idempotency-key": "key-1" },
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ job_id: "key-1", created: true });
    const [received] = api.received;
    expect(received.path).toBe("/v1/diagnostics/echo");
    expect(JSON.parse(received.body)).toEqual({ message: "hello", delay_seconds: 2 });
    expect(received.headers["idempotency-key"]).toBe("key-1");
  });

  it("answers 502 without the URL or body when the api refuses the job", async () => {
    await useApi(503, { detail: "queue unavailable" });
    const lines = captureLogLines();
    const response = await echo({ message: CANARY });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ detail: "api unavailable" });
    const [warning, request] = lines();
    expect(warning).toMatchObject({ level: "WARNING", api_status: 503 });
    expect(request).toMatchObject({ route: "/api/diagnostics/echo", status: 502 });
    expect(JSON.stringify(lines())).not.toContain(CANARY);
    expect(JSON.stringify(lines())).not.toContain("127.0.0.1");
  });

  it("answers 502 when the api is unreachable", async () => {
    await useApi(202, {});
    await api.stop();
    const lines = captureLogLines();
    const response = await echo({ message: CANARY });
    expect(response.status).toBe(502);
    expect(lines()[0]).toMatchObject({ message: "api unreachable", error_type: "TypeError" });
    expect(JSON.stringify(lines())).not.toContain("127.0.0.1");
    api = new FakeServer(202, {});
    await api.start();
  });

  it("answers 502 when the api's answer is not a job", async () => {
    await useApi(202, { unexpected: true });
    expect((await echo({ message: "hi" })).status).toBe(502);
  });

  it("writes one request line with no content", async () => {
    await useApi(202, { job_id: "j-1", created: true });
    const lines = captureLogLines();
    await echo({ message: CANARY });
    const [line] = lines();
    expect(line).toMatchObject({
      level: "INFO",
      logger: "khondi_web.request",
      service: "khondi-web",
      environment: "ci",
      method: "POST",
      route: "/api/diagnostics/echo",
      status: 202,
    });
    expect(JSON.stringify(lines())).not.toContain(CANARY);
  });
});
