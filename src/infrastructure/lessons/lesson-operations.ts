import { createHash } from "node:crypto";
import { canCompleteLesson } from "@/application/lessons/lesson-policy";
import { formatLessonEmail, hasSharedRecap, type SharedRecap, type SkillAssessment } from "@/domain/lessons/recap";
import { getDatabase } from "@/infrastructure/database/client";
import { postgresLessonRepository } from "@/infrastructure/lessons/postgres-lesson-repository";

type OperationError = "not_found" | "too_early" | "empty" | "revision_conflict" | "preview_changed" | "already_sent" | "recap_required";
type OperationResult<T> = { ok: true; value: T } | { ok: false; reason: OperationError };
type Preview = { recipientEmail: string; subject: string; body: string; hash: string };

function previewHash(recipientEmail: string, subject: string, body: string) {
  return createHash("sha256").update(JSON.stringify([recipientEmail.toLowerCase(), subject, body])).digest("hex");
}

async function bookingForOperation(workspaceId: string, bookingId: string) {
  const lesson = await postgresLessonRepository.find(workspaceId, bookingId);
  if (!lesson || lesson.bookingStatus !== "confirmed") return null;
  return lesson;
}

export async function completeInstructorLesson(workspaceId: string, bookingId: string, acknowledgedEmpty: boolean): Promise<OperationResult<null>> {
  const lesson = await bookingForOperation(workspaceId, bookingId);
  if (!lesson) return { ok: false, reason: "not_found" };
  if (lesson.endsAt > new Date()) return { ok: false, reason: "too_early" };
  if (!canCompleteLesson(lesson.draft, acknowledgedEmpty)) return { ok: false, reason: "empty" };
  const { client } = getDatabase();
  return client.begin(async (sql): Promise<OperationResult<null>> => {
    const [booking] = lesson.source === "collection"
      ? await sql<{ status: string; ends_at: Date | string }[]>`
          select b.status, s.ends_at from collection_bookings b join collection_slots s on s.id = b.slot_id
          join availability_collections c on c.id = b.collection_id
          where b.id = ${bookingId} and c.workspace_id = ${workspaceId} for update of b`
      : await sql<{ status: string; ends_at: Date | string }[]>`
          select status, ends_at from bookings where id = ${bookingId} and workspace_id = ${workspaceId} for update`;
    if (!booking || booking.status !== "confirmed") return { ok: false, reason: "not_found" };
    if (new Date(booking.ends_at) > new Date()) return { ok: false, reason: "too_early" };
    if (lesson.source === "collection") {
      await sql`insert into lesson_debriefs (workspace_id, collection_booking_id) values (${workspaceId}, ${bookingId}) on conflict (collection_booking_id) do nothing`;
    } else {
      await sql`insert into lesson_debriefs (workspace_id, legacy_booking_id) values (${workspaceId}, ${bookingId}) on conflict (legacy_booking_id) do nothing`;
    }
    const [draft] = await sql<{ id: string; private_notes: string; what_we_worked_on: string; what_to_practise: string; next_lesson_focus: string; completed_at: Date | null }[]>`
      select id, private_notes, what_we_worked_on, what_to_practise, next_lesson_focus, completed_at from lesson_debriefs
      where workspace_id = ${workspaceId} and ${lesson.source === "collection" ? sql`collection_booking_id` : sql`legacy_booking_id`} = ${bookingId} for update`;
    const [skill] = await sql<{ id: string }[]>`select id from lesson_skill_assessments where debrief_id = ${draft.id} limit 1`;
    const hasNotes = Boolean(draft.private_notes.trim() || draft.what_we_worked_on.trim() || draft.what_to_practise.trim() || draft.next_lesson_focus.trim() || skill);
    if (!hasNotes && !acknowledgedEmpty) return { ok: false, reason: "empty" };
    if (!draft.completed_at) await sql`update lesson_debriefs set completed_at = now(), updated_at = now() where id = ${draft.id}`;
    return { ok: true, value: null };
  });
}

export async function previewLessonMessage(workspaceId: string, bookingId: string, input: { kind: "recap" | "follow_up"; correction?: string }): Promise<OperationResult<Preview>> {
  const lesson = await bookingForOperation(workspaceId, bookingId);
  if (!lesson) return { ok: false, reason: "not_found" };
  if (lesson.endsAt > new Date()) return { ok: false, reason: "too_early" };
  if (input.kind === "follow_up" && !lesson.messages.some((message) => message.kind === "recap")) return { ok: false, reason: "recap_required" };
  if (input.kind === "follow_up" && !input.correction?.trim()) return { ok: false, reason: "empty" };
  const recap: SharedRecap = { whatWeWorkedOn: lesson.draft.whatWeWorkedOn, whatToPractise: lesson.draft.whatToPractise,
    nextLessonFocus: lesson.draft.nextLessonFocus, skills: lesson.draft.skills };
  if (input.kind === "recap" && !hasSharedRecap(recap)) return { ok: false, reason: "empty" };
  const { client } = getDatabase();
  const [workspace] = await client<{ name: string }[]>`select name from workspaces where id = ${workspaceId}`;
  const { subject, body } = formatLessonEmail({ kind: input.kind, learnerName: lesson.learnerName,
    instructorName: workspace.name, recap, correction: input.correction });
  return { ok: true, value: { recipientEmail: lesson.learnerEmail, subject, body,
    hash: previewHash(lesson.learnerEmail, subject, body) } };
}

