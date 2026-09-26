"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, getRedirectResult, signInWithCustomToken, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { Badge, Button, Field, Heading, Text } from "@drivetrack/ui";
import { firebaseClientAuth } from "@/infrastructure/auth/firebase-client";
import { GoogleIcon } from "@/components/google-icon";

type Step = "email" | "code";

async function openWorkspace(idToken: string): Promise<string> {
  const response = await fetch("/api/v1/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) throw new Error("We couldn’t open your workspace. Please try again.");
  const data = await response.json() as { next: string };
  return data.next;
}

export function InstructorAccess({ mode }: { mode: "start" | "sign-in" }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.sessionStorage.getItem("mydrivelog.googleRedirect") !== "pending") return;
    window.sessionStorage.removeItem("mydrivelog.googleRedirect");
    const auth = firebaseClientAuth();
    getRedirectResult(auth).then(async (result) => {
      await auth.authStateReady();
      const user = result?.user ?? auth.currentUser;
      if (!user) throw new Error("Google sign-in didn’t finish. Please try again.");
      const next = await openWorkspace(await user.getIdToken());
      router.replace(next);
      router.refresh();
    }).catch(() => setError("Google sign-in didn’t finish. Please try again.")).finally(() => setBusy(false));
  }, [router]);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const address = email.trim().toLowerCase();
      const response = await fetch("/api/v1/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      if (!response.ok) throw new Error(response.status === 429 ? "Please wait a moment before requesting another code." : "We couldn’t send a code right now. Please try again.");
      setEmail(address);
      setStep("code");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!response.ok) throw new Error(response.status === 400 ? "That code is invalid or expired. Check your email or request a new one." : "We couldn’t verify your code right now.");
      const { customToken } = await response.json() as { customToken: string };
      const credential = await signInWithCustomToken(firebaseClientAuth(), customToken);
      const next = await openWorkspace(await credential.user.getIdToken());
      router.replace(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setError("");
    try {
      const credential = await signInWithPopup(firebaseClientAuth(), new GoogleAuthProvider());
      const next = await openWorkspace(await credential.user.getIdToken());
      router.replace(next);
      router.refresh();
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        try {
          window.sessionStorage.setItem("mydrivelog.googleRedirect", "pending");
          await signInWithRedirect(firebaseClientAuth(), new GoogleAuthProvider());
          return;
        } catch {
          window.sessionStorage.removeItem("mydrivelog.googleRedirect");
        }
      }
      setError(code === "auth/popup-closed-by-user" ? "Google sign-in was closed." : "Google sign-in didn’t finish. Please try again.");
      setBusy(false);
    }
  }

  return <section data-dt="access-card" aria-labelledby="access-title">
    <Badge tone="brand">Solo workspace</Badge>
    <Heading as="h1" size="section" id="access-title">{mode === "start" ? "Start your pilot." : "Welcome back."}</Heading>
    <Text variant="muted">{mode === "start" ? "Plan availability, share bookable times, and keep every lesson on track." : "Sign in with a code sent to your email, or continue with Google."}</Text>
    {step === "email" ? <form data-dt="access-form" onSubmit={sendCode}>
      <Field id="access-email" name="email" label="Work email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
      <Button type="submit" disabled={busy}>{busy ? "Sending code…" : "Continue with email"}</Button>
    </form> : <form data-dt="access-form" onSubmit={verifyCode}>
      <div data-dt="access-feedback" role="status"><strong>Check your inbox.</strong><Text variant="muted">Enter the six-digit code sent to {email}. It expires in 10 minutes.</Text></div>
      <Field id="access-code" name="code" label="Sign-in code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
      <Button type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Open workspace"}</Button>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => { setStep("email"); setCode(""); setError(""); }}>Use a different email</Button>
    </form>}
    {step === "email" && <div className="grid gap-3 border-t border-border pt-4"><Text variant="caption">Or continue with</Text><Button type="button" variant="outline" disabled={busy} onClick={googleSignIn}><GoogleIcon /> Google</Button></div>}
    {error && <Text variant="caption"><span role="alert">{error}</span></Text>}
  </section>;
}
