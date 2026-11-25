import type { Metadata } from "next";
import { IllustrativeNote } from "../components/IllustrativeNote";
import { LinkButton } from "../components/LinkButton";
import { StepList } from "../components/StepList";
import styles from "./page.module.css";

const example = "/trips/new-orleans-example";

export const metadata: Metadata = {
  title: { absolute: "Khondi — Plan the right trip for your budget" },
  description: "Plan the right trip for your budget, with a day-by-day plan and every estimated cost laid out.",
};

export default function Home(): React.ReactElement {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="landing-title">
        <div>
          <h1 id="landing-title">Plan the right trip for your budget</h1>
          <p className={styles.lead}>
            Start with what you want to spend, then see a practical day-by-day plan with every estimated cost laid out.
            Right now you can try the planner with one sample trip to New Orleans.
          </p>
          <div className={styles.actions}>
            <LinkButton href="/plan" variant="primary" prefetch={false}>Start planning</LinkButton>
            <LinkButton href={example} variant="secondary">See example trip</LinkButton>
          </div>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <svg viewBox="0 0 480 320" fill="none" focusable="false">
            <g className={styles.contours} stroke="currentColor" strokeWidth="1.5">
              <path d="M-10 245C77 166 152 249 220 168S337 97 490 128" />
              <path d="M-10 266C95 188 161 271 235 184S360 119 490 150" />
              <path d="M-10 290C114 212 173 287 252 204S376 141 490 174" />
              <path d="M-10 314C125 240 180 305 266 226S391 163 490 199" />
              <path d="M27 332C148 266 190 324 284 249S411 189 490 224" />
            </g>
            <path d="M84 224C126 167 182 213 226 155S302 66 389 88" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 8" />
            <circle cx="84" cy="224" r="6" fill="currentColor" />
            <circle cx="389" cy="88" r="14" stroke="currentColor" opacity=".35" />
            <circle cx="389" cy="88" r="6" fill="currentColor" />
          </svg>
        </div>
      </section>

      <section id="how-it-works" tabIndex={-1} aria-labelledby="steps-title">
        <h2 id="steps-title">How it works</h2>
        <StepList />
      </section>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className={styles.featuresTitle}>Why Khondi is different</h2>
        <div className={styles.features}>
          <div className={styles.feature}>
            <h3>Budget first</h3>
            <p>You start from your total budget, not from a flight or hotel search.</p>
          </div>
          <div className={styles.feature}>
            <h3>Costs with their assumptions</h3>
            <p>Every estimate says what it covers and what it leaves out.</p>
          </div>
          <div className={styles.feature}>
            <h3>Honest about what&apos;s known</h3>
            <p>
              When something is a sample or an estimate, we label it. We don&apos;t show prices as live or places as
              verified unless they are.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.sample} aria-labelledby="sample-title">
        <h2 id="sample-title">Sample trip: New Orleans for $3,000</h2>
        <p>2 adults · 4 days, 3 nights · flying from the San Francisco Bay Area</p>
        <ul className={styles.chips} role="list">
          <li>$3,000</li>
          <li>2 adults · 4 days, 3 nights</li>
        </ul>
        <IllustrativeNote variant="short" />
        <LinkButton href={example} variant="secondary">See the full example</LinkButton>
      </section>
    </div>
  );
}
