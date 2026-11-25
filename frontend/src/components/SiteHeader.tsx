import Link from "next/link";
import { LinkButton } from "./LinkButton";
import { NavLinks } from "./NavLinks";
import styles from "./SiteHeader.module.css";
export function SiteHeader(): React.ReactElement {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" prefetch={false}>Khondi</Link>
        <nav aria-label="Main"><NavLinks /></nav>
        <LinkButton href="/plan" variant="primary">Start planning</LinkButton>
      </div>
    </header>
  );
}
