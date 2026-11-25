"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { belowSampleBudget, differsFromSample, parsePlanForm, planInterests, type PlanErrors, type PlanValues } from "../lib/plan-input";
import buttons from "./LinkButton.module.css";
import styles from "./BudgetStarter.module.css";

const samplePath = "/trips/new-orleans-example";
const fields = ["budgetUsd", "travelers", "lengthDays", "origin", "interests"] as const;

export function BudgetStarter({ prefill }: { prefill: PlanValues | null }): React.ReactElement {
  const [budgetUsd, setBudget] = useState(prefill ? String(prefill.budgetUsd) : "");
  const [travelers, setTravelers] = useState(String(prefill?.travelers ?? 2));
  const [lengthDays, setLength] = useState(String(prefill?.lengthDays ?? 4));
  const [origin, setOrigin] = useState(prefill?.origin ?? "");
  const [interests, setInterests] = useState(prefill?.interests ?? []);
  const [errors, setErrors] = useState<PlanErrors>();
  const [result, setResult] = useState<PlanValues>();
  const [showResults, setShowResults] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (errors) summary.current?.focus();
  }, [errors]);

  useEffect(() => {
    if (result) stepHeading.current?.focus();
  }, [result, showResults]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parsePlanForm({ budgetUsd, travelers, lengthDays, origin, interests });
    if ("errors" in parsed) {
      setErrors(parsed.errors);
      return;
    }
    setErrors(undefined);
    setResult(parsed.values);
    setShowResults(true);
  }

  function fieldAttributes(field: keyof PlanErrors) {
    const id = `plan-${field}`;
    return { id, "aria-invalid": errors?.[field] ? true : undefined, "aria-describedby": errors?.[field] ? `${id}-error` : undefined };
  }

  function fieldError(field: keyof PlanErrors) {
    return errors?.[field] && <p className={styles.error} id={`plan-${field}-error`}>{errors[field]}</p>;
  }

  return (
    <div className={styles.starter}>
      <div className="visually-hidden" role="status">{showResults ? "Step 2 of 3" : ""}</div>
      {showResults && result ? (
        <>
          <h2 ref={stepHeading} tabIndex={-1}>Step 2 of 3 — Destinations that fit</h2>
          <section className={styles.card}>
            <h3>New Orleans (sample)</h3>
            <p>Our only sample destination today. The sample is built for 2 travelers, 4 days and $3,000.</p>
            {differsFromSample(result) && <p>Your answers are different from the sample, so its costs won&apos;t match your trip. We don&apos;t adjust sample prices to your answers.</p>}
            {belowSampleBudget(result) && <p>Your budget is below this sample&apos;s $3,000 total.</p>}
            {result.interests.length > 0 && <p>You picked: {result.interests.join(", ")}</p>}
          </section>
          <p>More destinations aren&apos;t available yet.</p>
          <div className={styles.actions}>
            <a href={samplePath} className={`${buttons.button} ${buttons.primary}`}>Open the sample plan</a>
            <button type="button" className={`${buttons.button} ${buttons.secondary}`} onClick={() => setShowResults(false)}>Change my answers</button>
          </div>
        </>
      ) : (
        <>
          {errors && (
            <div ref={summary} className={styles.summary} role="alert" tabIndex={-1}>
              <h2>Please fix the following</h2>
              <ul>
                {fields.map((field) => errors[field] && (
                  <li key={field}><a href={`#plan-${field}`}>{errors[field]}</a></li>
                ))}
              </ul>
            </div>
          )}
          <h2 ref={stepHeading} tabIndex={-1} id="plan-budget-heading">Step 1 of 3 — Your budget</h2>
          {prefill && <p>Pre-filled from the New Orleans sample.</p>}
          {/* Unnamed controls keep answers out of native submissions before hydration. */}
          <form noValidate autoComplete="off" onSubmit={submit}>
            <fieldset className={styles.fields} aria-labelledby="plan-budget-heading">
              <label htmlFor="plan-budgetUsd">Total budget (USD)</label>
              <input {...fieldAttributes("budgetUsd")} required inputMode="numeric" value={budgetUsd} onChange={(event) => setBudget(event.target.value)} />
              {fieldError("budgetUsd")}
              <label htmlFor="plan-travelers">Travelers</label>
              <select {...fieldAttributes("travelers")} required value={travelers} onChange={(event) => setTravelers(event.target.value)}>
                {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
              {fieldError("travelers")}
              <label htmlFor="plan-lengthDays">Trip length</label>
              <select {...fieldAttributes("lengthDays")} required value={lengthDays} onChange={(event) => setLength(event.target.value)}>
                {[1, 2, 3, 4, 5].map((days) => <option key={days} value={days}>{days} {days === 1 ? "day" : "days"}</option>)}
              </select>
              {fieldError("lengthDays")}
              <label htmlFor="plan-origin">Leaving from (optional)</label>
              <input {...fieldAttributes("origin")} maxLength={60} value={origin} onChange={(event) => setOrigin(event.target.value)} />
              {fieldError("origin")}
              <fieldset {...fieldAttributes("interests")} className={styles.interests}>
                <legend>Interests (optional)</legend>
                {planInterests.map((interest) => (
                  <label key={interest}>
                    <input type="checkbox" checked={interests.includes(interest)} onChange={(event) => {
                      setInterests(event.target.checked ? [...interests, interest] : interests.filter((item) => item !== interest));
                    }} />
                    {interest}
                  </label>
                ))}
                {fieldError("interests")}
              </fieldset>
              <button type="submit" className={`${buttons.button} ${buttons.primary}`}>See what fits</button>
            </fieldset>
          </form>
          <p>Your answers stay in this browser tab. They aren&apos;t sent anywhere or saved.</p>
        </>
      )}
    </div>
  );
}
