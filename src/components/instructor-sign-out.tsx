"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Button, toast } from "@drivetrack/ui";
import { firebaseClientAuth } from "@/infrastructure/auth/firebase-client";
import { requestJson, toastError } from "./api-request";

export function InstructorSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    try {
      await requestJson("/api/v1/auth/sign-out", { method: "POST" });
      try { await signOut(firebaseClientAuth()); } catch { /* The server session is already revoked. */ }
      toast.success("You’re signed out");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      toastError("We couldn’t sign you out", cause);
      setBusy(false);
    }
  }

  return <Button type="button" variant="outline" size="2" disabled={busy} onClick={leave}>{busy ? "Signing out…" : "Sign out"}</Button>;
}
