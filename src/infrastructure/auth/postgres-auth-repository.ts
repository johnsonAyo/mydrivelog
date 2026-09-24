import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { AuthRepository } from "@/application/auth/access-repository";
import { getDatabase } from "@/infrastructure/database/client";
import { authChallenges, instructorIdentities, instructorSessions, workspaces } from "@/infrastructure/database/schema";

const TRIAL_DAYS = 14;
const REQUEST_COOLDOWN_MS = 60_000;

export const postgresAuthRepository: AuthRepository = {
  async issueChallenge({ email, tokenHash, expiresAt, now }) {
    const { db } = getDatabase();
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${email}))`);
      const [recent] = await tx
        .select({ createdAt: authChallenges.createdAt })
        .from(authChallenges)
        .where(and(eq(authChallenges.email, email), gt(authChallenges.createdAt, new Date(now.getTime() - REQUEST_COOLDOWN_MS))))
        .orderBy(desc(authChallenges.createdAt))
        .limit(1);
      if (recent) return "rate_limited" as const;

      await tx.insert(authChallenges).values({ email, tokenHash, expiresAt, createdAt: now });
      return "issued" as const;
    });
  },

  async consumeChallenge({ tokenHash, sessionTokenHash, sessionExpiresAt, now }) {
    const { db } = getDatabase();
    return db.transaction(async (tx) => {
      const [challenge] = await tx
        .update(authChallenges)
        .set({ consumedAt: now })
        .where(and(eq(authChallenges.tokenHash, tokenHash), isNull(authChallenges.consumedAt), gt(authChallenges.expiresAt, now)))
        .returning({ email: authChallenges.email });
      if (!challenge) return null;

      await tx.insert(instructorIdentities).values({ email: challenge.email }).onConflictDoNothing();
      const [identity] = await tx
        .select({ id: instructorIdentities.id })
        .from(instructorIdentities)
        .where(sql`lower(${instructorIdentities.email}) = ${challenge.email}`)
        .limit(1);
      if (!identity) throw new Error("Identity creation failed");

      const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
      await tx.insert(workspaces).values({
        ownerIdentityId: identity.id,
        name: "My driving school",
        trialStartedAt: now,
        trialEndsAt,
      }).onConflictDoNothing();
      const [workspace] = await tx
        .select({ id: workspaces.id, trialEndsAt: workspaces.trialEndsAt })
        .from(workspaces)
        .where(eq(workspaces.ownerIdentityId, identity.id))
        .limit(1);
      if (!workspace) throw new Error("Workspace creation failed");

      await tx.insert(instructorSessions).values({
        identityId: identity.id,
        tokenHash: sessionTokenHash,
        expiresAt: sessionExpiresAt,
        createdAt: now,
      });
      return { identityId: identity.id, workspaceId: workspace.id, trialEndsAt: workspace.trialEndsAt ?? trialEndsAt };
    });
  },
};
