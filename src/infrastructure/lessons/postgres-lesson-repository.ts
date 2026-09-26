import type { BookedLesson, LessonDraft, LessonMessage, LessonRepository } from "@/application/lessons/lesson-repository";
import type { SkillAssessment } from "@/domain/lessons/recap";
import { getDatabase } from "@/infrastructure/database/client";

type Timestamp = Date | string;

function toDate(value: Timestamp): Date {
  return value instanceof Date ? value : new Date(value);
}

type BookingRow = {
  id: string;
  source: BookedLesson["source"];
  learner_name: string;
  learner_email: string;
  starts_at: Timestamp;
  ends_at: Timestamp;
  booking_status: string;
};

type DraftRow = {
  private_notes: string;
  what_we_worked_on: string;
  what_to_practise: string;
  next_lesson_focus: string;
  revision: number;
  completed_at: Timestamp | null;
  updated_at: Timestamp;
};

function mapDraft(row?: DraftRow, skills: SkillAssessment[] = []): LessonDraft {
  return {
    privateNotes: row?.private_notes ?? "",
    whatWeWorkedOn: row?.what_we_worked_on ?? "",
    whatToPractise: row?.what_to_practise ?? "",
    nextLessonFocus: row?.next_lesson_focus ?? "",
    skills,
    revision: row?.revision ?? 0,
    completedAt: row?.completed_at ? toDate(row.completed_at) : null,
    updatedAt: row?.updated_at ? toDate(row.updated_at) : null,
  };
}