export async function queueLessonMessage(workspaceId: string, bookingId: string, input: {
  kind: "recap" | "follow_up"; idempotencyKey: string; previewHash: string;
  expectedRevision: number; correction?: string;
}): Promise<OperationResult<{ id: string }>> {
  const lesson = await bookingForOperation(workspaceId, bookingId);
  if (!lesson) return { ok: false, reason: "not_found" };
  if (lesson.endsAt > new Date()) return { ok: false, reason: "too_early" };
  const { client } = getDatabase();
  return client.begin(async (sql): Promise<OperationResult<{ id: string }>> => {
    const [booking] = lesson.source === "collection"
      ? await sql<{ status: string; ends_at: Date | string; name: string; email: string }[]>`
          select b.status, s.ends_at, b.name, b.email from collection_bookings b join collection_slots s on s.id = b.slot_id
          join availability_collections c on c.id = b.collection_id where b.id = ${bookingId} and c.workspace_id = ${workspaceId} for update of b`
      : await sql<{ status: string; ends_at: Date | string; name: string; email: string }[]>`
          select b.status, b.ends_at, r.name, r.email from bookings b join release_recipients r on r.id = b.recipient_id
          where b.id = ${bookingId} and b.workspace_id = ${workspaceId} for update of b`;
    if (!booking || booking.status !== "confirmed") return { ok: false, reason: "not_found" };
    if (new Date(booking.ends_at) > new Date()) return { ok: false, reason: "too_early" };
    const [draft] = await sql<{ id: string; revision: number; what_we_worked_on: string; what_to_practise: string; next_lesson_focus: string }[]>`
      select id, revision, what_we_worked_on, what_to_practise, next_lesson_focus from lesson_debriefs
      where workspace_id = ${workspaceId} and ${lesson.source === "collection" ? sql`collection_booking_id` : sql`legacy_booking_id`} = ${bookingId} for update`;
    if (!draft) return { ok: false, reason: "empty" };
    const [existing] = await sql<{ id: string }[]>`
      select id from lesson_messages where debrief_id = ${draft.id} and
        (${input.kind} = 'recap' and kind = 'recap' or idempotency_key = ${input.idempotencyKey}) limit 1`;
    if (existing) return { ok: true, value: { id: existing.id } };
    if (input.kind === "recap" && draft.revision !== input.expectedRevision) return { ok: false, reason: "revision_conflict" };
    if (input.kind === "follow_up") {
      if (!input.correction?.trim()) return { ok: false, reason: "empty" };
      const [recap] = await sql<{ id: string }[]>`select id from lesson_messages where debrief_id = ${draft.id} and kind = 'recap' limit 1`;
      if (!recap) return { ok: false, reason: "recap_required" };
    }
    const skills = await sql<{ skill: string; outcome: SkillAssessment["outcome"] }[]>`
      select skill, outcome from lesson_skill_assessments where debrief_id = ${draft.id} order by skill`;
    const recap: SharedRecap = { whatWeWorkedOn: draft.what_we_worked_on, whatToPractise: draft.what_to_practise,
      nextLessonFocus: draft.next_lesson_focus, skills };
    if (input.kind === "recap" && !hasSharedRecap(recap)) return { ok: false, reason: "empty" };
    const [workspace] = await sql<{ name: string }[]>`select name from workspaces where id = ${workspaceId}`;
    const { subject, body } = formatLessonEmail({ kind: input.kind, learnerName: booking.name, instructorName: workspace.name,
      recap, correction: input.correction });
    if (previewHash(booking.email, subject, body) !== input.previewHash) return { ok: false, reason: "preview_changed" };
    const snapshot = input.kind === "recap" ? recap : { correction: input.correction?.trim() ?? "" };
    const [message] = await sql<{ id: string }[]>`
      insert into lesson_messages (debrief_id, kind, idempotency_key, recipient_email, subject, body, shared_snapshot)
      values (${draft.id}, ${input.kind}, ${input.idempotencyKey}, ${booking.email}, ${subject}, ${body}, ${sql.json(snapshot)})
      returning id`;
    return { ok: true, value: { id: message.id } };
  });
}
