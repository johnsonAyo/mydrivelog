"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { CalendarSlot } from "./models";
import { Badge, Button, Field, Heading, Text } from "./primitives";

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
      <p data-dt="calendar-scroll-hint">Swipe across to see the full week.</p>
      <div data-dt="calendar-scroll" role="region" aria-label="Seven-day calendar, scroll horizontally to see the full week" tabIndex={0}>
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

export function AvailabilityForm({
  onCreate,
  disabled = false,
}: {
  onCreate?: (input: { startsAt: string; endsAt?: string }) => Promise<string | null>;
  disabled?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const start = String(data.get("start") ?? "");
    const end = String(data.get("end") ?? "");
    const startsAt = new Date(start);
    const endsAt = end ? new Date(end) : undefined;
    if (Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt))) {
      setMessage("Choose a valid start and an end after it.");
      return;
    }
    if (!onCreate) return;
    setSaving(true);
    setMessage(null);
    try {
      const error = await onCreate({ startsAt: startsAt.toISOString(), ...(endsAt ? { endsAt: endsAt.toISOString() } : {}) });
      if (error) setMessage(error);
      else {
        form.reset();
        setMessage("Lesson slot created. It is not visible to learners until you release it.");
      }
    } catch {
      setMessage("Could not save the slot. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form data-dt="availability-editor" onSubmit={submit}>
      <header>
        <div>
          <Text variant="eyebrow">Availability</Text>
          <Heading as="h2" size="panel">Create a lesson slot</Heading>
          <Text variant="muted">Times use your device’s time zone. Releasing to learners is a separate step.</Text>
        </div>
      </header>
      <div data-dt="editor-fields">
        <Field id="new-slot-start" name="start" label="Start" type="datetime-local" required disabled={disabled || saving} />
        <Field id="new-slot-end" name="end" label="End" type="datetime-local" hint="Leave blank for your default lesson duration." disabled={disabled || saving} />
      </div>
      <footer><Button type="submit" disabled={disabled || saving}>{saving ? "Saving…" : "Create slot"}</Button></footer>
      {message && <p data-dt="form-feedback" role="status">{message}</p>}
    </form>
  );
}
