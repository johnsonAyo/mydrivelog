import { createHash, randomBytes } from "node:crypto";
import { getDatabase } from "@/infrastructure/database/client";
import { nearbyGapWarning } from "@/domain/collections/slot-policy";
import { canLearnerChange, hasBookingNotice, weeklyBookingLimit } from "@/domain/collections/booking-policy";
import { isWithinWeek, weekLabel } from "@/domain/collections/week";
import { listLearners } from "@/infrastructure/learners/postgres-learner-repository";

type CollectionRow = { id: string; name: string; week_start: string; status: "draft" | "live"; updated_at: string; workspace_id: string };
type SlotRow = { id: string; starts_at: string; ends_at: string; status: "private" | "open" | "booked" | "closed" };
type InviteRow = { id: string; name: string; email: string; email_status: string };
type BookingRow = { id: string; slot_id: string; name: string; email: string; status: string; starts_at: string; ends_at: string; confirmation_email_status: string };
type PublicContext = { collection_id: string; workspace_id: string; instructor_name: string; instructor_email: string; contact_phone: string | null; timezone: string; minimum_booking_notice_hours: number; weekly_booking_allowance: string; status: string; name: string | null; email: string | null; kind: "invitation" | "access" | "general" };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const iso = (date: string) => new Date(date).toISOString();

export async function listCollections(workspaceId: string) {
  const { client } = getDatabase();
  const rows = await client<(CollectionRow & { slot_count: number; open_count: number; booking_count: number })[]>`
    select c.*, count(distinct s.id)::int as slot_count,
      count(distinct s.id) filter (where s.status = 'open')::int as open_count,
      count(distinct b.id) filter (where b.status = 'confirmed')::int as booking_count
    from availability_collections c
      left join collection_slots s on s.collection_id = c.id
      left join collection_bookings b on b.collection_id = c.id
    where c.workspace_id = ${workspaceId}
    group by c.id order by c.updated_at desc
  `;
  return rows.map((row) => ({ id: row.id, name: row.name, weekStart: row.week_start, status: row.status, updatedAt: iso(row.updated_at), slotCount: row.slot_count, openCount: row.open_count, bookingCount: row.booking_count }));
}

export async function listContacts(workspaceId: string) {
  return (await listLearners(workspaceId)).map(({ name, email }) => ({ name, email }));
}

export async function getInstructorForWorkspace(workspaceId: string) {
  const { client } = getDatabase();
  const [row] = await client<{ name: string; email: string; timezone: string }[]>`
    select coalesce(nullif(i.full_name, ''), 'Your instructor') as name, i.email, w.timezone from workspaces w join instructor_identities i on i.id = w.owner_identity_id where w.id = ${workspaceId}
  `;
  return row ?? null;
}

export async function createCollection(workspaceId: string, weekStart: string) {
  const { client } = getDatabase();
  const [created] = await client<CollectionRow[]>`
    insert into availability_collections (workspace_id, name, week_start)
    values (${workspaceId}, ${weekLabel(weekStart)}, ${weekStart})
    on conflict (workspace_id, week_start) do nothing returning *
  `;
  const [row] = created ? [created] : await client<CollectionRow[]>`
    select * from availability_collections where workspace_id = ${workspaceId} and week_start = ${weekStart}
  `;
  return { id: row.id, name: row.name, weekStart: row.week_start, status: row.status };
}

export async function getCollection(workspaceId: string, id: string) {
  const { client } = getDatabase();
  const [collection] = await client<CollectionRow[]>`select * from availability_collections where id = ${id} and workspace_id = ${workspaceId}`;
  if (!collection) return null;
  const [slots, invitations, bookings, general] = await Promise.all([
    client<SlotRow[]>`select id, starts_at, ends_at, status from collection_slots where collection_id = ${id} order by starts_at`,
    client<InviteRow[]>`select id, name, email, email_status from collection_invitations where collection_id = ${id} order by created_at`,
    client<BookingRow[]>`select b.id, b.slot_id, b.name, b.email, b.status, s.starts_at, s.ends_at, b.confirmation_email_status from collection_bookings b join collection_slots s on s.id = b.slot_id where b.collection_id = ${id} and b.status = 'confirmed' order by s.starts_at`,
    client<{ token: string }[]>`select token from collection_general_links where collection_id = ${id}`,
  ]);
  return {
    id: collection.id, name: collection.name, weekStart: collection.week_start, status: collection.status, updatedAt: iso(collection.updated_at),
    slots: slots.map((slot) => ({ id: slot.id, startsAt: iso(slot.starts_at), endsAt: iso(slot.ends_at), status: slot.status })),
    invitations: invitations.map((invite) => ({ id: invite.id, name: invite.name, email: invite.email, emailStatus: invite.email_status })),
    bookings: bookings.map((booking) => ({ id: booking.id, slotId: booking.slot_id, name: booking.name, email: booking.email, startsAt: iso(booking.starts_at), endsAt: iso(booking.ends_at), confirmationEmailStatus: booking.confirmation_email_status })),
    generalToken: general[0]?.token ?? null,
  };
}

