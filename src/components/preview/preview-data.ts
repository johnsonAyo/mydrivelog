import type { CalendarSlot, TimelineLesson } from "@drivetrack/ui";

export const previewCalendarDays = [
  { label: "Monday", date: "21" },
  { label: "Tuesday", date: "22" },
  { label: "Wednesday", date: "23" },
  { label: "Thursday", date: "24" },
  { label: "Friday", date: "25" },
  { label: "Saturday", date: "26" },
  { label: "Sunday", date: "27" },
];

export const previewCalendarSlots: CalendarSlot[] = [
  { id: "monday-am", day: 0, startsAt: "09:00", endsAt: "11:00", label: "Available lesson", state: "open" },
  { id: "tuesday-pm", day: 1, startsAt: "14:00", endsAt: "16:00", label: "Open lesson", state: "open" },
  { id: "wednesday-am", day: 2, startsAt: "10:00", endsAt: "12:00", label: "Draft lesson slot", state: "draft" },
  { id: "thursday-maya", day: 3, startsAt: "09:00", endsAt: "11:00", label: "Maya A.", state: "booked" },
  { id: "thursday-owen", day: 3, startsAt: "11:30", endsAt: "13:30", label: "Owen P.", state: "awaiting-debrief" },
  { id: "thursday-sofia", day: 3, startsAt: "14:00", endsAt: "16:00", label: "Sofia R.", state: "completed" },
  { id: "friday-am", day: 4, startsAt: "09:30", endsAt: "11:30", label: "Available lesson", state: "open" },
];

export const previewLessons: TimelineLesson[] = [
  { id: "maya", time: "09:00", name: "Maya A.", detail: "Roundabouts · Lesson 8", state: "upcoming" },
  { id: "owen", time: "11:30", name: "Owen P.", detail: "Dual carriageways · Lesson 12", state: "awaiting-debrief" },
  { id: "sofia", time: "14:00", name: "Sofia R.", detail: "Bay parking · Lesson 5", state: "completed" },
];
