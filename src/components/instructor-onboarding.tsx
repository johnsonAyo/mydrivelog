"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Heading, Text } from "@drivetrack/ui";
import { requestJson, toastError } from "./api-request";

export function InstructorOnboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const fullName = String(new FormData(event.currentTarget).get("fullName") ?? "").trim();
    try {
      await requestJson("/api/v1/auth/onboarding", { method: "POST", body: { fullName } });
      router.replace("/calendar");
      router.refresh();
    } catch (cause) {
      toastError("We couldn’t save your name", cause);
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
  </section>;
}