export async function getCollectionPreview(workspaceId: string, id: string, kind: "invitation" | "general") {
  const collection = await getCollection(workspaceId, id);
  if (!collection) return null;
  const { client } = getDatabase();
  const [instructor] = await client<{ name: string; email: string; contact_phone: string | null; timezone: string; minimum_booking_notice_hours: number }[]>`
    select coalesce(nullif(i.full_name, ''), 'Your instructor') as name, i.email, w.contact_phone, w.timezone, w.minimum_booking_notice_hours from workspaces w
      join instructor_identities i on i.id = w.owner_identity_id where w.id = ${workspaceId}
  `;
  const slots = await client<SlotRow[]>`
    select s.id, s.starts_at, s.ends_at, s.status from collection_slots s
    where s.collection_id = ${id} and s.status = ${collection.status === "draft" ? "private" : "open"}
      and s.starts_at > now() + ${instructor.minimum_booking_notice_hours} * interval '1 hour'
      and not exists (
        select 1 from collection_bookings b join collection_slots occupied on occupied.id = b.slot_id
          join availability_collections c on c.id = b.collection_id
        where c.workspace_id = ${workspaceId} and b.status = 'confirmed'
          and occupied.starts_at < s.ends_at and occupied.ends_at > s.starts_at
      )
      and not exists (
        select 1 from bookings legacy where legacy.workspace_id = ${workspaceId}
          and legacy.status = 'confirmed' and legacy.starts_at < s.ends_at and legacy.ends_at > s.starts_at
      )
    order by s.starts_at
  `;
  return { collectionName: collection.name, instructorName: instructor.name, instructorEmail: instructor.email,
    contactPhone: instructor.contact_phone, timezone: instructor.timezone, name: kind === "invitation" ? "Invited learner" : null,
    kind, slots: slots.map((slot) => ({ id: slot.id, startsAt: iso(slot.starts_at), endsAt: iso(slot.ends_at) })), ownBookings: [] };
}

export async function saveSlot(workspaceId: string, collectionId: string, input: { id?: string; startsAt: Date; endsAt: Date; makeAvailable: boolean }) {
  const { client } = getDatabase();
  return client.begin(async (sql) => {
    // Serialize changes across all lists in this instructor workspace.
    const [settings] = await sql<{ buffer_warning_minutes: number; timezone: string }[]>`select buffer_warning_minutes, timezone from workspaces where id = ${workspaceId} for update`;
    const [collection] = await sql<CollectionRow[]>`select * from availability_collections where id = ${collectionId} and workspace_id = ${workspaceId} for update`;
    if (!collection) return { ok: false as const, reason: "not_found" as const };
    if (!isWithinWeek(input.startsAt, collection.week_start, settings.timezone) || !isWithinWeek(input.endsAt, collection.week_start, settings.timezone)) {
      return { ok: false as const, reason: "outside_week" as const };
    }
    const others = await sql<SlotRow[]>`
      select s.id, s.starts_at, s.ends_at, s.status from collection_slots s
      join availability_collections c on c.id = s.collection_id
      where c.workspace_id = ${workspaceId} and s.status <> 'closed'
        and (${input.id ?? null}::uuid is null or s.id <> ${input.id ?? null}::uuid)
      order by s.starts_at
    `;
    if (others.some((slot) => input.startsAt < new Date(slot.ends_at) && new Date(slot.starts_at) < input.endsAt)) {
      return { ok: false as const, reason: "overlap" as const };
    }
    const warning = nearbyGapWarning(input, others.map((slot) => ({ startsAt: new Date(slot.starts_at), endsAt: new Date(slot.ends_at) })), settings.buffer_warning_minutes);
    const status = collection.status === "live" && input.makeAvailable ? "open" : "private";
    let rows: SlotRow[];
    if (input.id) {
      const [existing] = await sql<SlotRow[]>`select * from collection_slots where id = ${input.id} and collection_id = ${collectionId} for update`;
      if (!existing) return { ok: false as const, reason: "not_found" as const };
      if (existing.status === "booked") return { ok: false as const, reason: "booked" as const };
      rows = await sql<SlotRow[]>`update collection_slots set starts_at = ${input.startsAt.toISOString()}, ends_at = ${input.endsAt.toISOString()}, updated_at = now() where id = ${input.id} returning *`;
    } else {
      rows = await sql<SlotRow[]>`insert into collection_slots (collection_id, starts_at, ends_at, status) values (${collectionId}, ${input.startsAt.toISOString()}, ${input.endsAt.toISOString()}, ${status}) returning *`;
    }
    await sql`update availability_collections set updated_at = now() where id = ${collectionId}`;
    return { ok: true as const, slot: { id: rows[0].id, startsAt: iso(rows[0].starts_at), endsAt: iso(rows[0].ends_at), status: rows[0].status }, warning };
  });
}

