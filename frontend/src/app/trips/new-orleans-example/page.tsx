import type { Metadata } from "next";
import { BudgetBar } from "../../../components/BudgetBar";
import { CostBreakdown } from "../../../components/CostBreakdown";
import { DayPlan } from "../../../components/DayPlan";
import { IllustrativeNote } from "../../../components/IllustrativeNote";
import { LinkButton } from "../../../components/LinkButton";
import { TripAssumptions } from "../../../components/TripAssumptions";
import { newOrleansExample } from "../../../fixtures/new-orleans-example";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sample trip: New Orleans for $3,000",
  description: "A sample 4-day New Orleans trip for two, showing how a $3,000 budget breaks down.",
};

export default function NewOrleansExamplePage(): React.ReactElement {
  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <h1>New Orleans for $3,000</h1>
        <p className={styles.lead}>A sample 4-day trip for two, built to show how a total budget breaks down.</p>
        <ul className={styles.chips} role="list">
          <li>2 adults</li>
          <li>4 days, 3 nights</li>
          <li>Flying from the San Francisco Bay Area</li>
        </ul>
        <IllustrativeNote variant="full" />
      </header>

      <section aria-labelledby="example-budget">
        <h2 id="example-budget">Where the $3,000 goes</h2>
        <div className={styles.budgetCard}>
          <BudgetBar costs={newOrleansExample.costs} budgetUsd={newOrleansExample.budgetUsd} />
          <CostBreakdown trip={newOrleansExample} />
          <p className={styles.supporting}>
            This sample uses the full budget and has no buffer. For a real trip, keep some money aside for surprises.
          </p>
        </div>
      </section>

      <section aria-labelledby="example-assumptions">
        <h2 id="example-assumptions">Trip assumptions</h2>
        <TripAssumptions trip={newOrleansExample} />
      </section>

      <section aria-labelledby="example-days">
        <h2 id="example-days">Day by day</h2>
        <div className={styles.days}>
          {newOrleansExample.days.map((entry) => (
            <DayPlan key={entry.day} entry={entry} />
          ))}
        </div>
        <p className={styles.supporting}>
          These are suggestions, not reservations. Check opening hours, prices and availability before you go.
        </p>
      </section>
      <LinkButton href="/about" variant="secondary">
        About Khondi
      </LinkButton>
    </article>
  );
}
