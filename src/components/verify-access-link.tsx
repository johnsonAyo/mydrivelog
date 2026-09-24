"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Heading, Text } from "@drivetrack/ui";

export function VerifyAccessLink() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const verificationStarted = useRef(false);
  const [state, setState] = useState<"verifying" | "invalid" | "unavailable">("verifying");

  useEffect(() => {
    if (!token) {
      return;
    }
    if (verificationStarted.current) return;
    verificationStarted.current = true;
    fetch("/api/v1/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      if (response.ok) {
        router.replace("/today");
        router.refresh();
      } else {
        setState(response.status === 400 ? "invalid" : "unavailable");
      }
    }).catch(() => {
      setState("unavailable");
    });
  }, [token, router]);

  const visibleState = token ? state : "invalid";

  return (
    <section data-dt="access-card" aria-live="polite">
      <Heading as="h1" size="section">{visibleState === "verifying" ? "Opening your workspace…" : visibleState === "invalid" ? "This link has expired." : "We couldn’t open this link."}</Heading>
      <Text variant="muted">{visibleState === "verifying" ? "One moment while we confirm your access." : "Request a fresh access link to continue."}</Text>
      {visibleState !== "verifying" && <Button type="button" onClick={() => router.push("/sign-in")}>Get a new link</Button>}
    </section>
  );
}
