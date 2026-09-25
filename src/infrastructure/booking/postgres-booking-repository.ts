import { createHash, randomBytes } from "node:crypto";
import { bookableTimes } from "@/domain/booking/bookable-times";
import { getDatabase } from "@/infrastructure/database/client";

type WindowRow = {
  id: string; workspace_id: string; starts_at: string; ends_at: string;
  session_minutes: number; buffer_minutes: number; status: string;
  instructor_name?: string;
};

type BookingRow = { id: string; starts_at: string; ends_at: string; name: string; email: string; confirmation_email_status: string };

export type ReleaseRecipientInput = { name: string; email: string };
export type PublicBookingView = {
  recipientName: string;
  instructorName: string;
  timezone: string;
  windowStart: string;
  windowEnd: string;
  sessionMinutes: number;
  bufferMinutes: number;
  options: string[];
  alreadyBooked: { startsAt: string; endsAt: string } | null;
};

function hash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function timestamp(value: string) { return new Date(value); }

export async function getCalendarBookings(workspaceId: string, from: Date, to: Date) {
  const { client } = getDatabase();
  const rows = await client<BookingRow[]>`
    select b.id, b.starts_at, b.ends_at, r.name, r.email, b.confirmation_email_status
    from bookings b join release_recipients r on r.id = b.recipient_id
    where b.workspace_id = ${workspaceId} and b.status = 'confirmed'
      and b.starts_at < ${to.toISOString()} and b.ends_at > ${from.toISOString()}
    order by b.starts_at
  `;
  return rows.map((row) => ({
    id: row.id, startsAt: timestamp(row.starts_at).toISOString(), endsAt: timestamp(row.ends_at).toISOString(),
    name: row.name, email: row.email, confirmationEmailStatus: row.confirmation_email_status,
  }));
}

export async function getWindowDetail(workspaceId: string, id: string) {
  const { client } = getDatabase();
  const [window] = await client<WindowRow[]>`
    select a.id, a.workspace_id, a.starts_at, a.ends_at, a.session_minutes, a.buffer_minutes, a.status,
      w.name as instructor_name
    from availability_slots a join workspaces w on w.id = a.workspace_id
    where a.id = ${id} and a.workspace_id = ${workspaceId}
  `;
  if (!window) return null;
  const releases = await client<{ id: string; status: string; created_at: string; expires_at: string; recipient_count: number }[]>`
    select ar.id, ar.status, ar.created_at, ar.expires_at, count(rr.id)::int as recipient_count
    from availability_releases ar left join release_recipients rr on rr.release_id = ar.id
    where ar.availability_id = ${id} group by ar.id order by ar.created_at desc
  `;
  const bookings = await client<BookingRow[]>`
    select b.id, b.starts_at, b.ends_at, r.name, r.email, b.confirmation_email_status
    from bookings b join release_recipients r on r.id = b.recipient_id
    where b.availability_id = ${id} and b.status = 'confirmed' order by b.starts_at
  `;
  return {
    id: window.id, startsAt: timestamp(window.starts_at).toISOString(), endsAt: timestamp(window.ends_at).toISOString(),
    instructorName: window.instructor_name ?? "Your instructor",
    sessionMinutes: window.session_minutes, bufferMinutes: window.buffer_minutes, status: window.status,
    releases: releases.map((release) => ({ id: release.id, status: release.status, createdAt: timestamp(release.created_at).toISOString(), expiresAt: timestamp(release.expires_at).toISOString(), recipientCount: release.recipient_count })),
    bookings: bookings.map((booking) => ({ id: booking.id, startsAt: timestamp(booking.starts_at).toISOString(), endsAt: timestamp(booking.ends_at).toISOString(), name: booking.name, email: booking.email, confirmationEmailStatus: booking.confirmation_email_status })),
  };
}

