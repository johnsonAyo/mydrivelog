import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { SessionResolver } from "@/application/auth/session-context";
import type { AvailabilityRepository } from "@/application/availability/availability-repository";
import { createAvailabilityUseCase } from "@/application/availability/create-availability";
import { listAvailabilityUseCase } from "@/application/availability/list-availability";
import type { AvailabilitySlot } from "@/domain/availability/types";
import { authenticateRequest } from "./authenticate-request";
import { problem } from "./problem";

const createAvailabilitySchema = z.object({
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  sessionMinutes: z.number().int().min(15).max(480).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
});

const rangeSchema = z.object({
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
});

type AvailabilityRouteDependencies = {
  readonly sessions: SessionResolver;
  readonly availability: AvailabilityRepository;
  readonly now?: () => Date;
};

export function availabilityRoutes(dependencies: AvailabilityRouteDependencies) {
  return {
    async export(request: NextRequest) {
      try {
        const authentication = await authenticateRequest(request, dependencies.sessions);
        if (!authentication.ok) return authenticationProblem(authentication.reason);
        const rows = await dependencies.availability.exportAll(authentication.session.workspaceId);
        const response = NextResponse.json({
          version: 1,
          exportedAt: (dependencies.now?.() ?? new Date()).toISOString(),
          availability: rows.map((row) => ({
            id: row.id,
            startsAt: row.startsAt.toISOString(),
            endsAt: row.endsAt.toISOString(),
            status: row.status,
          })),
        });
        response.headers.set("Content-Disposition", 'attachment; filename="drivetrack-availability.json"');
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      } catch {
        return unexpectedAvailabilityProblem("listing");
      }
    },
    async list(request: NextRequest) {
      try {
        const authentication = await authenticateRequest(request, dependencies.sessions);
        if (!authentication.ok) {
          return authenticationProblem(authentication.reason);
        }

        const parsed = rangeSchema.safeParse({
          from: request.nextUrl.searchParams.get("from"),
          to: request.nextUrl.searchParams.get("to"),
        });
        if (!parsed.success) {
          return problem(400, "invalid_date_range", "A valid from and to range is required");
        }

        const from = new Date(parsed.data.from);
        const to = new Date(parsed.data.to);
        if (to <= from) {
          return problem(400, "invalid_date_range", "The range end must be after its start");
        }

        const slots = await listAvailabilityUseCase(dependencies.availability)({
          workspaceId: authentication.session.workspaceId,
          from,
          to,
        });

        return NextResponse.json({ data: slots.map(serializeSlot) });
      } catch {
        return unexpectedAvailabilityProblem("listing");
      }
    },

    async create(request: NextRequest) {
      try {
        const authentication = await authenticateRequest(request, dependencies.sessions);
        if (!authentication.ok) {
          return authenticationProblem(authentication.reason);
        }

        const currentTime = dependencies.now?.() ?? new Date();
        const { trialEndsAt, paidThrough } = authentication.session;
        if (!authentication.session.testingWorkspace && (!trialEndsAt || trialEndsAt <= currentTime) && (!paidThrough || paidThrough <= currentTime)) {
          return problem(403, "trial_expired", "The trial has ended. Your availability remains available to view and export.");
        }

        const payload = await request.json().catch(() => null);
        const parsed = createAvailabilitySchema.safeParse(payload);
        if (!parsed.success) {
          return problem(400, "invalid_availability", "Valid start and optional end times are required");
        }

        const result = await createAvailabilityUseCase(dependencies.availability)({
          workspaceId: authentication.session.workspaceId,
          startsAt: new Date(parsed.data.startsAt),
          ...(parsed.data.endsAt ? { endsAt: new Date(parsed.data.endsAt) } : {}),
          ...(parsed.data.sessionMinutes !== undefined ? { sessionMinutes: parsed.data.sessionMinutes } : {}),
          ...(parsed.data.bufferMinutes !== undefined ? { bufferMinutes: parsed.data.bufferMinutes } : {}),
        });

        if (!result.ok) {
          if (result.reason === "overlap") {
            return problem(409, "availability_overlap", "This time overlaps existing availability");
          }
          if (result.reason === "workspace_not_ready") {
            return problem(409, "workspace_not_ready", "Complete workspace setup before adding availability");
          }
          return problem(400, result.reason, "The proposed availability is not valid");
        }

        return NextResponse.json(
          {
            data: serializeSlot(result.slot),
            warnings: result.warnings,
          },
          { status: 201 },
        );
      } catch {
        return unexpectedAvailabilityProblem("creation");
      }
    },
  };
}

type AvailabilityResponse = {
  readonly id: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly status: "open";
  readonly sessionMinutes?: number;
  readonly bufferMinutes?: number;
};

function serializeSlot(
  slot: Pick<AvailabilitySlot, "id" | "startsAt" | "endsAt" | "status" | "sessionMinutes" | "bufferMinutes">,
): AvailabilityResponse {
  return {
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    status: slot.status,
    sessionMinutes: slot.sessionMinutes,
    bufferMinutes: slot.bufferMinutes,
  };
}

function authenticationProblem(reason: "unauthenticated" | "suspended") {
  return reason === "suspended"
    ? problem(403, "workspace_suspended", "Workspace access is unavailable")
    : problem(401, "unauthenticated", "Authentication is required");
}

function unexpectedAvailabilityProblem(operation: "creation" | "listing") {
  const correlationId = randomUUID();
  console.error(`Availability ${operation} failed`, { correlationId });
  return problem(
    500,
    "unexpected_error",
    operation === "creation"
      ? "MyDriveLog could not save this availability"
      : "MyDriveLog could not load availability",
    correlationId,
  );
}
