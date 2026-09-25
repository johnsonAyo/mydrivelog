import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import type { AuthRepository, AccessEmailSender } from "@/application/auth/access-repository";
import type { IdentityProvider } from "@/application/auth/identity-provider";
import { authRoutes } from "./auth-routes";

const now = new Date("2026-09-24T12:00:00.000Z");

function dependencies(overrides: Partial<AuthRepository> = {}) {
  const auth: AuthRepository = {
    issueCode: vi.fn(async () => "issued" as const),
    invalidateCode: vi.fn(async () => undefined),
    consumeCode: vi.fn(async () => "valid" as const),
    establishSession: vi.fn(async () => ({ needsOnboarding: true })),
    completeOnboarding: vi.fn(async () => undefined),
    revokeSession: vi.fn(async () => undefined),
    ...overrides,
  };
  const email: AccessEmailSender = { sendAccessCode: vi.fn(async () => undefined) };
  const identity: IdentityProvider = {
    customTokenForVerifiedEmail: vi.fn(async () => "firebase-custom-token"),
    verifyIdToken: vi.fn(async () => ({ uid: "firebase-uid", email: "instructor@example.com", emailVerified: true })),
  };
  return { auth, email, identity, now: () => now, codeSecret: "a".repeat(32) };
}

function post(path: string, body: unknown) {
  return new NextRequest(`https://drivetrack.example/api/v1/auth/${path}`, {
    method: "POST",
    headers: { origin: "https://drivetrack.example" },
    body: JSON.stringify(body),
  });
}

describe("instructor authentication HTTP contract", () => {
  it("emails a six-digit single-use code without opening a session", async () => {
    const deps = dependencies();
    const response = await authRoutes(deps).requestCode(post("request", { email: "  INSTRUCTOR@example.com  " }));
    expect(response.status).toBe(202);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(deps.email.sendAccessCode).toHaveBeenCalledWith({ to: "instructor@example.com", code: expect.stringMatching(/^\d{6}$/) });
    expect(deps.auth.issueCode).toHaveBeenCalledWith(expect.objectContaining({ email: "instructor@example.com", expiresAt: new Date("2026-09-24T12:10:00.000Z") }));
  });

  it("invalidates an unsent code so an email failure does not trap the instructor", async () => {
    const deps = dependencies();
    deps.email.sendAccessCode = vi.fn(async () => { throw new Error("mail unavailable"); });
    const response = await authRoutes(deps).requestCode(post("request", { email: "instructor@example.com" }));
    expect(response.status).toBe(503);
    expect(deps.auth.invalidateCode).toHaveBeenCalledWith(expect.any(String));
  });

  it("exchanges a valid code for a Firebase custom token, not a browser session", async () => {
    const deps = dependencies();
    const response = await authRoutes(deps).verifyCode(post("verify", { email: "instructor@example.com", code: "123456" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ customToken: "firebase-custom-token" });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(deps.identity.customTokenForVerifiedEmail).toHaveBeenCalledWith("instructor@example.com");
  });

  it("rejects an invalid or consumed code", async () => {
    const deps = dependencies({ consumeCode: vi.fn(async () => "invalid" as const) });
    const response = await authRoutes(deps).verifyCode(post("verify", { email: "instructor@example.com", code: "123456" }));
    expect(response.status).toBe(400);
    expect(deps.identity.customTokenForVerifiedEmail).not.toHaveBeenCalled();
  });

  it("establishes a secure workspace session only from a verified Firebase ID token", async () => {
    const deps = dependencies();
    const response = await authRoutes(deps).establishSession(post("session", { idToken: "x".repeat(100) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ next: "/onboarding" });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(deps.auth.establishSession).toHaveBeenCalledWith(expect.objectContaining({ email: "instructor@example.com", firebaseUid: "firebase-uid" }));
  });

  it("rejects a Firebase identity without a verified email", async () => {
    const deps = dependencies();
    const identity = { ...deps.identity, verifyIdToken: vi.fn(async () => ({ uid: "uid", email: "unverified@example.com", emailVerified: false })) };
    const response = await authRoutes({ ...deps, identity }).establishSession(post("session", { idToken: "x".repeat(100) }));
    expect(response.status).toBe(401);
    expect(deps.auth.establishSession).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin sign-in request", async () => {
    const deps = dependencies();
    const request = new NextRequest("https://drivetrack.example/api/v1/auth/request", { method: "POST", headers: { origin: "https://elsewhere.example" }, body: JSON.stringify({ email: "a@example.com" }) });
    const response = await authRoutes(deps).requestCode(request);
    expect(response.status).toBe(403);
    expect(deps.auth.issueCode).not.toHaveBeenCalled();
  });
});
