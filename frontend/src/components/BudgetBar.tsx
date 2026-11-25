import type { IllustrativeTrip } from "../fixtures/new-orleans-example";
import { budgetShares } from "../lib/budget-share";
import { formatUsd } from "../lib/money";
import styles from "./BudgetBar.module.css";

export function BudgetBar({ costs, budgetUsd }: Pick<IllustrativeTrip, "costs" | "budgetUsd">): React.ReactElement {
  const shares = budgetShares(costs, budgetUsd);

  return (
    <div className={styles.summary}>
      <p className={styles.total}><strong>{formatUsd(budgetUsd)}</strong> total</p>
      <div className={styles.bar} aria-hidden="true">
        {shares.map(({ category, width }) => (
          <span key={category} data-category={category} style={{ flexGrow: width }} />
        ))}
      </div>
      <ul className={styles.legend} role="list">
        {shares.map(({ category, label, amountUsd, percentage }) => (
          <li key={category}>
            <span className={styles.swatch} data-category={category} />
            <span>{label}</span>
            <strong>{formatUsd(amountUsd)}</strong>
            <span className={styles.share}>{percentage}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
