import { and, asc, eq, gt, lt, ne } from "drizzle-orm";
import type {
  AvailabilityRepository,
  PersistAvailabilityInput,
  PersistAvailabilityResult,
} from "@/application/availability/availability-repository";
import { getDatabase } from "@/infrastructure/database/client";
import { availabilitySlots, workspaces } from "@/infrastructure/database/schema";

const NEARBY_WINDOW_HOURS = 24;
const SERIALIZATION_ATTEMPTS = 3;

export const postgresAvailabilityRepository: AvailabilityRepository = {
  async transaction(work) {
    const { db } = getDatabase();
    for (let attempt = 1; attempt <= SERIALIZATION_ATTEMPTS; attempt += 1) {
      try {
        return await db.transaction(
          async (transaction) =>
            work({
              async getSchedulingPolicy(workspaceId) {
                const [workspace] = await transaction
                  .select({
                    defaultSessionMinutes: workspaces.defaultSessionMinutes,
                    bufferWarningMinutes: workspaces.bufferWarningMinutes,
                  })
                  .from(workspaces)
                  .where(and(eq(workspaces.id, workspaceId), eq(workspaces.status, "active")))
                  .limit(1);

                return workspace ?? null;
              },

              async findNearby(workspaceId, startsAt, endsAt) {
                const windowStart = new Date(
                  startsAt.getTime() - NEARBY_WINDOW_HOURS * 60 * 60 * 1000,
                );
                const windowEnd = new Date(
                  endsAt.getTime() + NEARBY_WINDOW_HOURS * 60 * 60 * 1000,
                );

                return transaction
                  .select({
                    id: availabilitySlots.id,
                    startsAt: availabilitySlots.startsAt,
                    endsAt: availabilitySlots.endsAt,
                  })
                  .from(availabilitySlots)
                  .where(
                    and(
                      eq(availabilitySlots.workspaceId, workspaceId),
                      ne(availabilitySlots.status, "withdrawn"),
                      lt(availabilitySlots.startsAt, windowEnd),
                      gt(availabilitySlots.endsAt, windowStart),
                    ),
                  )
                  .orderBy(asc(availabilitySlots.startsAt));
              },

              async insert(
                input: PersistAvailabilityInput,
              ): Promise<PersistAvailabilityResult> {
                const [slot] = await transaction
                  .insert(availabilitySlots)
                  .values(input)
                  .onConflictDoNothing()
                  .returning({
                    id: availabilitySlots.id,
                    workspaceId: availabilitySlots.workspaceId,
                    startsAt: availabilitySlots.startsAt,
                    endsAt: availabilitySlots.endsAt,
                    status: availabilitySlots.status,
                  });

                if (!slot) {
                  return { ok: false, reason: "overlap" };
                }

                if (slot.status !== "open") {
                  throw new Error("Availability insert returned a non-open slot");
                }

                return { ok: true, slot: { ...slot, status: "open" } };
              },
            }),
          { isolationLevel: "serializable" },
        );
      } catch (error) {
        if (attempt < SERIALIZATION_ATTEMPTS && isSerializationFailure(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new Error("Availability transaction retry limit reached");
  },

  async list(workspaceId, from, to) {
    const { db } = getDatabase();
    const rows = await db
      .select({
        id: availabilitySlots.id,
        workspaceId: availabilitySlots.workspaceId,
        startsAt: availabilitySlots.startsAt,
        endsAt: availabilitySlots.endsAt,
        status: availabilitySlots.status,
      })
      .from(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.workspaceId, workspaceId),
          eq(availabilitySlots.status, "open"),
          lt(availabilitySlots.startsAt, to),
          gt(availabilitySlots.endsAt, from),
        ),
      )
      .orderBy(asc(availabilitySlots.startsAt));

    return rows.map((row) => ({ ...row, status: "open" as const }));
  },
};

function isSerializationFailure(error: unknown): boolean {
  return getPostgresErrorCode(error) === "40001";
}

function getPostgresErrorCode(error: unknown): unknown {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code
  );
}
