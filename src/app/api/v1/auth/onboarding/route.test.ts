import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeOnboarding: vi.fn(async () => true),
  resolve: vi.fn(),
  queueActivity: vi.fn(),
}));

vi.mock("@/infrastructure/auth/postgres-auth-repository", () => ({ postgresAuthRepository: { completeOnboarding: mocks.completeOnboarding } }));
vi.mock("@/infrastructure/auth/postgres-session-resolver", () => ({ postgresSessionResolver: { resolve: mocks.resolve } }));
vi.mock("@/infrastructure/monitoring/telegram", () => ({ queueActivity: mocks.queueActivity, queueSpike: vi.fn() }));

const { POST } = await import("./route");

const session = {
  identityId: "11111111-1111-4111-8111-111111111111",
  workspaceId: "22222222-2222-4222-8222-222222222222",
  workspaceStatus: "active" as const,
  pilotActive: true,
  trialEndsAt: null,
  paidThrough: null,
  instructorName: null,
  instructorEmail: "sarah.jones@example.com",
};

function post(body: unknown, origin = "https://mydrivelog.example") {
  return new NextRequest("https://mydrivelog.example/api/v1/auth/onboarding", {
    method: "POST",
    headers: { origin, cookie: "drivetrack_session=session-token" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/auth/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolve.mockResolvedValue(session);
    mocks.completeOnboarding.mockResolvedValue(true);
  });

  it("saves the full workspace name exactly as typed, only trimmed", async () => {
    const response = await POST(post({ workspaceName: "  Sarah’s Driving School  " }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ next: "/calendar" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.completeOnboarding).toHaveBeenCalledWith({ identityId: session.identityId, workspaceName: "Sarah’s Driving School" });
    expect(mocks.queueActivity).toHaveBeenCalledWith(expect.objectContaining({ action: "instructor_signed_up", reference: session.workspaceId }));
  });

  it("accepts a name of exactly 100 characters", async () => {
    const workspaceName = "A".repeat(100);
    expect((await POST(post({ workspaceName }))).status).toBe(200);
    expect(mocks.completeOnboarding).toHaveBeenCalledWith({ identityId: session.identityId, workspaceName });
  });

  it.each([
    ["an empty name", { workspaceName: "   " }],
    ["a name over 100 characters", { workspaceName: "A".repeat(101) }],
    ["the retired first-name field", { firstName: "Sarah" }],
    ["a missing body", null],
  ])("rejects %s without saving", async (_label, body) => {
    const response = await POST(post(body));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "invalid_workspace_name" });
    expect(mocks.completeOnboarding).not.toHaveBeenCalled();
  });

  it("does not announce a signup again for an instructor who already finished onboarding", async () => {
    mocks.completeOnboarding.mockResolvedValue(false);
    expect((await POST(post({ workspaceName: "Sarah’s Driving School" }))).status).toBe(200);
    expect(mocks.queueActivity).not.toHaveBeenCalled();
  });

  it("requires a signed-in session", async () => {
    mocks.resolve.mockResolvedValue(null);
    expect((await POST(post({ workspaceName: "Sarah’s Driving School" }))).status).toBe(401);
    expect(mocks.completeOnboarding).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request", async () => {
    expect((await POST(post({ workspaceName: "Sarah’s Driving School" }, "https://elsewhere.example"))).status).toBe(403);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
});
