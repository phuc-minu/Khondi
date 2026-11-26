const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatUsd(amount: number): string {
  return usd.format(amount);
}

export function sumUsd(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
