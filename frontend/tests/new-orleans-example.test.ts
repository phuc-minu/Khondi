import { describe, expect, it } from "vitest";
import { newOrleansExample as trip } from "../src/fixtures/new-orleans-example";
import { sumUsd } from "../src/lib/money";

describe("New Orleans example fixture", () => {
  it("spends exactly the budget", () => {
    expect(sumUsd(trip.costs.map((line) => line.amountUsd))).toBe(trip.budgetUsd);
    expect(trip.budgetUsd).toBe(3000);
  });

  it("leaves nothing remaining", () => {
    expect(trip.budgetUsd - sumUsd(trip.costs.map((line) => line.amountUsd))).toBe(0);
  });

  it("uses positive whole-dollar amounts", () => {
    for (const line of trip.costs) {
      expect(Number.isInteger(line.amountUsd)).toBe(true);
      expect(line.amountUsd).toBeGreaterThan(0);
    }
  });

  it("has one day entry per trip day and nights one fewer", () => {
    expect(trip.days).toHaveLength(trip.lengthDays);
    expect(trip.nights).toBe(trip.lengthDays - 1);
  });

  it("is labelled illustrative", () => {
    expect(trip.status).toBe("illustrative");
  });

  it("has unique cost categories", () => {
    const categories = trip.costs.map((line) => line.category);
    expect(new Set(categories).size).toBe(categories.length);
  });
});
