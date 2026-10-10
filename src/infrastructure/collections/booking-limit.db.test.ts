/**
 * Database-backed tests of the weekly booking limit enforced by claimCollectionSlot.
 *
 * The limit, the case-insensitive learner match and the race protection all live in SQL
 * (a workspace advisory lock and a count inside one transaction), so a mocked client could
 * not prove them. These tests run against a real Postgres and are skipped unless
 * TEST_DATABASE_URL is set. Point it at the development database only, never production:
 *
 *   TEST_DATABASE_URL=<dev database url> npx vitest run src/infrastructure/collections/booking-limit.db.test.ts
 *
 * Each run creates its own throwaway instructor and workspace and deletes them afterwards.
 */
import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
const deployed = ["production", "staging"].includes(process.env.MONITORING_ENVIRONMENT?.trim().toLowerCase() ?? "")
  || process.env.VERCEL_ENV === "production";
const enabled = Boolean(testDatabaseUrl) && !deployed;

// Two future weeks, Monday to Sunday, in winter so Europe/London is UTC.
const WEEK_ONE = "2099-01-05";
const WEEK_TWO = "2099-01-12";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

// A remote database round trip per statement makes these slower than the unit tests.
const TIMEOUT_MS = 60_000;

describe.skipIf(!enabled)("weekly booking limit (database)", { timeout: TIMEOUT_MS }, () => {
  type Repository = typeof import("./postgres-collection-repository");
  type Client = ReturnType<typeof import("@/infrastructure/database/client").getDatabase>["client"];
  let repository: Repository;
  let sql: Client;
  let identityId: string;
  let workspaceId: string;
  const collections: Record<string, { id: string; slots: string[]; next: number }> = {};

  async function createWeek(weekStart: string) {
    const [collection] = await sql<{ id: string }[]>`
      insert into availability_collections (workspace_id, name, week_start, status)
      values (${workspaceId}, ${"Limit test " + weekStart}, ${weekStart}, 'live') returning id`;
    const slots: string[] = [];
    // Thirty one-hour lessons spread over the week, none overlapping.
    for (let day = 0; day < 5; day++) for (let hour = 8; hour < 14; hour++) {
      const startsAt = new Date(`${weekStart}T00:00:00.000Z`);
      startsAt.setUTCDate(startsAt.getUTCDate() + day);
      startsAt.setUTCHours(hour);
      const endsAt = new Date(startsAt.getTime() + 3_600_000);
      const [slot] = await sql<{ id: string }[]>`
        insert into collection_slots (collection_id, starts_at, ends_at, status)
        values (${collection.id}, ${startsAt.toISOString()}, ${endsAt.toISOString()}, 'open') returning id`;
      slots.push(slot.id);
    }
    collections[weekStart] = { id: collection.id, slots, next: 0 };
  }

  const slot = (week = WEEK_ONE) => collections[week].slots[collections[week].next++];

  /** The personal link an instructor sends to one learner. */
  async function privateLink(email: string, week = WEEK_ONE) {
    const token = newToken();
    await sql`insert into collection_invitations (collection_id, name, email, token_hash)
      values (${collections[week].id}, 'Test Learner', ${email}, ${hash(token)})`;
    return token;
  }

  /** The emailed link a learner receives after entering their name and email on the general link. */
  async function generalLinkAccess(email: string, week = WEEK_ONE) {
    const token = newToken();
    await sql`insert into collection_general_access (collection_id, name, email, token_hash, expires_at)
      values (${collections[week].id}, 'Test Learner', ${email}, ${hash(token)}, now() + interval '7 days')`;
    return token;
  }

  async function confirmed(email: string) {
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count from collection_bookings b join availability_collections c on c.id = b.collection_id
      where c.workspace_id = ${workspaceId} and lower(b.email) = lower(${email}) and b.status = 'confirmed'`;
    return row.count;
  }

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", testDatabaseUrl!);
    repository = await import("./postgres-collection-repository");
    sql = (await import("@/infrastructure/database/client")).getDatabase().client;
    const label = `booking-limit-test-${Date.now()}-${randomBytes(3).toString("hex")}`;
    [{ id: identityId }] = await sql<{ id: string }[]>`
      insert into instructor_identities (email, full_name) values (${label + "@example.invalid"}, 'Limit Test School') returning id`;
    [{ id: workspaceId }] = await sql<{ id: string }[]>`
      insert into workspaces (owner_identity_id, name, weekly_booking_allowance, trial_started_at, trial_ends_at)
      values (${identityId}, ${label}, 'two', now(), now() + interval '30 days') returning id`;
    await createWeek(WEEK_ONE);
    await createWeek(WEEK_TWO);
  }, TIMEOUT_MS * 2);

  afterAll(async () => {
    if (!sql) return;
    try {
      const ids = Object.values(collections).map((collection) => collection.id);
      if (ids.length) await sql`delete from collection_bookings where collection_id in ${sql(ids)}`;
      if (workspaceId) await sql`delete from workspaces where id = ${workspaceId}`;
      if (identityId) await sql`delete from instructor_identities where id = ${identityId}`;
    } finally {
      await sql.end();
      vi.unstubAllEnvs();
    }
  }, TIMEOUT_MS);

  it("refuses the booking after the limit on a private link", async () => {
    const link = await privateLink("private@example.com");
    expect((await repository.claimCollectionSlot(link, slot())).ok).toBe(true);
    expect((await repository.claimCollectionSlot(link, slot())).ok).toBe(true);
    expect(await repository.claimCollectionSlot(link, slot())).toEqual({ ok: false, reason: "weekly_limit" });
    expect(await confirmed("private@example.com")).toBe(2);
  });

  it("refuses the booking after the limit on the general link, even from a second emailed link", async () => {
    const first = await generalLinkAccess("general@example.com");
    const second = await generalLinkAccess("general@example.com");
    expect((await repository.claimCollectionSlot(first, slot())).ok).toBe(true);
    expect((await repository.claimCollectionSlot(second, slot())).ok).toBe(true);
    expect(await repository.claimCollectionSlot(first, slot())).toEqual({ ok: false, reason: "weekly_limit" });
    expect(await repository.claimCollectionSlot(second, slot())).toEqual({ ok: false, reason: "weekly_limit" });
    expect(await confirmed("general@example.com")).toBe(2);
  });

  it("does not let anyone book from the bare general link without a confirmed email", async () => {
    const token = newToken();
    await sql`insert into collection_general_links (collection_id, token, token_hash) values (${collections[WEEK_ONE].id}, ${token}, ${hash(token)})`;
    expect(await repository.claimCollectionSlot(token, slot())).toEqual({ ok: false, reason: "verify_email" });
  });

  it("counts capital-letter variants of an email as the same learner across both link types", async () => {
    const invited = await privateLink("casey@example.com");
    const shouting = await generalLinkAccess("CASEY@EXAMPLE.COM");
    const mixed = await generalLinkAccess("Casey@Example.com");
    expect((await repository.claimCollectionSlot(invited, slot())).ok).toBe(true);
    expect((await repository.claimCollectionSlot(shouting, slot())).ok).toBe(true);
    expect(await repository.claimCollectionSlot(mixed, slot())).toEqual({ ok: false, reason: "weekly_limit" });
    expect(await repository.claimCollectionSlot(invited, slot())).toEqual({ ok: false, reason: "weekly_limit" });
    expect(await confirmed("casey@example.com")).toBe(2);
  });

  it("frees a place when a learner cancels", async () => {
    const link = await privateLink("cancel@example.com");
    const kept = await repository.claimCollectionSlot(link, slot());
    const cancelled = await repository.claimCollectionSlot(link, slot());
    expect(kept.ok && cancelled.ok).toBe(true);
    expect(await repository.claimCollectionSlot(link, slot())).toEqual({ ok: false, reason: "weekly_limit" });
    const change = await repository.changeCollectionBooking({
      collectionId: collections[WEEK_ONE].id, bookingId: cancelled.ok ? cancelled.id : "", actor: { kind: "learner", token: link }, action: "cancel",
    });
    expect(change.ok).toBe(true);
    expect((await repository.claimCollectionSlot(link, slot())).ok).toBe(true);
    expect(await repository.claimCollectionSlot(link, slot())).toEqual({ ok: false, reason: "weekly_limit" });
  });

  it("allows a learner at the limit to book in the following week", async () => {
    const thisWeek = await privateLink("nextweek@example.com");
    expect((await repository.claimCollectionSlot(thisWeek, slot())).ok).toBe(true);
    expect((await repository.claimCollectionSlot(thisWeek, slot())).ok).toBe(true);
    expect(await repository.claimCollectionSlot(thisWeek, slot())).toEqual({ ok: false, reason: "weekly_limit" });
    const followingWeek = await privateLink("nextweek@example.com", WEEK_TWO);
    expect((await repository.claimCollectionSlot(followingWeek, slot(WEEK_TWO))).ok).toBe(true);
  });

  it("lets exactly one of two simultaneous confirms take the last place", async () => {
    for (let round = 0; round < 3; round++) {
      const email = `race-${round}@example.com`;
      const invited = await privateLink(email);
      const general = await generalLinkAccess(email);
      expect((await repository.claimCollectionSlot(invited, slot())).ok).toBe(true);
      const results = await Promise.all([
        repository.claimCollectionSlot(invited, slot()),
        repository.claimCollectionSlot(general, slot()),
      ]);
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, reason: "weekly_limit" }]);
      expect(await confirmed(email)).toBe(2);
    }
  });
});
