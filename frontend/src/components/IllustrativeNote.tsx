import styles from "./IllustrativeNote.module.css";

const text = {
  full: "Illustrative estimate — not a quote. Prices are sample values for planning, not live fares or rates, and nothing here can be booked.",
  short: "Illustrative estimate — not a quote.",
} as const;

export function IllustrativeNote({ variant }: { variant: "full" | "short" }): React.ReactElement {
  return (
    <p role="note" className={styles.note}>
      {text[variant]}
    </p>
  );
}
