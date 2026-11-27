import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./LinkButton.module.css";

export function LinkButton({
  href,
  variant,
  prefetch,
  children,
}: {
  href: string;
  variant: "primary" | "secondary";
  prefetch?: false;
  children: ReactNode;
}): React.ReactElement {
  return (
    <Link href={href} prefetch={prefetch} className={`${styles.button} ${styles[variant]}`}>
      {children}
    </Link>
  );
}
