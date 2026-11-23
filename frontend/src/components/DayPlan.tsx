import type { DayPlanEntry } from "../fixtures/new-orleans-example";

export function DayPlan({ entry }: { entry: DayPlanEntry }): React.ReactElement {
  return (
    <section>
      <h3>{`Day ${entry.day} — ${entry.title}`}</h3>
      <ul>
        {entry.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
