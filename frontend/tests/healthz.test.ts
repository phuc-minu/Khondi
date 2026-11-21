import { describe, expect, it } from "vitest";

import { GET } from "../src/app/api/healthz/route";

describe("healthz", () => {
  it("returns ok", async () => {
    expect((await GET()).status).toBe(200);
  });
});
