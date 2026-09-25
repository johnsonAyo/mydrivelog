import { timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { AuthRepository } from "@/application/auth/access-repository";
import { hashAccessCode } from "@/application/auth/access-code";
import { getDatabase } from "@/infrastructure/database/client";
import { authChallenges, instructorIdentities, instructorSessions, workspaces } from "@/infrastructure/database/schema";

const REQUEST_COOLDOWN_MS = 60_000;
const DAILY_CODE_LIMIT = 10;
const MAX_ATTEMPTS = 5;

export const postgresAuthRepository: AuthRepository = {
  async issueCode({ id, email, codeHash, expiresAt, now }) {
    const { db } = getDatabase();
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${email}))`);
      const recent = await tx
        .select({ createdAt: authChallenges.createdAt })
        .from(authChallenges)
        .where(and(eq(authChallenges.email, email), gt(authChallenges.createdAt, new Date(now.getTime() - 86_400_000))))
        .orderBy(desc(authChallenges.createdAt))
        .limit(DAILY_CODE_LIMIT);
      if (recent.length >= DAILY_CODE_LIMIT || (recent[0] && recent[0].createdAt > new Date(now.getTime() - REQUEST_COOLDOWN_MS))) {
        return "rate_limited" as const;
      }

      await tx.update(authChallenges).set({ consumedAt: now }).where(and(eq(authChallenges.email, email), isNull(authChallenges.consumedAt)));
      await tx.insert(authChallenges).values({ id, email, tokenHash: codeHash, expiresAt, createdAt: now });
      return "issued" as const;
    });
  },

  async invalidateCode(id) {
    const { db } = getDatabase();
    await db.delete(authChallenges).where(eq(authChallenges.id, id));
  },

  async consumeCode({ email, code, secret, now }) {
    const { db } = getDatabase();
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${email}))`);
      const [challenge] = await tx
        .select({ id: authChallenges.id, tokenHash: authChallenges.tokenHash, attempts: authChallenges.attempts })
        .from(authChallenges)
        .where(and(eq(authChallenges.email, email), isNull(authChallenges.consumedAt), gt(authChallenges.expiresAt, now)))
        .orderBy(desc(authChallenges.createdAt))
        .limit(1);
      if (!challenge || challenge.attempts >= MAX_ATTEMPTS) return "invalid" as const;
      const actual = Buffer.from(hashAccessCode(secret, challenge.id, email, code), "hex");
      const expected = Buffer.from(challenge.tokenHash, "hex");
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        await tx.update(authChallenges).set({ attempts: challenge.attempts + 1 }).where(eq(authChallenges.id, challenge.id));
        return "invalid" as const;
      }
      await tx.update(authChallenges).set({ consumedAt: now }).where(eq(authChallenges.id, challenge.id));
      return "valid" as const;
    });
  },

  async establishSession({ email, firebaseUid, sessionTokenHash, sessionExpiresAt, now }) {
    const { db } = getDatabase();
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${email}))`);
      await tx.insert(instructorIdentities).values({ email, firebaseUid }).onConflictDoNothing();
      const [identity] = await tx
        .select({ id: instructorIdentities.id, firebaseUid: instructorIdentities.firebaseUid, fullName: instructorIdentities.fullName })
        .from(instructorIdentities)
        .where(sql`lower(${instructorIdentities.email}) = ${email}`)
        .limit(1);
      if (!identity) throw new Error("Identity creation failed");
      // A verified inbox code and a verified Google account can resolve to different
      // Firebase users. The verified email is the instructor's canonical identity.
      if (identity.firebaseUid !== firebaseUid) {
        await tx.update(instructorIdentities).set({ firebaseUid }).where(eq(instructorIdentities.id, identity.id));
      }

      await tx.insert(workspaces).values({
        ownerIdentityId: identity.id,
        name: "My driving school",
        pilotActive: true,
      }).onConflictDoNothing();
      const [workspace] = await tx
        .select({ id: workspaces.id })
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
      return { needsOnboarding: !identity.fullName };
    });
  },

  async completeOnboarding({ identityId, fullName }) {
    const { db } = getDatabase();
    await db.update(instructorIdentities).set({ fullName }).where(eq(instructorIdentities.id, identityId));
  },
  async revokeSession(sessionTokenHash) {
    const { db } = getDatabase();
    await db.update(instructorSessions).set({ revokedAt: new Date() }).where(eq(instructorSessions.tokenHash, sessionTokenHash));
  },
};
