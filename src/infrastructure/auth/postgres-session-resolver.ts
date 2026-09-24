import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { SessionResolver } from "@/application/auth/session-context";
import { getDatabase } from "@/infrastructure/database/client";
import { instructorSessions, workspaces } from "@/infrastructure/database/schema";

export const postgresSessionResolver: SessionResolver = {
  async resolve(rawToken) {
    if (!rawToken) return null;
    const { db } = getDatabase();
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const [session] = await db
      .select({
        identityId: instructorSessions.identityId,
        workspaceId: workspaces.id,
        workspaceStatus: workspaces.status,
        trialEndsAt: workspaces.trialEndsAt,
        paidThrough: workspaces.paidThrough,
      })
      .from(instructorSessions)
      .innerJoin(workspaces, eq(workspaces.ownerIdentityId, instructorSessions.identityId))
      .where(
        and(
          eq(instructorSessions.tokenHash, tokenHash),
          gt(instructorSessions.expiresAt, new Date()),
          isNull(instructorSessions.revokedAt),
        ),
      )
      .limit(1);

    return session ?? null;
  },
};