export async function editWindow(workspaceId: string, id: string, input: { startsAt: Date; endsAt: Date; sessionMinutes: number; bufferMinutes: number; revokePublished: boolean }) {
  const { client } = getDatabase();
  return client.begin(async (sql) => {
    const [window] = await sql<WindowRow[]>`select * from availability_slots where id = ${id} and workspace_id = ${workspaceId} for update`;
    if (!window || window.status !== "open") return { ok: false as const, reason: "not_found" as const };
    const [booked] = await sql<{ count: number }[]>`select count(*)::int as count from bookings where availability_id = ${id} and status = 'confirmed'`;
    if (booked.count > 0) return { ok: false as const, reason: "has_bookings" as const };
    const [published] = await sql<{ count: number }[]>`select count(*)::int as count from availability_releases where availability_id = ${id} and status = 'published'`;
    if (published.count > 0 && !input.revokePublished) return { ok: false as const, reason: "release_exists" as const };
    const [overlap] = await sql<{ id: string }[]>`
      select id from availability_slots where workspace_id = ${workspaceId} and id <> ${id}
        and status <> 'withdrawn' and starts_at < ${input.endsAt.toISOString()} and ends_at > ${input.startsAt.toISOString()} limit 1
    `;
    if (overlap) return { ok: false as const, reason: "overlap" as const };
    await sql`update availability_releases set status = 'revoked' where availability_id = ${id} and status = 'published'`;
    await sql`update availability_slots set starts_at = ${input.startsAt.toISOString()}, ends_at = ${input.endsAt.toISOString()}, session_minutes = ${input.sessionMinutes}, buffer_minutes = ${input.bufferMinutes}, updated_at = now() where id = ${id}`;
    return { ok: true as const, revokedLinks: published.count > 0 };
  });
}

export async function releaseWindow(workspaceId: string, id: string, recipients: readonly ReleaseRecipientInput[]) {
  const { client } = getDatabase();
  return client.begin(async (sql) => {
    const [window] = await sql<WindowRow[]>`select * from availability_slots where id = ${id} and workspace_id = ${workspaceId} for update`;
    if (!window || window.status !== "open" || timestamp(window.ends_at) <= new Date()) return null;
    const expiry = new Date(Math.min(timestamp(window.ends_at).getTime(), Date.now() + 14 * 86_400_000));
    const [release] = await sql<{ id: string }[]>`
      insert into availability_releases (workspace_id, availability_id, expires_at)
      values (${workspaceId}, ${id}, ${expiry.toISOString()}) returning id
    `;
    const links: { id: string; name: string; email: string; token: string }[] = [];
    for (const recipient of recipients) {
      const token = randomBytes(32).toString("base64url");
      const [row] = await sql<{ id: string }[]>`
        insert into release_recipients (release_id, name, email, token_hash)
        values (${release.id}, ${recipient.name}, ${recipient.email.toLowerCase()}, ${hash(token)}) returning id
      `;
      links.push({ id: row.id, name: recipient.name, email: recipient.email.toLowerCase(), token });
    }
    return { releaseId: release.id, expiresAt: expiry.toISOString(), links };
  });
}

export async function setRecipientEmailStatus(id: string, status: "sent" | "failed" | "not_configured") {
  const { client } = getDatabase();
  await client`update release_recipients set email_status = ${status} where id = ${id}`;
}

export async function getPublicBooking(token: string): Promise<PublicBookingView | null> {
  const { client } = getDatabase();
  const [context] = await client<{
    recipient_id: string; name: string; instructor_name: string; timezone: string; window_id: string;
    starts_at: string; ends_at: string; session_minutes: number; buffer_minutes: number;
  }[]>`
    select rr.id as recipient_id, rr.name, w.name as instructor_name, w.timezone,
      a.id as window_id, a.starts_at, a.ends_at, a.session_minutes, a.buffer_minutes
    from release_recipients rr join availability_releases ar on ar.id = rr.release_id
      join availability_slots a on a.id = ar.availability_id
      join workspaces w on w.id = ar.workspace_id
    where rr.token_hash = ${hash(token)} and ar.status = 'published' and ar.expires_at > now()
      and a.status = 'open' and w.status = 'active'
  `;
  if (!context) return null;
  const booked = await client<{ starts_at: string; ends_at: string; recipient_id: string }[]>`
    select starts_at, ends_at, recipient_id from bookings
    where availability_id = ${context.window_id} and status = 'confirmed'
  `;
  const ownBooking = booked.find((row) => row.recipient_id === context.recipient_id);
  return {
    recipientName: context.name, instructorName: context.instructor_name, timezone: context.timezone,
    windowStart: timestamp(context.starts_at).toISOString(), windowEnd: timestamp(context.ends_at).toISOString(),
    sessionMinutes: context.session_minutes, bufferMinutes: context.buffer_minutes,
    options: ownBooking ? [] : bookableTimes({ startsAt: timestamp(context.starts_at), endsAt: timestamp(context.ends_at), sessionMinutes: context.session_minutes, bufferMinutes: context.buffer_minutes }, booked.map((row) => timestamp(row.starts_at)), new Date()).map((date) => date.toISOString()),
    alreadyBooked: ownBooking ? { startsAt: timestamp(ownBooking.starts_at).toISOString(), endsAt: timestamp(ownBooking.ends_at).toISOString() } : null,
  };
}

