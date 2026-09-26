"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, getRedirectResult, signInWithCustomToken, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { Badge, Button, Field, Heading, Text, toast } from "@drivetrack/ui";
import { firebaseClientAuth } from "@/infrastructure/auth/firebase-client";
import { GoogleIcon } from "@/components/google-icon";
import { requestJson, toastError } from "./api-request";
import { firebaseAuthCode, firebaseAuthFeedback, type AuthFeedback } from "./firebase-auth-feedback";

type Step = "email" | "code";

const codeSignInFallback: AuthFeedback = { variant: "error", title: "We couldn’t sign you in", description: "Please request a new code and try again." };

async function openWorkspace(idToken: string): Promise<string> {
  const { next } = await requestJson<{ next: string }>("/api/v1/auth/session", { method: "POST", body: { idToken } });
  return next;
}

function reportSignInFailure(title: string, cause: unknown, fallback?: AuthFeedback) {
  const code = firebaseAuthCode(cause);
  if (!code) return toastError(title, cause);
  const feedback = firebaseAuthFeedback(code, fallback);
  if (feedback) toast.show(feedback.variant, { title: feedback.title, description: feedback.description });
}

export function InstructorAccess({ mode }: { mode: "start" | "sign-in" }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem("mydrivelog.googleRedirect") !== "pending") return;
    window.sessionStorage.removeItem("mydrivelog.googleRedirect");
    const auth = firebaseClientAuth();
    getRedirectResult(auth)
      .then(async (result) => {
        await auth.authStateReady();
        const user = result?.user ?? auth.currentUser;
        if (!user) throw new Error("Google sign-in didn’t finish. Please try again.");
        const next = await openWorkspace(await user.getIdToken());
        router.replace(next);
        router.refresh();
      })
      .catch((cause) => reportSignInFailure("We couldn’t open your workspace", cause))
      .finally(() => setBusy(false));
  }, [router]);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const address = email.trim().toLowerCase();
      await requestJson("/api/v1/auth/request", { method: "POST", body: { email: address } });
      setEmail(address);
      setStep("code");
    } catch (cause) {
      toastError("We couldn’t send a sign-in code", cause);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const { customToken } = await requestJson<{ customToken: string }>("/api/v1/auth/verify", { method: "POST", body: { email, code } });
      const credential = await signInWithCustomToken(firebaseClientAuth(), customToken);
      const next = await openWorkspace(await credential.user.getIdToken());
      router.replace(next);
      router.refresh();
    } catch (cause) {
      reportSignInFailure("We couldn’t sign you in", cause, codeSignInFallback);
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    try {
      const auth = firebaseClientAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const next = await openWorkspace(await credential.user.getIdToken());
      router.replace(next);
      router.refresh();
    } catch (cause) {
      const failure = firebaseAuthCode(cause);
      if (failure === "auth/popup-blocked" || failure === "auth/operation-not-supported-in-this-environment") {
        try {
          window.sessionStorage.setItem("mydrivelog.googleRedirect", "pending");
          const auth = firebaseClientAuth();
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          await signInWithRedirect(auth, provider);
          return;
        } catch {
          window.sessionStorage.removeItem("mydrivelog.googleRedirect");
        }
      }
      reportSignInFailure("We couldn’t open your workspace", cause);
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
      <Button type="button" variant="ghost" disabled={busy} onClick={() => { setStep("email"); setCode(""); }}>Use a different email</Button>
    </form>}
    {step === "email" && <div className="grid gap-3 border-t border-border pt-4"><Text variant="caption">Or continue with</Text><Button type="button" variant="outline" disabled={busy} onClick={googleSignIn}><GoogleIcon /> Google</Button></div>}
  </section>;
}
