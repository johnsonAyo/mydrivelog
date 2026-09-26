import { lessonState } from "@/domain/lessons/lesson-state";
import type { InstructorLesson, LessonDraftFields, LessonRepository } from "./lesson-repository";

export async function readInstructorLesson(
  repository: LessonRepository,
  workspaceId: string,
  bookingId: string,
  now: Date,
): Promise<InstructorLesson | null> {
  const lesson = await repository.find(workspaceId, bookingId);
  if (!lesson) return null;
  return {
    ...lesson,
    state: lessonState({
      bookingStatus: lesson.bookingStatus,
      startsAt: lesson.startsAt,
      endsAt: lesson.endsAt,
      completedAt: lesson.draft.completedAt,
      now,
    }),
  };
}

export async function saveInstructorLessonDraft(
  repository: LessonRepository,
  input: {
    workspaceId: string;
    bookingId: string;
    expectedRevision: number;
    fields: LessonDraftFields;
  },
): Promise<{ ok: true; lesson: InstructorLesson } | { ok: false; reason: "not_found" | "cancelled" | "revision_conflict" }> {
  const lesson = await readInstructorLesson(repository, input.workspaceId, input.bookingId, new Date());
  if (!lesson) return { ok: false, reason: "not_found" };
  if (lesson.state === "cancelled") return { ok: false, reason: "cancelled" };
  const saved = await repository.saveDraft({ ...input, source: lesson.source });
  if (!saved) return { ok: false, reason: "revision_conflict" };
  return { ok: true, lesson: {
    ...lesson,
    draft: saved,
    state: lessonState({
      bookingStatus: lesson.bookingStatus,
      startsAt: lesson.startsAt,
      endsAt: lesson.endsAt,
      completedAt: saved.completedAt,
      now: new Date(),
    }),
  } };
}
