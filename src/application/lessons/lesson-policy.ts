import type { LessonDraft } from "./lesson-repository";

export function canCompleteLesson(draft: LessonDraft, acknowledgedEmpty: boolean): boolean {
  return acknowledgedEmpty || Boolean(draft.privateNotes.trim() || draft.whatWeWorkedOn.trim() || draft.whatToPractise.trim() || draft.nextLessonFocus.trim() || draft.skills.length);
}
