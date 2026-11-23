import Link from "next/link";
import { NavLinks } from "./NavLinks";
import styles from "./SiteHeader.module.css";
export function SiteHeader(): React.ReactElement { return <header className={styles.header}><div className={styles.inner}><Link className={styles.brand} href="/">Khondi</Link><nav aria-label="Main"><NavLinks /></nav></div></header>; }
