export type LessonState = "upcoming" | "in-progress" | "awaiting-debrief" | "completed" | "cancelled";

export function lessonState(input: {
  bookingStatus: string;
  startsAt: Date;
  endsAt: Date;
  completedAt: Date | null;
  now: Date;
}): LessonState {
  if (input.bookingStatus !== "confirmed") return "cancelled";
  if (input.completedAt) return "completed";
  if (input.endsAt <= input.now) return "awaiting-debrief";
  if (input.startsAt <= input.now) return "in-progress";
  return "upcoming";
}
