/** View models are deliberately independent of HTTP and database shapes. */
export type CalendarSlot = {
  id: string;
  day: number;
  startsAt: string;
  endsAt: string;
  label: string;
  state: "draft" | "open" | "booked" | "awaiting-debrief" | "completed" | "unavailable";
};

export type TimelineLesson = {
  id: string;
  time: string;
  name: string;
  detail: string;
  state: "upcoming" | "in-progress" | "awaiting-debrief" | "completed";
  href?: string;
};
