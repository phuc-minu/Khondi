import Link from "next/link";
import { mainNavigation } from "../content/navigation";
import { BrandMark } from "./BrandMark";
import styles from "./SiteFooter.module.css";

export function SiteFooter(): React.ReactElement {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.brand}><BrandMark />Your budget, your trip</p>
        <nav aria-label="Footer">
          <ul className={styles.navList}>
            {mainNavigation.map((item) => (
              <li key={item.href}><Link href={item.href} prefetch={false}>{item.label}</Link></li>
            ))}
          </ul>
        </nav>
        <p>This site doesn&apos;t use cookies or analytics, and the trip planner keeps your answers in your browser.</p>
        <p>© 2026 Khondi</p>
      </div>
    </footer>
  );
}
