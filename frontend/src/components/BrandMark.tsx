export function BrandMark(): React.ReactElement {
  return (
    <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
      <path d="M10 8v16m11-15-9 7 10 7" fill="none" stroke="var(--color-on-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="7" r="1.5" fill="var(--color-accent)" />
    </svg>
  );
}
