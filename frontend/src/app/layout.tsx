import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Khondi", template: "%s — Khondi" }, description: "Plan the right trip for your budget." };

export default function RootLayout({ children }: { children: ReactNode }): React.ReactElement {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to main content</a><SiteHeader /><main id="main" tabIndex={-1}>{children}</main><SiteFooter /></body></html>;
}