export type ClaimResult =
  | { ok: true; id: string; startsAt: string; endsAt: string; email: string; name: string; instructorName: string; recipientId: string }
  | { ok: false; reason: "unavailable" | "conflict" | "already_booked" | "weekly_limit" };

export async function claimBooking(token: string, start: Date): Promise<ClaimResult> {
  const { client } = getDatabase();
  return client.begin(async (sql): Promise<ClaimResult> => {
    const [context] = await sql<{
      recipient_id: string; email: string; name: string; instructor_name: string; workspace_id: string;
      window_id: string; starts_at: string; ends_at: string; session_minutes: number; buffer_minutes: number;
      weekly_booking_allowance: string; timezone: string; trial_ends_at: string | null; paid_through: string | null;
    }[]>`
      select rr.id as recipient_id, rr.email, rr.name, w.name as instructor_name, w.id as workspace_id,
        a.id as window_id, a.starts_at, a.ends_at, a.session_minutes, a.buffer_minutes,
        w.weekly_booking_allowance, w.timezone, w.trial_ends_at, w.paid_through
      from release_recipients rr join availability_releases ar on ar.id = rr.release_id
        join availability_slots a on a.id = ar.availability_id
        join workspaces w on w.id = ar.workspace_id
      where rr.token_hash = ${hash(token)} and ar.status = 'published' and ar.expires_at > now()
        and a.status = 'open' and w.status = 'active'
      for update of a
    `;
    if (!context) return { ok: false, reason: "unavailable" };
    const now = new Date();
    const testWorkspace = process.env.NODE_ENV === "development" && context.workspace_id === process.env.DEV_WORKSPACE_ID;
    if (!testWorkspace && !(context.trial_ends_at && timestamp(context.trial_ends_at) > now) && !(context.paid_through && timestamp(context.paid_through) > now)) return { ok: false, reason: "unavailable" };
    await sql`select pg_advisory_xact_lock(hashtextextended(${context.workspace_id + ":" + context.email.toLowerCase()}, 0))`;
    const [prior] = await sql<{ id: string }[]>`select id from bookings where recipient_id = ${context.recipient_id} and status = 'confirmed' limit 1`;
    if (prior) return { ok: false, reason: "already_booked" };
    const booked = await sql<{ starts_at: string }[]>`select starts_at from bookings where availability_id = ${context.window_id} and status = 'confirmed'`;
    const options = bookableTimes({ startsAt: timestamp(context.starts_at), endsAt: timestamp(context.ends_at), sessionMinutes: context.session_minutes, bufferMinutes: context.buffer_minutes }, booked.map((row) => timestamp(row.starts_at)), now);
    if (!options.some((option) => option.getTime() === start.getTime())) return { ok: false, reason: "conflict" };
    if (context.weekly_booking_allowance !== "unlimited") {
      const limit = context.weekly_booking_allowance === "one" ? 1 : 2;
      const [count] = await sql<{ count: number }[]>`
        select count(*)::int as count from bookings b join release_recipients rr on rr.id = b.recipient_id
        where b.workspace_id = ${context.workspace_id} and lower(rr.email) = lower(${context.email})
          and b.status = 'confirmed' and date_trunc('week', b.starts_at at time zone ${context.timezone}) = date_trunc('week', ${start.toISOString()}::timestamptz at time zone ${context.timezone})
      `;
      if (count.count >= limit) return { ok: false, reason: "weekly_limit" };
    }
    const endsAt = new Date(start.getTime() + context.session_minutes * 60_000);
    const [booking] = await sql<{ id: string }[]>`
      insert into bookings (workspace_id, availability_id, recipient_id, starts_at, ends_at)
      values (${context.workspace_id}, ${context.window_id}, ${context.recipient_id}, ${start.toISOString()}, ${endsAt.toISOString()})
      on conflict do nothing returning id
    `;
    if (!booking) return { ok: false, reason: "conflict" };
    return { ok: true, id: booking.id, startsAt: start.toISOString(), endsAt: endsAt.toISOString(), email: context.email, name: context.name, instructorName: context.instructor_name, recipientId: context.recipient_id };
  });
}

export async function setBookingEmailStatus(id: string, status: "sent" | "failed" | "not_configured") {
  const { client } = getDatabase();
  await client`update bookings set confirmation_email_status = ${status} where id = ${id}`;
}
