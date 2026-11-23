import styles from "./StepList.module.css";

const steps = [
  { title: "Set your budget", text: "Tell us your total budget, how many people are going and for how long." },
  { title: "See what fits", text: "Find destinations that fit. In this early version, New Orleans is the only sample destination." },
  { title: "Get a grounded plan", text: "Read a day-by-day plan with estimated costs and the assumptions behind each one." },
] as const;

export function StepList(): React.ReactElement {
  return (
    <ol className={styles.list}>
      {steps.map((step) => (
        <li key={step.title} className={styles.item}>
          <strong>{step.title}</strong>
          <span>{step.text}</span>
        </li>
      ))}
    </ol>
  );
}
