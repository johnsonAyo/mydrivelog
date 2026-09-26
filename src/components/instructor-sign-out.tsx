"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Button } from "@drivetrack/ui";
import { firebaseClientAuth } from "@/infrastructure/auth/firebase-client";

export function InstructorSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function leave() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/sign-out", { method: "POST" });
      if (!response.ok) throw new Error("Sign-out failed");
      try { await signOut(firebaseClientAuth()); } catch { /* The server session is already revoked. */ }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }

  return <div className="grid gap-2"><Button type="button" variant="outline" size="2" disabled={busy} onClick={leave}>{busy ? "Signing out…" : "Sign out"}</Button>{error && <span role="alert" className="text-sm">{error}</span>}</div>;
}
