import type { CostLine } from "../fixtures/new-orleans-example";

export function budgetShares(costs: readonly CostLine[], budgetUsd: number) {
  return costs.map((cost) => {
    const width = budgetUsd > 0 ? (cost.amountUsd * 100) / budgetUsd : 0;
    const percentage = Number.isInteger(width) ? width.toString() : width.toFixed(1);

    return { ...cost, width, percentage: `${percentage}%` };
  });
}
