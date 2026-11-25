import type { Metadata } from "next";
import { BudgetStarter } from "../../components/BudgetStarter";
import styles from "../../components/BudgetStarter.module.css";
import { prefillFrom } from "../../lib/plan-input";

export const metadata: Metadata = {
  title: "Start planning",
  description: "Set a budget and see what fits. Your answers stay in your browser.",
};

export default async function PlanPage({ searchParams }: {
  searchParams: Promise<{ from?: string | string[] }>;
}): Promise<React.ReactElement> {
  const { from } = await searchParams;
  const prefill = prefillFrom(typeof from === "string" ? from : null);
  return (
    <article className={styles.page}>
      <BudgetStarter key={prefill ? "sample" : "blank"} prefill={prefill}>
        <h1>Start planning</h1>
      </BudgetStarter>
      <noscript>
        <p>The planner needs JavaScript. You can still read the sample trip.</p>
        <a href="/trips/new-orleans-example">Open the sample plan</a>
      </noscript>
    </article>
  );
}
