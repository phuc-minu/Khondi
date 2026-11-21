import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Khondi" };

export default function RootLayout({ children }: { children: ReactNode }): React.ReactElement {
  return <html lang="en"><body>{children}</body></html>;
}
