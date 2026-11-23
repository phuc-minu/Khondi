import { describe, expect, it } from "vitest";
import { formatUsd, sumUsd } from "../src/lib/money";

describe("money", () => {
  it("formats whole dollars", () => {
    expect(formatUsd(3000)).toBe("$3,000");
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(1050)).toBe("$1,050");
  });

  it("sums amounts", () => {
    expect(sumUsd([900, 1050, 450])).toBe(2400);
    expect(sumUsd([])).toBe(0);
  });
});
