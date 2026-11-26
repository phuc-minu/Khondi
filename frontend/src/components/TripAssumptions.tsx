import { formatUsd } from "../lib/money";
import type { IllustrativeTrip } from "../fixtures/new-orleans-example";
import styles from "./TripAssumptions.module.css";

function travelerText({ adults, children }: IllustrativeTrip["travelers"]): string {
  const adultText = `${adults} ${adults === 1 ? "adult" : "adults"}`;
  return children === 0 ? adultText : `${adultText}, ${children} ${children === 1 ? "child" : "children"}`;
}

export function TripAssumptions({ trip }: { trip: IllustrativeTrip }): React.ReactElement {
  const rows: readonly (readonly [string, string])[] = [
    ["Destination", trip.destination],
    ["Total budget", formatUsd(trip.budgetUsd)],
    ["Travelers", travelerText(trip.travelers)],
    ["Leaving from", trip.origin],
    ["Length", `${trip.lengthDays} days, ${trip.nights} nights`],
    ["Timing", trip.timing],
    ["Getting there", "Flying, economy, round trip"],
  ];
  return (
    <div className={styles.card}>
      <dl className={styles.list}>
        {rows.map(([term, detail]) => (
          <div key={term} className={styles.row}>
            <dt className={styles.term}>{term}</dt>
            <dd className={styles.detail}>{detail}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.exclusions}>
        <h3>Not included</h3>
        <ul>
          {trip.notIncluded.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
