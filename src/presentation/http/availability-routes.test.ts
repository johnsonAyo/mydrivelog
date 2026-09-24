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
  })),
};

describe("availability HTTP contract", () => {
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
  };
}
