import type { ReactNode } from "react";
import type { CalendarSlot } from "./models";
import { Badge, Field, Heading, Text } from "./primitives";

const stateLabels: Record<CalendarSlot["state"], string> = {
  draft: "Draft",
  open: "Open",
  booked: "Booked",
  "awaiting-debrief": "Debrief due",
  completed: "Completed",
  unavailable: "Unavailable",
};

export function AvailabilitySlotCard({ slot, action }: { slot: CalendarSlot; action?: ReactNode }) {
  return (
    <article data-dt="availability-slot" data-state={slot.state} aria-label={`${slot.label}, ${slot.startsAt} to ${slot.endsAt}, ${stateLabels[slot.state]}`}>
      <div data-dt="availability-slot-top">
        <time>{slot.startsAt}–{slot.endsAt}</time>
        <Badge tone={slot.state === "open" ? "success" : slot.state === "awaiting-debrief" ? "warning" : "neutral"}>
          {stateLabels[slot.state]}
        </Badge>
      </div>
      <strong>{slot.label}</strong>
      {action && <div data-dt="availability-slot-action">{action}</div>}
    </article>
  );
}

export function AvailabilityCalendar({
  title,
  days,
  slots,
  headerAction,
}: {
  title: string;
  days: readonly { label: string; date: string }[];
  slots: readonly CalendarSlot[];
  headerAction?: ReactNode;
}) {
  return (
    <section data-dt="availability-calendar" aria-label={title}>
      <header data-dt="calendar-header">
        <div>
          <Text variant="eyebrow">Calendar</Text>
          <Heading as="h2" size="panel">{title}</Heading>
        </div>
        {headerAction}
      </header>
      <div data-dt="calendar-scroll">
        <div data-dt="calendar-grid" data-days={days.length}>
          {days.map((day, index) => (
            <section data-dt="calendar-day" key={`${day.label}-${day.date}`} aria-label={`${day.label} ${day.date}`}>
              <header><span>{day.label}</span><strong>{day.date}</strong></header>
              <div data-dt="calendar-day-slots">
                {slots.filter((slot) => slot.day === index).map((slot) => <AvailabilitySlotCard key={slot.id} slot={slot} />)}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AvailabilityEditor({
  startValue,
  endValue,
  durationHint = "Your default lesson duration is two hours.",
  idPrefix = "availability-slot",
  footer,
}: {
  startValue?: string;
  endValue?: string;
  durationHint?: string;
  idPrefix?: string;
  footer?: ReactNode;
}) {
  const titleId = `${idPrefix}-title`;
  return (
    <section data-dt="availability-editor" aria-labelledby={titleId}>
      <header>
        <Text variant="eyebrow">Availability</Text>
        <Heading as="h2" size="panel" id={titleId}>Create a lesson slot</Heading>
        <Text variant="muted">Choose the time you want to make available. Releasing it to learners is a separate step.</Text>
      </header>
      <div data-dt="editor-fields">
        <Field id={`${idPrefix}-start`} label="Start" type="datetime-local" defaultValue={startValue} />
        <Field id={`${idPrefix}-end`} label="End" type="datetime-local" defaultValue={endValue} hint={durationHint} />
      </div>
      {footer && <footer>{footer}</footer>}
    </section>
  );
}
