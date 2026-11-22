import { createServer, type IncomingHttpHeaders, type Server } from "node:http";

import { vi } from "vitest";
import { z } from "zod";

export type Received = { path: string; headers: IncomingHttpHeaders; body: string };

/** A real local HTTP server standing in for the api, or for a third party. */
export class FakeServer {
  readonly received: Received[] = [];
  private readonly server: Server;

  constructor(
    status: number,
    answer: unknown,
    private readonly host = "127.0.0.1",
  ) {
    this.server = createServer((request, response) => {
      let body = "";
      request.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      request.on("end", () => {
        this.received.push({ path: request.url ?? "", headers: request.headers, body });
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(answer));
      });
    });
  }

  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, this.host, resolve));
    const address = this.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("the fake server is not listening on a TCP port");
    }
    return `http://${this.host}:${address.port}`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      this.server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

const logLine = z.record(z.string(), z.unknown());

/** Captures what the app writes to stdout; returns a reader that parses each JSON line. */
export function captureLogLines(): () => Record<string, unknown>[] {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  });
  return () =>
    chunks
      .join("")
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => logLine.parse(JSON.parse(line)));
}
