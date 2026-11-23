"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavigation } from "../content/navigation";
import styles from "./SiteHeader.module.css";
export function NavLinks(): React.ReactElement { const pathname=usePathname(); return <ul className={styles.navList}>{mainNavigation.map((item)=><li key={item.href}><Link href={item.href} aria-current={pathname===item.href?"page":undefined}>{item.label}</Link></li>)}</ul>; }