export const postgresLessonRepository: LessonRepository = {
  async find(workspaceId, bookingId) {
    const { client } = getDatabase();
    const [booking] = await client<BookingRow[]>`
      select b.id, 'collection'::text as source, b.name as learner_name,
        b.email as learner_email, s.starts_at, s.ends_at, b.status as booking_status
      from collection_bookings b
      join availability_collections c on c.id = b.collection_id
      join collection_slots s on s.id = b.slot_id
      where b.id = ${bookingId} and c.workspace_id = ${workspaceId}
      union all
      select b.id, 'legacy'::text as source, r.name as learner_name,
        r.email as learner_email, b.starts_at, b.ends_at, b.status as booking_status
      from bookings b
      join release_recipients r on r.id = b.recipient_id
      where b.id = ${bookingId} and b.workspace_id = ${workspaceId}
      limit 1
    `;
    if (!booking) return null;

    const [draft] = booking.source === "collection"
      ? await client<DraftRow[]>`
          select private_notes, what_we_worked_on, what_to_practise, next_lesson_focus,
            revision, completed_at, updated_at
          from lesson_debriefs
          where workspace_id = ${workspaceId} and collection_booking_id = ${bookingId}
        `
      : await client<DraftRow[]>`
          select private_notes, what_we_worked_on, what_to_practise, next_lesson_focus,
            revision, completed_at, updated_at
          from lesson_debriefs
          where workspace_id = ${workspaceId} and legacy_booking_id = ${bookingId}
        `;
    const [assessments, messages, previous] = await Promise.all([
      client<{ skill: string; outcome: SkillAssessment["outcome"] }[]>`
        select a.skill, a.outcome from lesson_skill_assessments a join lesson_debriefs d on d.id = a.debrief_id
        where d.workspace_id = ${workspaceId} and ${booking.source === "collection" ? client`d.collection_booking_id` : client`d.legacy_booking_id`} = ${bookingId}
        order by a.skill`,
      client<LessonMessageRow[]>`
        select m.id, m.kind, m.recipient_email, m.subject, m.body, m.status, m.attempts, m.last_attempt_at, m.created_at, m.delivered_at
        from lesson_messages m join lesson_debriefs d on d.id = m.debrief_id
        where d.workspace_id = ${workspaceId} and ${booking.source === "collection" ? client`d.collection_booking_id` : client`d.legacy_booking_id`} = ${bookingId}
        order by m.created_at`,
      client<{ id: string; next_lesson_focus: string }[]>`
        with learner_emails as (
          select lower(${booking.learner_email}::text) as email
          union select lower(email) from learner_contacts where workspace_id = ${workspaceId}
            and (lower(email) = lower(${booking.learner_email}) or lower(source_email) = lower(${booking.learner_email}))
          union select lower(source_email) from learner_contacts where workspace_id = ${workspaceId}
            and (lower(email) = lower(${booking.learner_email}) or lower(source_email) = lower(${booking.learner_email}))
        )
        select prior.id, prior.next_lesson_focus from (
          select d.id, d.next_lesson_focus, s.starts_at from lesson_debriefs d
            join collection_bookings b on b.id = d.collection_booking_id join collection_slots s on s.id = b.slot_id
            where d.workspace_id = ${workspaceId} and b.status = 'confirmed' and lower(b.email) in (select email from learner_emails)
          union all
          select d.id, d.next_lesson_focus, b.starts_at from lesson_debriefs d
            join bookings b on b.id = d.legacy_booking_id join release_recipients r on r.id = b.recipient_id
            where d.workspace_id = ${workspaceId} and b.status = 'confirmed' and lower(r.email) in (select email from learner_emails)
        ) prior where prior.starts_at < ${toDate(booking.starts_at).toISOString()}
        order by prior.starts_at desc limit 1`,
    ]);
    const [priorSkills] = previous.length ? await Promise.all([client<{ skill: string; outcome: SkillAssessment["outcome"] }[]>`
      select skill, outcome from lesson_skill_assessments where debrief_id = ${previous[0].id} order by skill`]) : [[]];
    return {
      id: booking.id,
      source: booking.source,
      learnerName: booking.learner_name,
      learnerEmail: booking.learner_email,
      startsAt: toDate(booking.starts_at),
      endsAt: toDate(booking.ends_at),
      bookingStatus: booking.booking_status,
      draft: mapDraft(draft, assessments),
      previousNextFocus: previous[0]?.next_lesson_focus || null,
      previousSkills: priorSkills,
      messages: messages.map(mapMessage),
    };
  },

  async saveDraft({ workspaceId, bookingId, source, expectedRevision, fields }) {
    const { client } = getDatabase();
    return client.begin(async (sql) => {
    let saved: DraftRow | undefined;
    if (source === "collection" && expectedRevision === 0) {
      [saved] = await sql<DraftRow[]>`
        insert into lesson_debriefs (workspace_id, collection_booking_id,
          private_notes, what_we_worked_on, what_to_practise, next_lesson_focus, revision)
        select ${workspaceId}, b.id, ${fields.privateNotes}, ${fields.whatWeWorkedOn},
          ${fields.whatToPractise}, ${fields.nextLessonFocus}, 1
        from collection_bookings b
        join availability_collections c on c.id = b.collection_id
        where b.id = ${bookingId} and c.workspace_id = ${workspaceId} and b.status = 'confirmed'
        on conflict (collection_booking_id) do nothing
        returning private_notes, what_we_worked_on, what_to_practise, next_lesson_focus,
          revision, completed_at, updated_at
      `;
    } else if (source === "legacy" && expectedRevision === 0) {
      [saved] = await sql<DraftRow[]>`
        insert into lesson_debriefs (workspace_id, legacy_booking_id,
          private_notes, what_we_worked_on, what_to_practise, next_lesson_focus, revision)
        select ${workspaceId}, b.id, ${fields.privateNotes}, ${fields.whatWeWorkedOn},
          ${fields.whatToPractise}, ${fields.nextLessonFocus}, 1
        from bookings b
        where b.id = ${bookingId} and b.workspace_id = ${workspaceId} and b.status = 'confirmed'
        on conflict (legacy_booking_id) do nothing
        returning private_notes, what_we_worked_on, what_to_practise, next_lesson_focus,
          revision, completed_at, updated_at
      `;
    } else if (source === "collection") {
      [saved] = await sql<DraftRow[]>`
        update lesson_debriefs d set private_notes = ${fields.privateNotes},
          what_we_worked_on = ${fields.whatWeWorkedOn}, what_to_practise = ${fields.whatToPractise},
          next_lesson_focus = ${fields.nextLessonFocus}, revision = d.revision + 1, updated_at = now()
        where d.workspace_id = ${workspaceId} and d.collection_booking_id = ${bookingId}
          and d.revision = ${expectedRevision}
          and exists (select 1 from collection_bookings b join availability_collections c on c.id = b.collection_id
            where b.id = d.collection_booking_id and c.workspace_id = ${workspaceId} and b.status = 'confirmed')
        returning private_notes, what_we_worked_on, what_to_practise, next_lesson_focus,
          revision, completed_at, updated_at
      `;
    } else {
      [saved] = await sql<DraftRow[]>`
        update lesson_debriefs d set private_notes = ${fields.privateNotes},
          what_we_worked_on = ${fields.whatWeWorkedOn}, what_to_practise = ${fields.whatToPractise},
          next_lesson_focus = ${fields.nextLessonFocus}, revision = d.revision + 1, updated_at = now()
        where d.workspace_id = ${workspaceId} and d.legacy_booking_id = ${bookingId}
          and d.revision = ${expectedRevision}
          and exists (select 1 from bookings b where b.id = d.legacy_booking_id
            and b.workspace_id = ${workspaceId} and b.status = 'confirmed')
        returning private_notes, what_we_worked_on, what_to_practise, next_lesson_focus,
          revision, completed_at, updated_at
      `;
    }
    if (!saved) return null;
    const [debrief] = await sql<{ id: string }[]>`
      select id from lesson_debriefs where workspace_id = ${workspaceId}
        and ${source === "collection" ? sql`collection_booking_id` : sql`legacy_booking_id`} = ${bookingId}`;
    await sql`delete from lesson_skill_assessments where debrief_id = ${debrief.id}`;
    for (const assessment of fields.skills) {
      await sql`insert into lesson_skill_assessments (debrief_id, skill, outcome) values (${debrief.id}, ${assessment.skill}, ${assessment.outcome})`;
    }
    return mapDraft(saved, fields.skills);
    });
  },
};

type LessonMessageRow = {
  id: string; kind: LessonMessage["kind"]; recipient_email: string; subject: string; body: string;
  status: LessonMessage["status"]; attempts: number; last_attempt_at: Timestamp | null; created_at: Timestamp; delivered_at: Timestamp | null;
};

function mapMessage(row: LessonMessageRow): LessonMessage {
  return { id: row.id, kind: row.kind, recipientEmail: row.recipient_email, subject: row.subject,
    body: row.body, status: row.status, attempts: row.attempts,
    lastAttemptAt: row.last_attempt_at ? toDate(row.last_attempt_at) : null,
    createdAt: toDate(row.created_at), deliveredAt: row.delivered_at ? toDate(row.delivered_at) : null };
}
