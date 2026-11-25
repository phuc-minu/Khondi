"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { mainNavigation } from "../content/navigation";
import { BrandMark } from "./BrandMark";
import { LinkButton } from "./LinkButton";
import styles from "./SiteHeader.module.css";

export function SiteHeader(): React.ReactElement {
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setEnhanced(true), []);
  useEffect(() => setOpen(false), [pathname]);

  function closeMenu() {
    if (!open) return;
    setOpen(false);
    trigger.current?.focus();
  }

  function handleLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (event.target instanceof Element && event.target.closest("a[href]")) closeMenu();
  }

  return (
    <header
      className={styles.header}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          closeMenu();
        }
      }}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className={`container ${styles.inner}`}>
        <Link className={styles.brand} href="/" prefetch={false} onNavigate={closeMenu}>
          <BrandMark />
          <span>
            Khondi
            <small className={styles.tagline}>Your budget, your trip</small>
          </span>
        </Link>
        {enhanced && (
          <button
            className={styles.trigger}
            ref={trigger}
            type="button"
            aria-expanded={open}
            aria-controls="header-menu"
            onClick={() => setOpen(!open)}
          >
            Menu
          </button>
        )}
        <div id="header-menu" className={styles.panel} data-open={open} onClick={handleLinkClick}>
          <nav aria-label="Main">
            <ul className={styles.navList}>
              {mainNavigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} prefetch={false} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <LinkButton href="/plan" variant="primary" prefetch={false}>Start planning</LinkButton>
        </div>
      </div>
    </header>
  );
}
