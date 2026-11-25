import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Khondi — Plan the right trip for your budget" },
};

export default function Home(): React.ReactElement {
  return <h1>Plan the right trip for your budget</h1>;
}
