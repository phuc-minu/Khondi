import type { Metadata } from "next";
import styles from "./page.module.css";
import { LinkButton } from "../../components/LinkButton";
import { StepList } from "../../components/StepList";

export const metadata: Metadata = {
  title: "About",
  description: "Why Khondi plans around your budget, who it's for, and what's real today.",
};

export default function AboutPage(): React.ReactElement {
  return (
    <article className={styles.page}>
      <h1>About Khondi</h1>
      <p>
        Khondi helps people plan trips that fit a real budget. We focus on practical day-by-day plans and clear cost
        estimates, and we&apos;re upfront about what we don&apos;t know.
      </p>
      <h2>Who it&apos;s for</h2>
      <p>
        Families, flexible travelers and anyone who plans around a budget and wants to see where the money goes before
        they commit.
      </p>
      <h2>What makes it different</h2>
      <ul>
        <li>You set the total first; plans are shaped to fit it.</li>
        <li>Each cost shows what it includes and excludes.</li>
        <li>Samples and estimates are always labeled as such.</li>
      </ul>
      <h2>How it works</h2>
      <StepList />
      <h2>Where Khondi is today</h2>
      <p>
        Khondi is in early development. This site shows one sample New Orleans trip with illustrative costs. Nothing
        here is a live price, a booking or a guarantee that a place is open or available. Khondi doesn&apos;t sell or
        book travel. As live data sources are added, plans will show where their information came from and how current
        it is.
      </p>
      <LinkButton href="/trips/new-orleans-example" variant="secondary">
        See example trip
      </LinkButton>
    </article>
  );
}
