import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import type { AuthRepository, AccessEmailSender } from "@/application/auth/access-repository";
import { authRoutes } from "./auth-routes";

const now = new Date("2026-09-24T12:00:00.000Z");

function dependencies(overrides: Partial<AuthRepository> = {}) {
  const auth: AuthRepository = {
    issueChallenge: vi.fn(async () => "issued" as const),
    consumeChallenge: vi.fn(async () => ({
      identityId: "identity-1",
      workspaceId: "workspace-1",
      trialEndsAt: new Date("2026-10-08T12:00:00.000Z"),
    })),
    ...overrides,
  };
  const email: AccessEmailSender = { sendAccessLink: vi.fn(async () => undefined) };
  return { auth, email, now: () => now, origin: "https://drivetrack.example" };
}

describe("email access HTTP contract", () => {
  it("sends a time-limited access link without creating a browser session", async () => {
    const deps = dependencies();
    const routes = authRoutes(deps);
    const response = await routes.requestLink(new NextRequest("https://drivetrack.example/api/v1/auth/request", {
      method: "POST",
      body: JSON.stringify({ email: "  INSTRUCTOR@example.com  " }),
    }));

    expect(response.status).toBe(202);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(deps.email.sendAccessLink).toHaveBeenCalledWith(expect.objectContaining({
      to: "instructor@example.com",
      url: expect.stringMatching(/^https:\/\/drivetrack\.example\/auth\/verify\?token=/),
    }));
  });

  it("creates a secure session only when a one-use token is verified", async () => {
    const deps = dependencies();
    const response = await authRoutes(deps).verify(new NextRequest("https://drivetrack.example/api/v1/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token: "a".repeat(64) }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ next: "/today" });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("does not establish a session for an invalid or consumed token", async () => {
    const deps = dependencies({ consumeChallenge: vi.fn(async () => null) });
    const response = await authRoutes(deps).verify(new NextRequest("https://drivetrack.example/api/v1/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token: "b".repeat(64) }),
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({ code: "invalid_access_link" });
  });
});