export async function setSlotStatus(workspaceId: string, collectionId: string, slotId: string, status: "private" | "open" | "closed") {
  const { client } = getDatabase();
  return client.begin(async (sql) => {
    const [collection] = await sql<CollectionRow[]>`select * from availability_collections where id = ${collectionId} and workspace_id = ${workspaceId} for update`;
    if (!collection || (status === "open" && collection.status !== "live")) return false;
    const rows = await sql<{ id: string }[]>`update collection_slots set status = ${status}, updated_at = now() where id = ${slotId} and collection_id = ${collectionId} and status <> 'booked' returning id`;
    return rows.length > 0;
  });
}

export async function createInvitation(workspaceId: string, collectionId: string, name: string, email: string) {
  const { client } = getDatabase();
  return client.begin(async (sql) => {
    const [collection] = await sql<CollectionRow[]>`select * from availability_collections where id = ${collectionId} and workspace_id = ${workspaceId} for update`;
    if (!collection) return { ok: false as const, reason: "not_found" as const };
    const [available] = await sql<{ count: number }[]>`select count(*)::int as count from collection_slots where collection_id = ${collectionId} and (status = 'open' or (${collection.status} = 'draft' and status = 'private')) and starts_at > now()`;
    if (!available.count) return { ok: false as const, reason: "empty" as const };
    const token = newToken();
    const [invite] = await sql<{ id: string }[]>`
      insert into collection_invitations (collection_id, name, email, token_hash)
      values (${collectionId}, ${name}, ${email.toLowerCase()}, ${hash(token)})
      on conflict (collection_id, lower(email)) do update
        set name = excluded.name, token_hash = excluded.token_hash, email_status = 'not_sent'
      returning id
    `;
    await sql`update availability_collections set status = 'live', updated_at = now() where id = ${collectionId}`;
    if (collection.status === "draft") await sql`update collection_slots set status = 'open', updated_at = now() where collection_id = ${collectionId} and status = 'private'`;
    return { ok: true as const, id: invite.id, token };
  });
}

export async function setInvitationEmailStatus(id: string, status: "sent" | "failed" | "not_configured") {
  const { client } = getDatabase();
  await client`update collection_invitations set email_status = ${status} where id = ${id}`;
}

export async function createGeneralLink(workspaceId: string, collectionId: string) {
  const { client } = getDatabase();
  return client.begin(async (sql) => {
    const [collection] = await sql<CollectionRow[]>`select * from availability_collections where id = ${collectionId} and workspace_id = ${workspaceId} for update`;
    if (!collection) return { ok: false as const, reason: "not_found" as const };
    const [available] = await sql<{ count: number }[]>`select count(*)::int as count from collection_slots where collection_id = ${collectionId} and (status = 'open' or (${collection.status} = 'draft' and status = 'private')) and starts_at > now()`;
    if (!available.count) return { ok: false as const, reason: "empty" as const };
    const [existing] = await sql<{ token: string }[]>`select token from collection_general_links where collection_id = ${collectionId}`;
    if (existing) return { ok: true as const, token: existing.token };
    const token = newToken();
    await sql`insert into collection_general_links (collection_id, token, token_hash) values (${collectionId}, ${token}, ${hash(token)})`;
    await sql`update availability_collections set status = 'live', updated_at = now() where id = ${collectionId}`;
    if (collection.status === "draft") await sql`update collection_slots set status = 'open', updated_at = now() where collection_id = ${collectionId} and status = 'private'`;
    return { ok: true as const, token };
  });
}

