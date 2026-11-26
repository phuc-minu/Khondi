import { formatUsd, sumUsd } from "../lib/money";
import type { IllustrativeTrip } from "../fixtures/new-orleans-example";
import styles from "./CostBreakdown.module.css";

export function CostBreakdown({ trip }: { trip: IllustrativeTrip }): React.ReactElement {
  const total = sumUsd(trip.costs.map((line) => line.amountUsd));
  const summary: readonly (readonly [string, number])[] = [
    ["Total", total],
    ["Budget", trip.budgetUsd],
    ["Remaining", trip.budgetUsd - total],
  ];
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className={styles.caption}>Estimated costs for 2 travelers (party total)</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.cell}>Category</th>
            <th scope="col" className={styles.cell}>What it covers</th>
            <th scope="col" className={`${styles.cell} ${styles.amount}`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {trip.costs.map((line) => (
            <tr key={line.category}>
              <th scope="row" className={styles.cell}>{line.label}</th>
              <td className={styles.cell}>{line.covers}</td>
              <td className={`${styles.cell} ${styles.amount}`}>{formatUsd(line.amountUsd)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {summary.map(([label, amount]) => (
            <tr key={label}>
              <th scope="row" colSpan={2} className={styles.cell}>{label}</th>
              <td className={`${styles.cell} ${styles.amount}`}>{formatUsd(amount)}</td>
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );
}
