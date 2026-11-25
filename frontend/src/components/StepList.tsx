import styles from "./StepList.module.css";

const steps = [
  { title: "Set your budget", text: "Tell us your total budget, how many people are going and for how long." },
  { title: "See what fits", text: "Find destinations that fit. In this early version, New Orleans is the only sample destination." },
  { title: "Get a grounded plan", text: "Read a day-by-day plan with estimated costs and the assumptions behind each one." },
] as const;

export function StepList(): React.ReactElement {
  return (
    <ol className={styles.list} role="list">
      {steps.map((step, index) => (
        <li key={step.title} className={styles.item}>
          <span className={styles.number} aria-hidden="true">{index + 1}</span>
          <strong>{step.title}</strong>
          <p>{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
