import type { ReactNode } from "react";
import { Badge, EmptyState, Heading, Stack, Surface, Text } from "./primitives";

export type LearnerProfileLesson = {
  id: string;
  startsAt: string;
  endsAt: string;
  state: "upcoming" | "in-progress" | "awaiting-debrief" | "completed" | "cancelled";
  completedAt: string | null;
  whatWeWorkedOn: string;
  whatToPractise: string;
  nextLessonFocus: string;
  privateNotes: string;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });

function LessonRow({ lesson, renderLessonLink }: { lesson: LearnerProfileLesson; renderLessonLink: (href: string, children: ReactNode) => ReactNode }) {
  const stateLabel = {
    upcoming: "Upcoming", "in-progress": "In progress", "awaiting-debrief": "Debrief to finish", completed: "Debrief complete", cancelled: "Cancelled",
  }[lesson.state];
  return <Surface as="article" padding="4">
    <Stack gap="2">
      <div data-dt="learner-lesson-heading">
        <div><strong>{dateFormat.format(new Date(lesson.startsAt))}</strong><Text variant="muted">{timeFormat.format(new Date(lesson.startsAt))}–{timeFormat.format(new Date(lesson.endsAt))}</Text></div>
        <Badge tone={lesson.state === "completed" ? "success" : lesson.state === "awaiting-debrief" ? "warning" : "neutral"}>{stateLabel}</Badge>
      </div>
      {lesson.nextLessonFocus && <Text><strong>Next lesson:</strong> {lesson.nextLessonFocus}</Text>}
      {lesson.whatWeWorkedOn && <Text><strong>Worked on:</strong> {lesson.whatWeWorkedOn}</Text>}
      {lesson.whatToPractise && <Text><strong>To practise:</strong> {lesson.whatToPractise}</Text>}
      {lesson.privateNotes && <Text variant="muted">Private note saved for this lesson</Text>}
      {renderLessonLink(`/lessons/${lesson.id}`, lesson.state === "awaiting-debrief" ? "Finish debrief →" : "Open lesson and notes →")}
    </Stack>
  </Surface>;
}

export function LearnerProfile({ name, email, lessons, renderLessonLink, renderBackLink }: {
  name: string;
  email: string;
  lessons: readonly LearnerProfileLesson[];
  renderLessonLink: (href: string, children: ReactNode) => ReactNode;
  renderBackLink: (href: string, children: ReactNode) => ReactNode;
}) {
  const upcoming = lessons.filter((lesson) => lesson.state === "upcoming" || lesson.state === "in-progress").reverse();
  const past = lessons.filter((lesson) => lesson.state !== "upcoming" && lesson.state !== "in-progress");
  return <Stack gap="5" as="section" id="learner-profile">
    {renderBackLink("/learners", "← All learners")}
    <Surface as="section"><Stack gap="2"><Text variant="eyebrow">LEARNER RECORD</Text><Heading as="h2" size="panel">{name}</Heading><Text variant="muted">{email}</Text><Text variant="caption">{upcoming.length} upcoming · {past.length} past</Text></Stack></Surface>
    <Stack as="section" gap="3"><Heading as="h3" size="panel">Upcoming lessons</Heading>{upcoming.length ? upcoming.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} renderLessonLink={renderLessonLink} />) : <EmptyState title="Nothing booked yet" description="New bookings for this learner will appear here." />}</Stack>
    <Stack as="section" gap="3"><Heading as="h3" size="panel">Past lessons and notes</Heading>{past.length ? past.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} renderLessonLink={renderLessonLink} />) : <EmptyState title="No past lessons yet" description="Completed lessons, debriefs, and private notes will remain here." />}</Stack>
  </Stack>;
}