async function resolvePublicToken(token: string): Promise<PublicContext | null> {
  const { client } = getDatabase();
  const tokenHash = hash(token);
  const [context] = await client<PublicContext[]>`
    select c.id as collection_id, w.id as workspace_id, coalesce(nullif(ii.full_name, ''), 'Your instructor') as instructor_name,
      ii.email as instructor_email, w.contact_phone, w.timezone, w.minimum_booking_notice_hours, w.weekly_booking_allowance, c.status,
      identity.name, identity.email, identity.kind
    from (
      select collection_id, name, email, 'invitation'::text as kind from collection_invitations where token_hash = ${tokenHash}
      union all
      select collection_id, name, email, 'access'::text as kind from collection_general_access where token_hash = ${tokenHash} and expires_at > now()
      union all
      select collection_id, null::text as name, null::text as email, 'general'::text as kind from collection_general_links where token_hash = ${tokenHash}
    ) identity join availability_collections c on c.id = identity.collection_id
      join workspaces w on w.id = c.workspace_id
      join instructor_identities ii on ii.id = w.owner_identity_id
    where c.status = 'live' and w.status = 'active'
  `;
  return context ?? null;
}

export async function getPublicCollection(token: string) {
  const context = await resolvePublicToken(token);
  if (!context) return null;
  const { client } = getDatabase();
  const slots = await client<SlotRow[]>`
    select s.id, s.starts_at, s.ends_at, s.status from collection_slots s
    where s.collection_id = ${context.collection_id} and s.status = 'open'
      and s.starts_at > now() + ${context.minimum_booking_notice_hours} * interval '1 hour'
      and not exists (
        select 1 from collection_bookings b join collection_slots occupied on occupied.id = b.slot_id
          join availability_collections c on c.id = b.collection_id
        where c.workspace_id = ${context.workspace_id} and b.status = 'confirmed'
          and occupied.starts_at < s.ends_at and occupied.ends_at > s.starts_at
      )
      and not exists (
        select 1 from bookings legacy where legacy.workspace_id = ${context.workspace_id}
          and legacy.status = 'confirmed' and legacy.starts_at < s.ends_at and legacy.ends_at > s.starts_at
      )
    order by s.starts_at
  `;
  const own = context.email ? await client<{ id: string; starts_at: string; ends_at: string }[]>`
    select b.id, s.starts_at, s.ends_at from collection_bookings b join collection_slots s on s.id = b.slot_id
    where b.collection_id = ${context.collection_id} and lower(b.email) = lower(${context.email}) and b.status = 'confirmed'
    order by s.starts_at
  ` : [];
  return {
    collectionId: context.collection_id,
    collectionName: (await client<{ name: string }[]>`select name from availability_collections where id = ${context.collection_id}`)[0].name,
    instructorName: context.instructor_name, instructorEmail: context.instructor_email, contactPhone: context.contact_phone, timezone: context.timezone,
    name: context.name, kind: context.kind,
    slots: slots.map((slot) => ({ id: slot.id, startsAt: iso(slot.starts_at), endsAt: iso(slot.ends_at) })),
    ownBookings: own.map((booking) => ({ id: booking.id, startsAt: iso(booking.starts_at), endsAt: iso(booking.ends_at) })),
  };
}

export async function requestGeneralAccess(token: string, name: string, email: string) {
  const context = await resolvePublicToken(token);
  if (!context || context.kind !== "general") return null;
  const accessToken = newToken();
  const { client } = getDatabase();
  await client`insert into collection_general_access (collection_id, name, email, token_hash, expires_at)
    values (${context.collection_id}, ${name}, ${email.toLowerCase()}, ${hash(accessToken)},
      greatest(now() + interval '7 days',
        (select coalesce(max(ends_at), now()) + interval '7 days' from collection_slots where collection_id = ${context.collection_id})))`;
  return { accessToken, instructorName: context.instructor_name };
}

