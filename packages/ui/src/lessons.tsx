import type { ReactNode } from "react";
import type { TimelineLesson } from "./models";
import { Badge, Heading, Text, TextareaField } from "./primitives";

const lessonStateLabels: Record<TimelineLesson["state"], string> = {
  upcoming: "Upcoming",
  "in-progress": "In progress",
  "awaiting-debrief": "Awaiting debrief",
  completed: "Completed",
};

export function TodayTimeline({ title = "Today’s lessons", lessons }: { title?: string; lessons: readonly TimelineLesson[] }) {
  return (
    <section data-dt="today-timeline" aria-label={title}>
      <header>
        <Text variant="eyebrow">Teaching day</Text>
        <Heading as="h2" size="panel">{title}</Heading>
      </header>
      <ol>
        {lessons.map((lesson) => (
          <li key={lesson.id} data-state={lesson.state}>
            <time>{lesson.time}</time>
            <div data-dt="timeline-marker" aria-hidden="true" />
            <div data-dt="timeline-lesson">
              <div>
                <strong>{lesson.href ? <a href={lesson.href}>{lesson.name} · Open lesson</a> : lesson.name}</strong>
                <Text variant="muted">{lesson.detail}</Text>
              </div>
              <Badge tone={lesson.state === "awaiting-debrief" ? "warning" : lesson.state === "completed" ? "success" : "neutral"}>
                {lessonStateLabels[lesson.state]}
              </Badge>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LessonContextCard({
  name,
  lastLesson,
  practiceGoals,
  privateContext,
  nextFocus,
}: {
  name: string;
  lastLesson: string;
  practiceGoals: string;
  privateContext: string;
  nextFocus: string;
}) {
  return (
    <aside data-dt="lesson-context" aria-label={`Lesson context for ${name}`}>
      <header>
        <Text variant="eyebrow">Before the next lesson</Text>
        <Heading as="h2" size="panel">Pick up with {name}</Heading>
      </header>
      <dl>
        <div><dt>Last lesson</dt><dd>{lastLesson}</dd></div>
        <div><dt>Practice goals</dt><dd>{practiceGoals}</dd></div>
        <div data-private><dt>Private context</dt><dd>{privateContext}</dd></div>
        <div data-next><dt>Next focus</dt><dd>{nextFocus}</dd></div>
      </dl>
    </aside>
  );
}

export function DebriefComposer({
  sharedNotes,
  privateNotes,
  nextFocus,
  idPrefix = "debrief",
  footer,
}: {
  sharedNotes?: string;
  privateNotes?: string;
  nextFocus?: string;
  idPrefix?: string;
  footer?: ReactNode;
}) {
  const titleId = `${idPrefix}-title`;
  return (
    <section data-dt="debrief-composer" aria-labelledby={titleId}>
      <header>
        <Text variant="eyebrow">Lesson debrief</Text>
        <Heading as="h2" size="panel" id={titleId}>Capture what matters next.</Heading>
        <Text variant="muted">Shared and private notes stay separate. Nothing is sent from this component.</Text>
      </header>
      <div data-dt="debrief-fields">
        <TextareaField id={`${idPrefix}-shared-notes`} label="Shared lesson notes" rows={4} defaultValue={sharedNotes} hint="For the learner’s recap after your review." />
        <TextareaField id={`${idPrefix}-private-notes`} label="Private instructor notes" rows={4} defaultValue={privateNotes} hint="Only visible to you." />
        <TextareaField id={`${idPrefix}-next-focus`} label="Next lesson focus" rows={2} defaultValue={nextFocus} hint="A clear place to pick up next time." />
      </div>
      {footer && <footer>{footer}</footer>}
    </section>
  );
}
