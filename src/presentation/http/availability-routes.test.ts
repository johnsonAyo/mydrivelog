import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import type { SessionResolver } from "@/application/auth/session-context";
import type {
  AvailabilityRepository,
  AvailabilityTransaction,
} from "@/application/availability/availability-repository";
import { availabilityRoutes } from "./availability-routes";

const activeSession: SessionResolver = {
  resolve: vi.fn(async () => ({
    identityId: "identity-1",
    workspaceId: "workspace-1",
    workspaceStatus: "active" as const,
    trialEndsAt: new Date("2026-10-08T00:00:00.000Z"),
    paidThrough: null,
  })),
};

describe("availability HTTP contract", () => {
  it("creates and lists a slot in the configured test workspace without a login cookie", async () => {
    const saved: Array<{ id: string; workspaceId: string; startsAt: Date; endsAt: Date; status: "open" }> = [];
    const availability = repositoryStub({
      insert: vi.fn(async (input) => {
        const slot = { id: "slot-test", status: "open" as const, ...input };
        saved.push(slot);
        return { ok: true as const, slot };
      }),
    }, {
      list: vi.fn(async () => saved),
    });
    const routes = availabilityRoutes({
      sessions: { resolve: vi.fn(async () => ({
        identityId: "test-instructor", workspaceId: "test-workspace", workspaceStatus: "active" as const,
        trialEndsAt: null, paidThrough: null, testingWorkspace: true as const,
      })) },
      availability,
    });
    const created = await routes.create(new NextRequest("http://localhost/api/v1/availability", {
      method: "POST",
      body: JSON.stringify({ startsAt: "2026-10-05T09:00:00.000Z" }),
    }));
    const listed = await routes.list(new NextRequest("http://localhost/api/v1/availability?from=2026-10-05T00%3A00%3A00.000Z&to=2026-10-12T00%3A00%3A00.000Z"));

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toMatchObject({ data: [{ id: "slot-test", startsAt: "2026-10-05T09:00:00.000Z" }] });
  });
  it("keeps reads available but blocks writes after an unpaid trial expires", async () => {
    const sessions: SessionResolver = {
      resolve: vi.fn(async () => ({
        identityId: "identity-1",
        workspaceId: "workspace-1",
        workspaceStatus: "active" as const,
        trialEndsAt: new Date("2026-10-01T00:00:00.000Z"),
        paidThrough: null,
      })),
    };
    const availability = repositoryStub();
    const routes = availabilityRoutes({ sessions, availability, now: () => new Date("2026-10-05T00:00:00.000Z") });
    const headers = { cookie: "drivetrack_session=opaque-session-token" };
    const read = await routes.list(new NextRequest("http://localhost/api/v1/availability?from=2026-10-05T00%3A00%3A00.000Z&to=2026-10-12T00%3A00%3A00.000Z", { headers }));
    const write = await routes.create(new NextRequest("http://localhost/api/v1/availability", {
      method: "POST",
      headers,
      body: JSON.stringify({ startsAt: "2026-10-05T09:00:00.000Z" }),
    }));

    expect(read.status).toBe(200);
    expect(write.status).toBe(403);
    await expect(write.json()).resolves.toMatchObject({ code: "trial_expired" });
  });

  it("lets an expired instructor export availability", async () => {
    const routes = availabilityRoutes({
      sessions: { resolve: vi.fn(async () => ({
        identityId: "identity-1", workspaceId: "workspace-1", workspaceStatus: "active" as const,
        trialEndsAt: new Date("2026-10-01T00:00:00.000Z"), paidThrough: null,
      })) },
      availability: repositoryStub({}, { exportAll: vi.fn(async () => [{
        id: "slot-1", startsAt: new Date("2026-10-05T09:00:00.000Z"), endsAt: new Date("2026-10-05T11:00:00.000Z"), status: "open" as const,
      }]) }),
    });
    const response = await routes.export(new NextRequest("http://localhost/api/v1/availability/export", {
      headers: { cookie: "drivetrack_session=opaque-session-token" },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    await expect(response.json()).resolves.toMatchObject({ availability: [{ id: "slot-1" }] });
  });
  it("does not accept an unauthenticated write", async () => {
    const routes = availabilityRoutes({
      sessions: { resolve: vi.fn(async () => null) },
      availability: repositoryStub(),
    });

    const response = await routes.create(
      new NextRequest("http://localhost/api/v1/availability", {
        method: "POST",
        body: JSON.stringify({ startsAt: "2026-10-05T09:00:00.000Z" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "unauthenticated" });
  });

  it("persists availability even when it returns an advisory buffer warning", async () => {
    const insert = vi.fn(async (input) => ({
      ok: true as const,
      slot: { id: "slot-new", status: "open" as const, ...input },
    }));
    const routes = availabilityRoutes({
      sessions: activeSession,
      availability: repositoryStub({
        insert,
        findNearby: vi.fn(async () => [
          {
            id: "slot-before",
            startsAt: new Date("2026-10-05T07:00:00.000Z"),
            endsAt: new Date("2026-10-05T08:45:00.000Z"),
          },
        ]),
      }),
    });

    const request = new NextRequest("http://localhost/api/v1/availability", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "drivetrack_session=opaque-session-token",
      },
      body: JSON.stringify({ startsAt: "2026-10-05T09:00:00.000Z" }),
    });
    const response = await routes.create(request);

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "slot-new",
        startsAt: "2026-10-05T09:00:00.000Z",
        endsAt: "2026-10-05T11:00:00.000Z",
        status: "open",
      },
      warnings: [
        {
          code: "short_buffer",
          adjacentSlotId: "slot-before",
          gapMinutes: 15,
          preferredMinutes: 30,
          side: "before",
        },
      ],
    });
  });

  it("maps a concurrent database overlap to a conflict response", async () => {
    const routes = availabilityRoutes({
      sessions: activeSession,
      availability: repositoryStub({
        insert: vi.fn(async () => ({ ok: false as const, reason: "overlap" as const })),
      }),
    });

    const response = await routes.create(
      new NextRequest("http://localhost/api/v1/availability", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "drivetrack_session=opaque-session-token",
        },
        body: JSON.stringify({ startsAt: "2026-10-05T09:00:00.000Z" }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "availability_overlap" });
  });
});

function repositoryStub(
  overrides: Partial<AvailabilityTransaction> = {},
  repositoryOverrides: Partial<Pick<AvailabilityRepository, "exportAll" | "list">> = {},
): AvailabilityRepository {
  const transaction = {
    getSchedulingPolicy: vi.fn(async () => ({
      defaultSessionMinutes: 120,
      bufferWarningMinutes: 30,
    })),
    findNearby: vi.fn(async () => []),
    insert: vi.fn(async (input) => ({
      ok: true as const,
      slot: { id: "slot-new", status: "open" as const, ...input },
    })),
    ...overrides,
  };

  return {
    transaction: vi.fn(async (work) => work(transaction)),
    list: vi.fn(async () => []),
    exportAll: vi.fn(async () => []),
    ...repositoryOverrides,
  };
}
