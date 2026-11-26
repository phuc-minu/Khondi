import { describe, expect, it } from "vitest";
import { newOrleansExample as trip } from "../src/fixtures/new-orleans-example";
import { budgetShares } from "../src/lib/budget-share";

describe("budgetShares", () => {
  it("returns the exact proportions and formatted shares of the sample budget", () => {
    const shares = budgetShares(trip.costs, trip.budgetUsd);

    expect(shares.map(({ label }) => label)).toEqual(trip.costs.map(({ label }) => label));
    for (const [index, { width }] of shares.entries()) {
      expect(width / 100).toBeCloseTo(trip.costs[index].amountUsd / trip.budgetUsd, 10);
    }
    expect(shares.reduce((total, share) => total + share.width, 0)).toBeCloseTo(100);
    expect(shares.map(({ percentage }) => percentage)).toEqual(["30%", "35%", "15%", "11.7%", "8.3%"]);
  });

  it("uses the budget as the denominator even when some of it is unspent", () => {
    const shares = budgetShares(trip.costs, 4500);
    expect(shares[0]).toMatchObject({ width: 20, percentage: "20%" });
    expect(shares.reduce((total, share) => total + share.width, 0)).toBeCloseTo(100 * 2 / 3);
  });

  it("formats a whole share without a decimal", () => {
    const shares = budgetShares([{ ...trip.costs[0], amountUsd: 29 }], 100);
    expect(shares[0]).toMatchObject({ width: 29, percentage: "29%" });
  });

  it("returns zero shares for a zero budget", () => {
    const shares = budgetShares(trip.costs, 0);
    expect(shares.map(({ width, percentage }) => [width, percentage])).toEqual(
      trip.costs.map(() => [0, "0%"]),
    );
  });
});
