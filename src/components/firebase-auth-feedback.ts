import type { ToastVariant } from "@drivetrack/ui";

export type AuthFeedback = { variant: ToastVariant; title: string; description: string };

const USE_EMAIL = "You can still sign in with a code sent to your email.";

// `null` means the failure needs no feedback: the user already started another sign-in attempt.
const feedbackByCode: Record<string, AuthFeedback | null> = {
  "auth/popup-closed-by-user": { variant: "info", title: "Google sign-in was closed", description: "Nothing has changed. Choose Google again when you’re ready." },
  "auth/cancelled-popup-request": null,
  "auth/user-cancelled": { variant: "error", title: "Google didn’t grant access", description: "MyDriveLog needs your name and email address from Google. Try again and allow access, or use an email code." },
  "auth/popup-blocked": { variant: "error", title: "Your browser blocked the Google window", description: `Allow pop-ups for this site and try again. ${USE_EMAIL}` },
  "auth/operation-not-supported-in-this-environment": { variant: "error", title: "Google sign-in isn’t supported in this browser", description: USE_EMAIL },
  "auth/unauthorized-domain": { variant: "error", title: "Google sign-in isn’t available on this address", description: `This web address isn’t authorised for Google sign-in. ${USE_EMAIL}` },
  "auth/operation-not-allowed": { variant: "error", title: "Google sign-in is turned off", description: USE_EMAIL },
  "auth/admin-restricted-operation": { variant: "error", title: "Google sign-in is turned off", description: USE_EMAIL },
  "auth/network-request-failed": { variant: "error", title: "Couldn’t reach Google", description: "Check your connection and try again." },
  "auth/account-exists-with-different-credential": { variant: "error", title: "This email already uses another sign-in method", description: "Sign in with a code sent to that email address instead." },
  "auth/too-many-requests": { variant: "error", title: "Too many sign-in attempts", description: "Please wait a few minutes before trying again." },
  "auth/user-disabled": { variant: "error", title: "This account has been disabled", description: "Contact us if you think this is a mistake." },
  "auth/internal-error": { variant: "error", title: "Google sign-in hit a problem", description: "Please try again in a moment." },
};

const googleFallback: AuthFeedback = { variant: "error", title: "Google sign-in didn’t finish", description: `Please try again. ${USE_EMAIL}` };

export function firebaseAuthCode(cause: unknown): string | undefined {
  const code = (cause as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.startsWith("auth/") ? code : undefined;
}

export function firebaseAuthFeedback(code: string, fallback: AuthFeedback = googleFallback): AuthFeedback | null {
  return code in feedbackByCode ? feedbackByCode[code] : fallback;
}
