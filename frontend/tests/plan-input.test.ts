import { describe, expect, it } from "vitest";
import { belowSampleBudget, differsFromSample, parsePlanForm, prefillFrom } from "../src/lib/plan-input";

const valid = { budgetUsd: "3000", travelers: "2", lengthDays: "4" };
const sample = { budgetUsd: 3000, travelers: 2, lengthDays: 4, origin: "San Francisco Bay Area", interests: [] };

describe("plan form", () => {
  it.each(["", "499", "50,001", "3000.00", "3000.50", "3e3", "0xbb8", "$3000", "9".repeat(400), undefined])(
    "rejects an invalid budget (%s)",
    (budgetUsd) => {
      expect(parsePlanForm({ ...valid, budgetUsd })).toEqual({
        errors: { budgetUsd: "Enter your total budget in whole dollars, from $500 to $50,000." },
      });
    },
  );

  it.each([["500", 500], [" 3,000 ", 3000], ["50,000", 50_000]])("parses %s as %i dollars", (input, budgetUsd) => {
    expect(parsePlanForm({ ...valid, budgetUsd: input })).toEqual({
      values: { budgetUsd, travelers: 2, lengthDays: 4, origin: "", interests: [] },
    });
  });

  it.each(["", "0", "5", "2.5", undefined])("rejects an invalid traveler count (%s)", (travelers) => {
    expect(parsePlanForm({ ...valid, travelers })).toEqual({ errors: { travelers: "Choose 1 to 4 travelers." } });
  });

  it.each(["", "0", "6", "4.5", undefined])("rejects an invalid trip length (%s)", (lengthDays) => {
    expect(parsePlanForm({ ...valid, lengthDays })).toEqual({ errors: { lengthDays: "Choose a trip length from 1 to 5 days." } });
  });

  it.each([["1", "1"], ["4", "5"]])("accepts the count and trip length boundaries (%s, %s)", (travelers, lengthDays) => {
    expect(parsePlanForm({ ...valid, travelers, lengthDays })).toEqual({
      values: { ...sample, travelers: Number(travelers), lengthDays: Number(lengthDays), origin: "" },
    });
  });

  it("trims the origin and accepts 60 characters and the five offered interests", () => {
    const origin = "A".repeat(60);
    const interests = ["Food", "Music", "History", "Outdoors", "Museums"];
    expect(parsePlanForm({ ...valid, origin: ` ${origin} `, interests })).toEqual({ values: { ...sample, origin, interests } });
  });

  it("rejects an origin over 60 characters and an unlisted interest", () => {
    expect(parsePlanForm({ ...valid, origin: "A".repeat(61) })).toEqual({ errors: { origin: "Use 60 characters or fewer." } });
    expect(parsePlanForm({ ...valid, interests: ["Shopping"] })).toMatchObject({ errors: { interests: expect.any(String) } });
  });

  it("returns all required field messages for an empty or malformed form", () => {
    const errors = {
      budgetUsd: "Enter your total budget in whole dollars, from $500 to $50,000.",
      travelers: "Choose 1 to 4 travelers.",
      lengthDays: "Choose a trip length from 1 to 5 days.",
    };
    expect(parsePlanForm({})).toEqual({ errors });
    expect(parsePlanForm(null)).toEqual({ errors });
  });
});

describe("New Orleans sample comparison", () => {
  it("prefills only from the exact sample slug", () => {
    expect(prefillFrom("new-orleans-example")).toEqual(sample);
    expect(prefillFrom("other")).toBeNull();
    expect(prefillFrom("")).toBeNull();
    expect(prefillFrom(null)).toBeNull();
  });

  it.each([{ budgetUsd: 5000 }, { travelers: 3 }, { lengthDays: 2 }, { origin: "" }, { origin: "Boston" }])(
    "finds a difference for %j",
    (change) => expect(differsFromSample({ ...sample, ...change })).toBe(true),
  );

  it("considers sample answers a match with or without interests", () => {
    expect(differsFromSample(sample)).toBe(false);
    expect(differsFromSample({ ...sample, interests: ["Music"] })).toBe(false);
  });

  it.each([[2999, true], [3000, false], [3001, false]])("checks a budget of %i", (budgetUsd, below) => {
    expect(belowSampleBudget({ ...sample, budgetUsd })).toBe(below);
  });
});
