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
    const workspaceName = String(new FormData(event.currentTarget).get("workspaceName") ?? "").trim();
    try {
      await requestJson("/api/v1/auth/onboarding", { method: "POST", body: { workspaceName } });
      router.replace("/calendar");
      router.refresh();
    } catch (cause) {
      toastError("We couldn’t save your workspace name", cause);
      setBusy(false);
    }
  }

  return <section data-dt="access-card" aria-labelledby="onboarding-title">
    <Badge tone="brand">One last detail</Badge>
    <Heading as="h1" size="section" id="onboarding-title">Name your workspace</Heading>
    <Text variant="muted">This is what your students or learners see when they book a lesson.</Text>
    <form data-dt="access-form" onSubmit={submit}>
      <Field id="workspace-name" name="workspaceName" label="Workspace name" type="text" autoComplete="organization" minLength={1} maxLength={100} required placeholder="e.g. Sarah" />
      <Button type="submit" loading={busy}>Open my workspace</Button>
    </form>
  </section>;
}
