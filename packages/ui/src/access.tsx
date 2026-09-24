"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Field, Heading, Text } from "./primitives";

export function EmailAccessForm({ mode = "start", disabled = false }: { mode?: "start" | "sign-in"; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email") }),
      });
      setState(response.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <section data-dt="access-card" aria-labelledby="access-title">
      <Badge tone="brand">Solo workspace</Badge>
      <Heading as="h1" size="section" id="access-title">{mode === "start" ? "Start your 14-day trial." : "Welcome back."}</Heading>
      <Text variant="muted">{mode === "start" ? "Try the instructor workspace for 14 days. No card required. Solo is £24 per month after the trial, with no learner cap." : "Enter your email and we’ll send you a secure sign-in link."}</Text>
      {state === "sent" ? (
        <div data-dt="access-feedback" role="status">
          <strong>Check your inbox.</strong>
          <Text variant="muted">Your access link is on its way. It expires in 15 minutes.</Text>
        </div>
      ) : (
        <form onSubmit={submit} data-dt="access-form">
          <Field id="access-email" name="email" label="Work email" type="email" autoComplete="email" required placeholder="you@example.com" disabled={disabled} />
          <Button type="submit" disabled={disabled || state === "sending"}>{state === "sending" ? "Sending link…" : "Continue with email"}</Button>
          {state === "error" && <Text variant="caption">We couldn’t send the link right now. Please try again.</Text>}
        </form>
      )}
    </section>
  );
}

export function TrialNotice({ endsAt, paidThrough, now }: { endsAt: string | null; paidThrough: string | null; now: string }) {
  const current = new Date(now);
  const paid = paidThrough !== null && new Date(paidThrough) > current;
  const trial = endsAt !== null && new Date(endsAt) > current;
  const label = paid ? "Solo active" : trial ? "Trial active" : "Trial ended";
  return (
    <aside data-dt="trial-notice" data-state={paid ? "paid" : trial ? "trial" : "expired"}>
      <Badge tone={trial ? "warning" : paid ? "success" : "neutral"}>{label}</Badge>
      <Text variant="caption">{paid ? "Your subscription is active." : trial ? `Full access until ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }).format(new Date(endsAt!))}.` : "You can still view and export your availability. New changes are paused."}</Text>
    </aside>
  );
}
