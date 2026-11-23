import Link from "next/link";
import { mainNavigation } from "../content/navigation";
import styles from "./SiteFooter.module.css";
export function SiteFooter(): React.ReactElement { return <footer className={styles.footer}><div className={styles.inner}><nav aria-label="Footer"><ul className={styles.navList}>{mainNavigation.map((item)=><li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul></nav><p>This site doesn&apos;t use cookies or analytics, and the trip planner keeps your answers in your browser.</p><p>© 2026 Khondi</p></div></footer>; }
