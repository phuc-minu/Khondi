import type { DayPlanEntry } from "../fixtures/new-orleans-example";
import styles from "./DayPlan.module.css";

export function DayPlan({ entry }: { entry: DayPlanEntry }): React.ReactElement {
  return (
    <section className={styles.card}>
      <h3>
        <span className={styles.marker}>{`Day ${entry.day}`}</span>
        <span className="visually-hidden">{" — "}</span>
        <span>{entry.title}</span>
      </h3>
      <ul>
        {entry.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
