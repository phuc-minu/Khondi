import type { Metadata } from "next";
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
      <h1>New Orleans for $3,000</h1>
      <p>A sample 4-day trip for two, built to show how a total budget breaks down.</p>
      <IllustrativeNote variant="full" />
      <h2>Trip assumptions</h2>
      <TripAssumptions trip={newOrleansExample} />
      <h2>Where the $3,000 goes</h2>
      <CostBreakdown trip={newOrleansExample} />
      <p>
        This sample uses the full budget and has no buffer. For a real trip, keep some money aside for surprises.
      </p>
      <h2>Day by day</h2>
      {newOrleansExample.days.map((entry) => (
        <DayPlan key={entry.day} entry={entry} />
      ))}
      <p>These are suggestions, not reservations. Check opening hours, prices and availability before you go.</p>
      <LinkButton href="/about" variant="secondary">
        About Khondi
      </LinkButton>
    </article>
  );
}
