import type { LessonState } from "@/domain/lessons/lesson-state";
import type { SkillAssessment } from "@/domain/lessons/recap";

export type LessonDraftFields = {
  privateNotes: string;
  whatWeWorkedOn: string;
  whatToPractise: string;
  nextLessonFocus: string;
  skills: SkillAssessment[];
};

export type LessonDraft = LessonDraftFields & {
  revision: number;
  completedAt: Date | null;
  updatedAt: Date | null;
};

export type BookedLesson = {
  id: string;
  source: "collection" | "legacy";
  learnerName: string;
  learnerEmail: string;
  startsAt: Date;
  endsAt: Date;
  bookingStatus: string;
  draft: LessonDraft;
  previousNextFocus: string | null;
  previousSkills: SkillAssessment[];
  messages: LessonMessage[];
};

export type LessonMessage = {
  id: string;
  kind: "recap" | "follow_up";
  recipientEmail: string;
  subject: string;
  body: string;
  status: "queued" | "sending" | "delivered" | "needs_attention";
  attempts: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
  deliveredAt: Date | null;
};

export type InstructorLesson = BookedLesson & { state: LessonState };

export interface LessonRepository {
  find(workspaceId: string, bookingId: string): Promise<BookedLesson | null>;
  saveDraft(input: {
    workspaceId: string;
    bookingId: string;
    source: BookedLesson["source"];
    expectedRevision: number;
    fields: LessonDraftFields;
  }): Promise<LessonDraft | null>;
}
