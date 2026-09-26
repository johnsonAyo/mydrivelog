import { lessonState } from "@/domain/lessons/lesson-state";
import type { TimelineLesson } from "@drivetrack/ui";
import { getDatabase } from "@/infrastructure/database/client";

type Timestamp = Date | string;
type Row = { id: string; name: string; starts_at: Timestamp; ends_at: Timestamp; status: string; completed_at: Timestamp | null };

export async function listInstructorLessons(workspaceId: string, now: Date) {
  const { client } = getDatabase();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const nowIso = now.toISOString();
  const rows = await client<Row[]>`
    select b.id, b.name, s.starts_at, s.ends_at, b.status, d.completed_at
    from collection_bookings b join availability_collections c on c.id = b.collection_id
      join collection_slots s on s.id = b.slot_id
      left join lesson_debriefs d on d.collection_booking_id = b.id
    where c.workspace_id = ${workspaceId} and b.status = 'confirmed'
      and ((s.starts_at at time zone 'Europe/London')::date = ${today}::date
        or (s.ends_at < ${nowIso} and d.completed_at is null))
    union all
    select b.id, r.name, b.starts_at, b.ends_at, b.status, d.completed_at
    from bookings b join release_recipients r on r.id = b.recipient_id
      left join lesson_debriefs d on d.legacy_booking_id = b.id
    where b.workspace_id = ${workspaceId} and b.status = 'confirmed'
      and ((b.starts_at at time zone 'Europe/London')::date = ${today}::date
        or (b.ends_at < ${nowIso} and d.completed_at is null))
    order by starts_at asc`;
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" });
  return rows.map((row): TimelineLesson | null => {
    const startsAt = new Date(row.starts_at);
    const endsAt = new Date(row.ends_at);
    const completedAt = row.completed_at ? new Date(row.completed_at) : null;
    const state = lessonState({ bookingStatus: row.status, startsAt, endsAt, completedAt, now });
    if (state === "cancelled") return null;
    return { id: row.id, name: row.name,
      time: time.format(startsAt), detail: `${date.format(startsAt)} · ${time.format(startsAt)}–${time.format(endsAt)}`,
      state, href: `/lessons/${row.id}` };
  }).filter((row): row is TimelineLesson => row !== null);
}