export type ClaimCollectionResult =
  | { ok: true; id: string; name: string; email: string; startsAt: string; endsAt: string; instructorName: string; instructorEmail: string; timezone: string }
  | { ok: false; reason: "unavailable" | "conflict" | "weekly_limit" | "verify_email" };

export async function claimCollectionSlot(token: string, slotId: string): Promise<ClaimCollectionResult> {
  const context = await resolvePublicToken(token);
  if (!context) return { ok: false, reason: "unavailable" };
  if (!context.email || !context.name) return { ok: false, reason: "verify_email" };
  const email = context.email;
  const name = context.name;
  const { client } = getDatabase();
  return client.begin(async (sql): Promise<ClaimCollectionResult> => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${context.workspace_id}, 0))`;
    const [slot] = await sql<SlotRow[]>`
      select id, starts_at, ends_at, status from collection_slots where id = ${slotId} and collection_id = ${context.collection_id} for update
    `;
    if (!slot || slot.status !== "open" || !hasBookingNotice(slot.starts_at, context.minimum_booking_notice_hours)) return { ok: false, reason: "conflict" };
    const [occupied] = await sql<{ id: string }[]>`
      select b.id from collection_bookings b join collection_slots s on s.id = b.slot_id
        join availability_collections c on c.id = b.collection_id
      where c.workspace_id = ${context.workspace_id} and b.status = 'confirmed'
        and s.starts_at < ${iso(slot.ends_at)} and s.ends_at > ${iso(slot.starts_at)} limit 1
    `;
    if (occupied) return { ok: false, reason: "conflict" };
    const [legacyBooking] = await sql<{ id: string }[]>`
      select id from bookings where workspace_id = ${context.workspace_id} and status = 'confirmed'
        and starts_at < ${iso(slot.ends_at)} and ends_at > ${iso(slot.starts_at)} limit 1
    `;
    if (legacyBooking) return { ok: false, reason: "conflict" };
    const limit = weeklyBookingLimit(context.weekly_booking_allowance);
    if (limit !== null) {
      const [count] = await sql<{ count: number }[]>`
        select count(*)::int as count from (
          select s.starts_at, b.email from collection_bookings b
            join availability_collections c on c.id = b.collection_id
            join collection_slots s on s.id = b.slot_id
          where c.workspace_id = ${context.workspace_id} and b.status = 'confirmed'
          union all
          select b.starts_at, r.email from bookings b
            join release_recipients r on r.id = b.recipient_id
          where b.workspace_id = ${context.workspace_id} and b.status = 'confirmed'
        ) booked
        where lower(booked.email) = lower(${email})
          and date_trunc('week', booked.starts_at at time zone ${context.timezone}) = date_trunc('week', ${iso(slot.starts_at)}::timestamptz at time zone ${context.timezone})
      `;
      if (count.count >= limit) return { ok: false, reason: "weekly_limit" };
    }
    const [booking] = await sql<{ id: string }[]>`
      insert into collection_bookings (collection_id, slot_id, name, email)
      values (${context.collection_id}, ${slotId}, ${name}, ${email.toLowerCase()}) returning id
    `;
    await sql`update collection_slots set status = 'booked', updated_at = now() where id = ${slotId}`;
    return { ok: true, id: booking.id, name, email, startsAt: iso(slot.starts_at), endsAt: iso(slot.ends_at), instructorName: context.instructor_name, instructorEmail: context.instructor_email, timezone: context.timezone };
  });
}

export async function setCollectionBookingEmailStatus(id: string, status: "sent" | "failed" | "not_configured") {
  const { client } = getDatabase();
  await client`update collection_bookings set confirmation_email_status = ${status} where id = ${id}`;
}

export type ChangeBookingResult =
  | { ok: true; name: string; email: string; instructorEmail: string; instructorName: string; timezone: string; startsAt: string; endsAt: string; action: "cancel" | "reschedule" }
  | { ok: false; reason: "not_found" | "too_late" | "conflict" };

export async function changeCollectionBooking(input: {
  collectionId: string; bookingId: string; actor: { kind: "instructor"; workspaceId: string } | { kind: "learner"; token: string };
  action: "cancel" | "reschedule"; targetSlotId?: string;
}): Promise<ChangeBookingResult> {
  const publicContext = input.actor.kind === "learner" ? await resolvePublicToken(input.actor.token) : null;
  if (input.actor.kind === "learner" && (!publicContext || !publicContext.email || publicContext.collection_id !== input.collectionId)) return { ok: false, reason: "not_found" };
  const workspaceId = input.actor.kind === "instructor" ? input.actor.workspaceId : publicContext!.workspace_id;
  const { client } = getDatabase();
  return client.begin(async (sql): Promise<ChangeBookingResult> => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${workspaceId}, 0))`;
    const [booking] = await sql<{ id: string; slot_id: string; name: string; email: string; status: string; starts_at: string; ends_at: string; collection_status: string; instructor_name: string; instructor_email: string; timezone: string; notice_hours: number }[]>`
      select b.id, b.slot_id, b.name, b.email, b.status, s.starts_at, s.ends_at, c.status as collection_status,
        coalesce(nullif(i.full_name, ''), 'Your instructor') as instructor_name, i.email as instructor_email, w.timezone, w.minimum_booking_notice_hours as notice_hours
      from collection_bookings b join collection_slots s on s.id = b.slot_id
        join availability_collections c on c.id = b.collection_id
        join workspaces w on w.id = c.workspace_id join instructor_identities i on i.id = w.owner_identity_id
      where b.id = ${input.bookingId} and b.collection_id = ${input.collectionId} and c.workspace_id = ${workspaceId}
      for update of b, s
    `;
    if (!booking || booking.status !== "confirmed" || (publicContext && booking.email.toLowerCase() !== publicContext.email!.toLowerCase())) return { ok: false, reason: "not_found" };
    if (input.actor.kind === "learner" && !canLearnerChange(booking.starts_at)) return { ok: false, reason: "too_late" };
    let startsAt = iso(booking.starts_at);
    let endsAt = iso(booking.ends_at);
    let nextSlotId: string | null = null;
    if (input.action === "reschedule") {
      if (!input.targetSlotId) return { ok: false, reason: "conflict" };
      const [target] = await sql<SlotRow[]>`select id, starts_at, ends_at, status from collection_slots where id = ${input.targetSlotId} and collection_id = ${input.collectionId} for update`;
      if (!target || target.status !== "open" || !hasBookingNotice(target.starts_at, input.actor.kind === "learner" ? booking.notice_hours : 0)) return { ok: false, reason: "conflict" };
      const [occupied] = await sql<{ id: string }[]>`
        select b.id from collection_bookings b join collection_slots s on s.id = b.slot_id
          join availability_collections c on c.id = b.collection_id
        where c.workspace_id = ${workspaceId} and b.status = 'confirmed' and b.id <> ${booking.id}
          and s.starts_at < ${iso(target.ends_at)} and s.ends_at > ${iso(target.starts_at)} limit 1
      `;
      const [legacy] = await sql<{ id: string }[]>`
        select id from bookings where workspace_id = ${workspaceId} and status = 'confirmed'
          and starts_at < ${iso(target.ends_at)} and ends_at > ${iso(target.starts_at)} limit 1
      `;
      if (occupied || legacy) return { ok: false, reason: "conflict" };
      startsAt = iso(target.starts_at);
      endsAt = iso(target.ends_at);
      nextSlotId = target.id;
    }
    if (nextSlotId) {
      await sql`update collection_bookings set slot_id = ${nextSlotId} where id = ${booking.id}`;
      await sql`update collection_slots set status = 'booked', updated_at = now() where id = ${nextSlotId}`;
    } else {
      await sql`update collection_bookings set status = 'cancelled' where id = ${booking.id}`;
    }
    const originalStatus = new Date(booking.starts_at) <= new Date() ? "closed" : booking.collection_status === "live" ? "open" : "private";
    await sql`update collection_slots set status = ${originalStatus}, updated_at = now() where id = ${booking.slot_id}`;
    return { ok: true, name: booking.name, email: booking.email, instructorEmail: booking.instructor_email,
      instructorName: booking.instructor_name, timezone: booking.timezone, startsAt, endsAt, action: input.action };
  });
}
