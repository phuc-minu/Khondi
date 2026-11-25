import { z } from "zod";
import { newOrleansExample } from "../fixtures/new-orleans-example";

const budgetError = "Enter your total budget in whole dollars, from $500 to $50,000.";
const travelersError = "Choose 1 to 4 travelers.";
const tripLengthError = "Choose a trip length from 1 to 5 days.";

export const planInterests = ["Food", "Music", "History", "Outdoors", "Museums"] as const;
const planForm = z.object({
  budgetUsd: z.string(budgetError)
    .transform((value) => value.replaceAll(",", "").trim())
    .pipe(z.string().regex(/^\d+$/, budgetError))
    .transform(Number)
    .pipe(z.number(budgetError).int(budgetError).min(500, budgetError).max(50_000, budgetError)),
  travelers: z.string(travelersError).regex(/^[1-4]$/, travelersError).transform(Number),
  lengthDays: z.string(tripLengthError).regex(/^[1-5]$/, tripLengthError).transform(Number),
  origin: z.string("Use 60 characters or fewer.").trim().max(60, "Use 60 characters or fewer.").default(""),
  interests: z.array(z.enum(planInterests)).default([]),
});

export type PlanValues = z.output<typeof planForm>;
export type PlanErrors = Partial<Record<keyof PlanValues, string>>;

export function parsePlanForm(raw: unknown): { values: PlanValues } | { errors: PlanErrors } {
  const parsed = planForm.safeParse(raw);
  if (parsed.success) return { values: parsed.data };

  const errors: PlanErrors = {};
  const fields = z.flattenError(parsed.error).fieldErrors;
  for (const field of planForm.keyof().options) {
    const [message] = fields[field] ?? [];
    if (message) errors[field] = message;
  }
  if (parsed.error.issues.some((issue) => issue.path.length === 0)) {
    return { errors: { budgetUsd: budgetError, travelers: travelersError, lengthDays: tripLengthError } };
  }
  return { errors };
}

const sample = {
  budgetUsd: newOrleansExample.budgetUsd,
  travelers: newOrleansExample.travelers.adults + newOrleansExample.travelers.children,
  lengthDays: newOrleansExample.lengthDays,
  origin: "San Francisco Bay Area",
};
const sampleSource = z.literal(newOrleansExample.slug);

export function prefillFrom(from: string | null): PlanValues | null {
  return sampleSource.safeParse(from).success ? { ...sample, interests: [] } : null;
}

export function differsFromSample(values: PlanValues): boolean {
  return values.budgetUsd !== sample.budgetUsd || values.travelers !== sample.travelers
    || values.lengthDays !== sample.lengthDays || values.origin !== sample.origin;
}

export function belowSampleBudget(values: PlanValues): boolean {
  return values.budgetUsd < sample.budgetUsd;
}
