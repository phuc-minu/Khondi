// Queues the api's test job through the web app, so one trace covers web, api and worker
// (T0007, T0002 AC 7). Off unless DIAGNOSTICS_ENABLED is true: it has no authentication.
import { NextResponse } from "next/server";
import { z } from "zod";

import { log } from "../../../../log";
import { loadSettings } from "../../../../settings";

const ROUTE = "/api/diagnostics/echo";
const API_TIMEOUT_MS = 5000;
const UNAVAILABLE = { status: 502, body: { detail: "api unavailable" } };
const INVALID = { status: 422, body: { detail: "invalid request" } };

const echoBody = z.strictObject({
  message: z.string().min(1).max(200),
  delay_seconds: z.number().int().min(0).max(30).default(0),
});
const idempotencyKey = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const enqueued = z.object({ job_id: z.string(), created: z.boolean() });

type Answer = { status: number; body: unknown };

async function forward(request: Request): Promise<Answer> {
  const settings = loadSettings();
  if (!settings.DIAGNOSTICS_ENABLED) {
    return { status: 404, body: { detail: "Not Found" } };
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return INVALID;
  }
  const body = echoBody.safeParse(payload);
  const key = request.headers.get("idempotency-key");
  // The api checks the same bounds; checking here keeps a client mistake from becoming a 502.
  if (!body.success || (key !== null && !idempotencyKey.safeParse(key).success)) {
    return INVALID;
  }

  let response: Response;
  try {
    response = await fetch(`${settings.API_BASE_URL.replace(/\/+$/, "")}/v1/diagnostics/echo`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key === null ? {} : { "idempotency-key": key }),
      },
      body: JSON.stringify(body.data),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    // Neither the URL nor the body is logged (R1, R2).
    log("WARNING", "khondi_web.diagnostics", "api unreachable", {
      error_type: networkErrorType(error),
    });
    return UNAVAILABLE;
  }
  if (response.status !== 202) {
    log("WARNING", "khondi_web.diagnostics", "api did not queue the job", {
      api_status: response.status,
    });
    return UNAVAILABLE;
  }
  // A 202 whose body is not JSON, or is cut off or times out while being read, is still a
  // failed call to the api, not a crash of this route.
  let answerBody: unknown;
  try {
    answerBody = await response.json();
  } catch (error) {
    const errorType = error instanceof SyntaxError ? "SyntaxError" : networkErrorType(error);
    log("WARNING", "khondi_web.diagnostics", "api answer unreadable", {
      api_status: 202,
      error_type: errorType,
    });
    return UNAVAILABLE;
  }
  const answer = enqueued.safeParse(answerBody);
  if (!answer.success) {
    log("WARNING", "khondi_web.diagnostics", "api answer was not a job", { api_status: 202 });
    return UNAVAILABLE;
  }
  return { status: 202, body: answer.data };
}

/** Names a network failure or timeout from fetch; re-throws anything else (Q6). */
function networkErrorType(error: unknown): "TypeError" | "TimeoutError" {
  if (error instanceof DOMException && error.name === "TimeoutError") return "TimeoutError";
  if (error instanceof TypeError) return "TypeError";
  throw error;
}

export async function POST(request: Request): Promise<NextResponse> {
  const started = performance.now();
  const answer = await forward(request);
  log("INFO", "khondi_web.request", "request", {
    method: "POST",
    route: ROUTE,
    status: answer.status,
    duration_ms: Math.round((performance.now() - started) * 10) / 10,
  });
  return NextResponse.json(answer.body, { status: answer.status });
}
