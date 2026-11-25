import styles from "./IllustrativeNote.module.css";

const text = {
  full: "Illustrative estimate — not a quote. Prices are sample values for planning, not live fares or rates, and nothing here can be booked.",
  short: "Illustrative estimate — not a quote.",
} as const;

export function IllustrativeNote({ variant }: { variant: "full" | "short" }): React.ReactElement {
  return (
    <p role="note" className={styles.note}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 9v5" strokeLinecap="round" />
        <circle cx="10" cy="6" r="1" fill="currentColor" stroke="none" />
      </svg>
      {text[variant]}
    </p>
  );
}
