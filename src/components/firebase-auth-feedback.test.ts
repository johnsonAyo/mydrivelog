import { describe, expect, it } from "vitest";
import { firebaseAuthCode, firebaseAuthFeedback } from "./firebase-auth-feedback";

describe("firebaseAuthFeedback", () => {
  it.each([
    ["auth/popup-closed-by-user", "info", "Google sign-in was closed"],
    ["auth/user-cancelled", "error", "Google didn’t grant access"],
    ["auth/popup-blocked", "error", "Your browser blocked the Google window"],
    ["auth/unauthorized-domain", "error", "Google sign-in isn’t available on this address"],
    ["auth/network-request-failed", "error", "Couldn’t reach Google"],
    ["auth/account-exists-with-different-credential", "error", "This email already uses another sign-in method"],
    ["auth/too-many-requests", "error", "Too many sign-in attempts"],
    ["auth/user-disabled", "error", "This account has been disabled"],
    ["auth/internal-error", "error", "Google sign-in hit a problem"],
  ])("maps %s to a %s toast titled “%s”", (code, variant, title) => {
    expect(firebaseAuthFeedback(code)).toMatchObject({ variant, title });
  });

  it("stays silent when a newer popup superseded the request", () => {
    expect(firebaseAuthFeedback("auth/cancelled-popup-request")).toBeNull();
  });

  it("falls back to a generic Google error for unknown codes", () => {
    expect(firebaseAuthFeedback("auth/something-new")).toEqual({
      variant: "error", title: "Google sign-in didn’t finish", description: "Please try again. You can still sign in with a code sent to your email.",
    });
  });

  it("uses the caller's fallback for unknown codes", () => {
    const fallback = { variant: "error" as const, title: "We couldn’t sign you in", description: "Please request a new code and try again." };
    expect(firebaseAuthFeedback("auth/invalid-custom-token", fallback)).toBe(fallback);
  });
});

describe("firebaseAuthCode", () => {
  it("reads Firebase auth codes and ignores everything else", () => {
    expect(firebaseAuthCode({ code: "auth/popup-blocked", message: "Firebase: Error (auth/popup-blocked)." })).toBe("auth/popup-blocked");
    expect(firebaseAuthCode({ code: "storage/unknown" })).toBeUndefined();
    expect(firebaseAuthCode(new Error("Could not open your workspace right now"))).toBeUndefined();
    expect(firebaseAuthCode(null)).toBeUndefined();
  });
});
