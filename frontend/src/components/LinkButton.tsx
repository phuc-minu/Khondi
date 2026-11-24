import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./LinkButton.module.css";

export function LinkButton({
  href,
  variant,
  children,
}: {
  href: string;
  variant: "primary" | "secondary";
  children: ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} className={`${styles.button} ${styles[variant]}`}>
      {children}
    </Link>
  );
}
