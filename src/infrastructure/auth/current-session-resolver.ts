import { eq } from "drizzle-orm";
import type { SessionResolver } from "@/application/auth/session-context";
import { getDatabase } from "@/infrastructure/database/client";
import { workspaces } from "@/infrastructure/database/schema";
import { postgresSessionResolver } from "./postgres-session-resolver";

export const currentSessionResolver: SessionResolver = {
  async resolve(rawToken) {
    const workspaceId = process.env.DEV_WORKSPACE_ID;
    if (process.env.NODE_ENV !== "development" || !workspaceId) {
      return postgresSessionResolver.resolve(rawToken);
    }

    const { db } = getDatabase();
    const [workspace] = await db
      .select({
        identityId: workspaces.ownerIdentityId,
        workspaceId: workspaces.id,
        workspaceStatus: workspaces.status,
        trialEndsAt: workspaces.trialEndsAt,
        paidThrough: workspaces.paidThrough,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    return workspace ? { ...workspace, testingWorkspace: true } : null;
  },
};
