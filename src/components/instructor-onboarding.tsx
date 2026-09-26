"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Heading, Text } from "@drivetrack/ui";

export function InstructorOnboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fullName = String(new FormData(event.currentTarget).get("fullName") ?? "").trim();
    try {
      const response = await fetch("/api/v1/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      if (!response.ok) throw new Error("We couldn’t save your name. Please try again.");
      router.replace("/calendar");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not finish setup.");
      setBusy(false);
    }
  }

  return <section data-dt="access-card" aria-labelledby="onboarding-title">
    <Badge tone="brand">One last detail</Badge>
    <Heading as="h1" size="section" id="onboarding-title">What should we call you?</Heading>
    <Text variant="muted">Add your first name to set up your instructor workspace.</Text>
    <form data-dt="access-form" onSubmit={submit}>
      <Field id="instructor-first-name" name="fullName" label="First name" type="text" autoComplete="given-name" minLength={1} maxLength={100} required placeholder="Your first name" />
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Open my workspace"}</Button>
    </form>
    {error && <Text variant="caption"><span role="alert">{error}</span></Text>}
  </section>;
}
